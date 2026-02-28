# DualPath AI - Hackathon Ready Learning Platform

A full-stack AI-powered personalized learning platform that adapts to your learning level and style.

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (free tier available)
- OpenAI API key

### Setup Instructions

1. **Clone and Install**
```bash
npm install
```

2. **Configure Environment Variables**
```bash
# Copy example to actual .env
cp .env.example .env.local

# Fill in your Supabase and OpenAI credentials
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

3. **Setup Supabase**
```bash
# Run the database schema
# Copy contents of database.sql and execute in Supabase SQL editor
# Or use Supabase CLI if installed
supabase db push
```

4. **Run Development Server**
```bash
npm run dev
```

5. **Open in Browser**
Visit http://localhost:3000

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── quiz-attempts/        # Quiz attempt endpoints
│   │   ├── mastery-scores/       # Mastery score management
│   │   ├── ai-explanation/       # AI explanation generation
│   │   ├── revision-schedule/    # Revision scheduling
│   │   └── coding-submissions/   # Coding submission tracking
│   ├── learn/
│   │   ├── math/                 # Math practice page
│   │   └── python/               # Python coding tutor
│   ├── dashboard/                # Main dashboard
│   ├── diagnostic/               # Diagnostic quiz
│   ├── diagnostic-setup/         # Profile setup
│   ├── login/                    # Sign in page
│   ├── signup/                   # Sign up page
│   ├── revision/                 # Revision schedule page
│   ├── settings/                 # User settings
│   ├── page.tsx                  # Landing page
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
│
├── components/
│   └── ui/                       # ShadCN UI components
│       ├── button.tsx
│       ├── card.tsx
│       └── input.tsx
│
├── hooks/
│   └── useAuth.ts                # Supabase auth hooks
│
├── utils/
│   ├── supabase.ts               # Supabase clients
│   ├── masteryEngine.ts          # Mastery score calculation
│   ├── revisionEngine.ts         # Revision scheduling logic
│   ├── aiService.ts              # OpenAI API integration
│   ├── quizData.ts               # Quiz questions and challenges
│   └── cn.ts                     # Utility for class names
│
├── types/
│   └── index.ts                  # TypeScript type definitions
│
├── database.sql                  # Database schema
├── .env.example                  # Environment variables template
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.js            # Tailwind CSS config
├── postcss.config.js             # PostCSS config
└── next.config.js                # Next.js config
```

## Architecture

### Frontend Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS + ShadCN UI
- **Editor**: Monaco Editor (for Python coding)
- **State Management**: React hooks + Supabase client

### Backend
- **API Routes**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **AI**: OpenAI API (GPT-4)

### Database Schema

#### profiles
- `id` (UUID): User ID from auth
- `name`, `role` (high_school | college)
- `learning_goal`, `preferred_explanation_style`
- RLS enabled: Users can only view/edit own profile

#### mastery_scores
- Tracks user competency per topic
- Ranges from 0-100
- Updated after each quiz attempt

#### quiz_attempts
- Records every quiz answer
- Tracks correctness for analysis
- Indexed by user_id, timestamp, subject

#### revision_schedule
- Spaced repetition recommendations
- Priority scoring based on:
  - `(100 - mastery_score) + (recent_mistakes × 5) + (days_since_practice × 2)`
- Next revision date calculated using adaptive algorithms

#### diagnostic_quizzes
- Tracks completion of initial assessment
- Ensures each user takes diagnostic once per subject

#### coding_submissions
- Records Python code submissions
- Tracks correctness and error messages

## Core Features

### 1. Diagnostic Quiz Engine
- 5 questions per subject based on user role
- Establishes baseline mastery scores
- Automatically routes to personalized learning

### 2. Adaptive Learning Engine
- Difficulty adjusts based on mastery:
  - `< 40`: Easy questions
  - `40-75`: Medium questions
  - `> 75`: Hard questions

### 3. Mistake-Aware AI Explanations
- Triggers after 2 consecutive wrong answers
- Uses OpenAI to generate:
  - Why the answer was wrong
  - Likely misconception
  - Step-by-step correction
  - Follow-up practice question
- Adapts to user's preferred explanation style

### 4. Smart Revision Engine
- Calculates priority scores for topics
- Suggests topics for today based on schedule
- Uses spaced repetition algorithm
- Highlights overdue revisions

### 5. Python Interactive Tutor
- Monaco Editor for code writing
- Sandbox execution simulation
- AI-powered debugging explanations
- Hint system

## Key Algorithms

### Mastery Score Calculation
```
newScore = currentScore + (isCorrect ? +10 : -10)
Capped between 0-100
```

### Priority Score for Revision
```
priority = (100 - mastery) + (recent_mistakes × 5) + (days_since_last × 2)
Higher = needs more attention
```

### Difficulty Level Selection
```
< 40 mastery   → Easy
40-75 mastery  → Medium
> 75 mastery   → Hard
```

## API Endpoints

### Quiz Management
- `POST /api/quiz-attempts` - Record quiz answer
- `GET /api/quiz-attempts?userId=xxx&subject=xxx` - Get history

### Mastery Tracking
- `POST /api/mastery-scores` - Update/create score
- `GET /api/mastery-scores?userId=xxx` - Get all scores

### AI Explanations
- `POST /api/ai-explanation` - Get mistake explanation
- `POST /api/ai-explanation/python-debug` - Get debugging help

### Revision Schedule
- `POST /api/revision-schedule` - Create/update schedule
- `GET /api/revision-schedule?userId=xxx` - Get schedule

### Coding
- `POST /api/coding-submissions` - Save code submission
- `GET /api/coding-submissions?userId=xxx` - Get submissions

## AI Integration

### OpenAI Prompts

**Mistake Explanation**:
```
Explain why the student's answer is incorrect.
Identify likely misconception.
Provide step-by-step correction.
Give a small follow-up practice question.
```

**Python Debugging**:
```
Explain the error in the code.
Provide helpful hint.
Suggest improvement.
```

**Adaptive Question Generation**:
```
Generate questions at specified difficulty (easy/medium/hard)
For a specific topic and subject
```

## Security Features

- Row-Level Security (RLS) on all tables
- Users can only access their own data
- Service role key for admin operations
- ANON key for client-side operations
- Environment variables for secrets

## Example Workflows

### Workflow 1: New User Signup
```
1. User signs up with email/password
2. Redirected to profile setup (role, name, goal, style)
3. Takes diagnostic quiz
4. Mastery scores calculated
5. Redirected to dashboard
```

### Workflow 2: Practice a Topic
```
1. User selects topic from dashboard
2. System determines difficulty based on mastery score
3. AI generates adaptive questions
4. User answers question
5. If wrong: AI explanation triggered after 2 mistakes
6. Mastery score updated
7. Attempt logged for analytics
```

### Workflow 3: Revision
```
1. User has topics in revision_schedule
2. Dashboard shows "Today's Revision"
3. User clicks "Start Revision"
4. Medium-difficulty questions from weak topics
5. Scores updated
6. Next revision date recalculated
```

## Deployment

### Vercel (Recommended)
```bash
# Connect GitHub repo to Vercel
# Add environment variables in Vercel dashboard
# Auto-deploys on push
```

### Docker
```bash
docker build -t dualpath-ai .
docker run -p 3000:3000 dualpath-ai
```

## Sample Features Included

### Diagnostic Questions
- High School Math: Algebra, Quadratics, Geometry, Trigonometry
- College Python: Syntax, Data Structures, Functions, OOP, ML Basics

### Python Challenges
1. Simple Addition Function
2. Reverse a String
3. Count Vowels

## Hackathon MVP

✅ Clean, readable code  
✅ Core features working end-to-end  
✅ Beautiful, responsive UI  
✅ AI integration functional  
✅ Database properly set up  
✅ Authentication working  
✅ Adaptive learning logic implemented  
✅ All pages and flows implemented  

## Development Tips

### Adding New Topics
Edit [src/utils/quizData.ts](src/utils/quizData.ts):
```typescript
export const TOPICS_BY_SUBJECT = {
  math: {
    'high_school': [..., 'new-topic'],
  },
};
```

### Customizing AI Prompts
Edit [src/utils/aiService.ts](src/utils/aiService.ts) functions:
- `generateMistakeExplanation()`
- `generateAdaptiveQuestions()`
- `generatePythonDebugExplanation()`

### Styling
- Uses TailwindCSS utility classes
- ShadCN UI components in [src/components/ui/](src/components/ui/)
- Global styles in [src/app/globals.css](src/app/globals.css)

## Debugging

### Check Supabase Connection
```typescript
// In any component
import { createBrowserClient } from '@/utils/supabase';
const supabase = createBrowserClient();
console.log(supabase);
```

### Test API Routes
```bash
curl -X POST http://localhost:3000/api/quiz-attempts \
  -H "Content-Type: application/json" \
  -d '{"userId": "xxx", "subject": "math", ...}'
```

### Monitor OpenAI Usage
Check your OpenAI dashboard for API usage and costs.

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [ShadCN UI](https://ui.shadcn.com)
- [OpenAI API](https://platform.openai.com/docs)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)

## Team

Built for HackTheEast Hackathon | HTE_Arbitrary_Programmers

## License

MIT - Feel free to use and modify for your hackathon!