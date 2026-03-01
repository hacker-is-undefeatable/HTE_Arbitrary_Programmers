## Inspiration
We were inspired by a common student pain point: students spend too much time organizing lecture materials and not enough time actually learning. As Arbitrary Programmers, we wanted to build a system that converts raw lecture content into active study workflows while keeping learners motivated through visible progress and rewards.

Our guiding principle was:

$$
\text{Effective Learning} \propto \frac{\text{Practice} \times \text{Consistency}}{\text{Friction}}
$$

So our goal became clear: increase practice and consistency while reducing friction.

## What it does
ScholarFly allows users to upload lecture content (notes, audio, or video) and automatically generates:
- Transcripts
- AI summaries
- Quizzes
- Flashcards
- Flight-ticket checkpoints

It also introduces gamification and Web3 rewards:
- Complete a ticket $\rightarrow$ mint an NFT badge
- Receive SFT token rewards
- Track SFT wallet balance across logged-in pages

## How we built it
We built ScholarFly using:
- Next.js + React + Tailwind CSS for frontend
- Next.js API routes for backend logic
- Supabase for authentication, database, and storage
- Azure OpenAI + AssemblyAI for AI generation and transcription
- Ethers + Solidity smart contracts on Sepolia for NFT and ERC-20 rewards

We designed a shared authenticated app shell and connected wallet-based reward flows directly to learning milestones.

## Challenges we ran into
- Hydration and client-render mismatches in dynamic UI components
- Stabilizing AI output quality across different ages and learning styles
- Making NFT metadata reliably visible after mint (token ID/log parsing, metadata handling)
- Managing wallet/network constraints (Sepolia switching, RPC/env setup, minter permissions)
- Keeping UX consistent while shipping many features quickly

## Accomplishments that we're proud of
- Built an end-to-end pipeline: upload lecture $\rightarrow$ generate study assets $\rightarrow$ reward completion
- Delivered a reusable ticket/checkpoint system with session history and clickable flows
- Implemented live badge + token reward mechanics tied to real learning completion
- Added global SFT balance visibility across authenticated experiences
- Maintained coherent product identity and UX through rapid iterations

## What we learned
- Prompt engineering can matter as much as model selection for educational quality
- Small UX details (loading states, clear statuses, simple navigation) strongly improve user trust
- Web3 integration reliability depends on operational details, not only contract code
- Modular architecture (shared utilities, shared shell, clear API boundaries) speeds iteration

## What's next for Arbitrary Programmers
- Personalize learning paths further with stronger mastery modeling
- Expand badge/token utility (levels, streak bonuses, redeemable perks)
- Improve on-chain metadata hosting for marketplace-grade NFT rendering
- Add teacher/classroom analytics and collaboration features
- Move from Sepolia prototype toward production-ready multi-network deployment
