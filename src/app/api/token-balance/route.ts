import { NextRequest, NextResponse } from 'next/server';
import { Contract, JsonRpcProvider, formatUnits, isAddress } from 'ethers';

const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = String(searchParams.get('walletAddress') || '').trim();

    if (!walletAddress) {
      return NextResponse.json({ error: 'walletAddress is required' }, { status: 400 });
    }

    if (!isAddress(walletAddress)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    const tokenContractAddress = process.env.SCHOLARFLY_TOKEN_CONTRACT_ADDRESS;

    if (!rpcUrl || !tokenContractAddress) {
      return NextResponse.json(
        {
          error:
            'Missing configuration. Please set SEPOLIA_RPC_URL and SCHOLARFLY_TOKEN_CONTRACT_ADDRESS.',
        },
        { status: 500 }
      );
    }

    const provider = new JsonRpcProvider(rpcUrl);
    const tokenContract = new Contract(tokenContractAddress, ERC20_ABI, provider);

    const [balanceRaw, decimals, symbol] = await Promise.all([
      tokenContract.balanceOf(walletAddress),
      tokenContract.decimals(),
      tokenContract.symbol(),
    ]);

    const balanceFormatted = formatUnits(balanceRaw, Number(decimals));

    return NextResponse.json({
      walletAddress,
      symbol,
      decimals: Number(decimals),
      balanceRaw: balanceRaw.toString(),
      balanceFormatted,
    });
  } catch (error) {
    console.error('Token balance fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch token balance.' }, { status: 500 });
  }
}
