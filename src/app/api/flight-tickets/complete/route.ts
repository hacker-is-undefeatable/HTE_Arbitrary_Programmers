import { NextRequest, NextResponse } from 'next/server';
import { Contract, JsonRpcProvider, Wallet, parseUnits } from 'ethers';
import { createServerClient } from '@/utils/supabase';

const MINT_ABI = [
  'function mintBadge(address to, string tokenURI) returns (uint256)',
  'function safeMint(address to, string tokenURI) returns (uint256)',
  'function mint(address to, string tokenURI) returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
];

const REWARD_TOKEN_ABI = [
  'function mintReward(address to, uint256 amount) returns (bool)',
  'function mint(address to, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

const TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55aebf5a8bfa';

function isValidAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    const userId = String(body?.userId || '').trim();
    const ticketId = String(body?.ticketId || '').trim();
    const walletAddress = String(body?.walletAddress || '').trim();
    const lectureTitle = String(body?.lectureTitle || 'ScholarFly Flight Ticket').trim();

    if (!userId || !ticketId || !walletAddress) {
      return NextResponse.json(
        { error: 'userId, ticketId, and walletAddress are required' },
        { status: 400 }
      );
    }

    if (!isValidAddress(walletAddress)) {
      return NextResponse.json({ error: 'Invalid walletAddress format' }, { status: 400 });
    }

    const { data: ticket, error: ticketError } = await supabase
      .from('flight_tickets')
      .select('id, user_id, title, completed, nft_badge_tx_hash')
      .eq('id', ticketId)
      .eq('user_id', userId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Flight ticket not found' }, { status: 404 });
    }

    if (ticket.completed) {
      return NextResponse.json({
        alreadyCompleted: true,
        txHash: ticket.nft_badge_tx_hash || null,
      });
    }

    const contractAddress = process.env.NFT_BADGE_CONTRACT_ADDRESS;
    const minterPrivateKey = process.env.NFT_BADGE_MINTER_PRIVATE_KEY;
    const rpcUrl = process.env.SEPOLIA_RPC_URL;

    if (!contractAddress || !minterPrivateKey || !rpcUrl) {
      return NextResponse.json(
        {
          error:
            'Missing NFT configuration. Please set NFT_BADGE_CONTRACT_ADDRESS, NFT_BADGE_MINTER_PRIVATE_KEY, and SEPOLIA_RPC_URL.',
        },
        { status: 500 }
      );
    }

    const provider = new JsonRpcProvider(rpcUrl);
    const wallet = new Wallet(minterPrivateKey, provider);
    const contract = new Contract(contractAddress, MINT_ABI, wallet);

    const metadata = {
      name: `${ticket.title || lectureTitle} Completion Badge`,
      description: `Awarded for completing the lecture flight ticket for ${lectureTitle}.`,
      image:
        process.env.NFT_BADGE_IMAGE_URL ||
        'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80',
      attributes: [
        { trait_type: 'Platform', value: 'ScholarFly' },
        { trait_type: 'Type', value: 'Flight Ticket Completion' },
        { trait_type: 'Ticket ID', value: ticket.id },
      ],
    };

    const tokenUri = `data:application/json;utf8,${encodeURIComponent(JSON.stringify(metadata))}`;

    let tx;
    try {
      tx = await contract.mintBadge(walletAddress, tokenUri);
    } catch {
      try {
        tx = await contract.safeMint(walletAddress, tokenUri);
      } catch {
        tx = await contract.mint(walletAddress, tokenUri);
      }
    }

    const receipt = await tx.wait();

    let tokenId: string | null = null;
    for (const log of receipt.logs || []) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed?.name === 'Transfer') {
          tokenId = parsed.args?.tokenId?.toString() || null;
          break;
        }
      } catch {
        const topic0 = log.topics?.[0]?.toLowerCase?.() || '';
        const topic3 = log.topics?.[3];
        if (topic0 === TRANSFER_TOPIC && topic3) {
          try {
            tokenId = BigInt(topic3).toString();
            break;
          } catch {
            continue;
          }
        }
      }
    }

    let rewardTxHash: string | null = null;
    let rewardAmount: string | null = null;

    const rewardTokenAddress = process.env.SCHOLARFLY_TOKEN_CONTRACT_ADDRESS;
    if (rewardTokenAddress) {
      const rewardTokenContract = new Contract(rewardTokenAddress, REWARD_TOKEN_ABI, wallet);
      const rewardAmountInput = process.env.SCHOLARFLY_TOKEN_REWARD_AMOUNT || '10';
      const rewardTokenDecimals = Number(process.env.SCHOLARFLY_TOKEN_DECIMALS || '18');

      if (!Number.isFinite(rewardTokenDecimals) || rewardTokenDecimals < 0 || rewardTokenDecimals > 18) {
        return NextResponse.json(
          { error: 'Invalid SCHOLARFLY_TOKEN_DECIMALS. Use a value between 0 and 18.' },
          { status: 500 }
        );
      }

      const rewardAmountUnits = parseUnits(rewardAmountInput, rewardTokenDecimals);

      let rewardTx;
      try {
        rewardTx = await rewardTokenContract.mintReward(walletAddress, rewardAmountUnits);
      } catch {
        try {
          rewardTx = await rewardTokenContract.mint(walletAddress, rewardAmountUnits);
        } catch {
          rewardTx = await rewardTokenContract.transfer(walletAddress, rewardAmountUnits);
        }
      }

      const rewardReceipt = await rewardTx.wait();
      rewardTxHash = rewardReceipt?.hash || rewardTx.hash || null;
      rewardAmount = rewardAmountInput;
    }

    const { error: updateError } = await supabase
      .from('flight_tickets')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
        nft_badge_tx_hash: tx.hash,
        nft_badge_token_id: tokenId,
        nft_badge_token_uri: tokenUri,
      })
      .eq('id', ticketId)
      .eq('user_id', userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      tokenId,
      tokenUri,
      rewardTokenTxHash: rewardTxHash,
      rewardTokenAmount: rewardAmount,
    });
  } catch (error) {
    console.error('Flight ticket completion error:', error);
    return NextResponse.json({ error: 'Failed to complete flight ticket.' }, { status: 500 });
  }
}
