# DualPath AI - Architecture & Design Document

## 📋 Table of Contents
1. System Overview
2. Technology Decisions
3. Data Architecture
4. API Architecture
5. Frontend Architecture
6. AI Integration
7. Security Model
8. Scalability Considerations

---

## 1. System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Browser                          │
│  (Next.js Frontend - React + TypeScript + TailwindCSS)     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                  API Layer (Next.js)                        │
│  - Quiz Attempts        - Mastery Scores                   │
│  - AI Explanations      - Revision Schedule                │
│  - Coding Submissions                                       │
└──────────┬──────────────────────────────────────────────────┘
           │
           ├─→ Supabase (PostgreSQL + Auth)
           ├─→ OpenAI API (GPT-4)
           └─→ External Services
```

### User Journey

```
Landing Page
    ↓
Sign Up / Login
    ↓
Profile Setup (Role, Goal, Style)
    ↓
Diagnostic Quiz (5 questions)
    ↓
Dashboard (View Progress)
    ↓
Learn (Math/Python → Practice)
    ↓
Mastery ↑ → Harder Questions
    ↓
Revision Schedule (Spaced Repetition)
    ↓
Settings & Profile Management
```

---

## 2. Technology Decisions

### Why Next.js?
- ✅ Full-stack in one framework
- ✅ File-based routing (simple structure)
- ✅ API routes for backend
- ✅ Server-side rendering capable
- ✅ Great TypeScript support
- ✅ Vercel deployment integration

### Why Supabase?
- ✅ Simple PostgreSQL setup (no DevOps needed)
- ✅ Built-in Auth (email/password, OAuth)
- ✅ Row-Level Security for multi-tenancy
- ✅ Real-time subscriptions possible
- ✅ Free tier sufficient for hackathon
- ✅ Easy SQL management
- ✅ RESTful API with filters/sorting

### Why OpenAI?
- ✅ State-of-the-art language model
- ✅ Easy to use API
- ✅ Can handle complex prompts
- ✅ Good for explanation generation
- ✅ Reasonably priced for MVP

### Why TailwindCSS + ShadCN?
- ✅ Utility-first CSS (rapid development)
- ✅ Pre-built accessible components
- ✅ Responsive design built-in
- ✅ Professional-looking UI quickly
- ✅ Customizable with CSS variables

### Why Monaco Editor?
- ✅ Industry-standard code editor
- ✅ Syntax highlighting for Python
- ✅ Keyboard shortcuts users know
- ✅ Lightweight compared to alternatives
- ✅ Easy to integrate in React

---

## 3. Data Architecture

### Database Schema Design

```sql
users (managed by Supabase auth)
│
├── profiles (1:1 with users)
│   ├── id (FK → users.id)
│   ├── name, role, learning_goal
│   └── preferred_explanation_style
│
├── mastery_scores (N:1 with profiles)
│   ├── user_id (FK → profiles.id)
│   ├── subject (math | python)
│   ├── topic (dynamically defined)
│   └── mastery_score (0-100)
│
├── quiz_attempts (N:1 with profiles)
│   ├── user_id (FK → profiles.id)
│   ├── question, user_answer, correct_answer
│   ├── is_correct
│   └── timestamp
│
├── revision_schedule (N:1 with profiles)
│   ├── user_id (FK → profiles.id)
│   ├── subject, topic
│   ├── priority_score
│   ├── next_revision_date
│   └── (One per user-subject-topic)
│
├── diagnostic_quizzes (N:1 with profiles)
│   ├── user_id (FK → profiles.id)
│   ├── subject
│   └── completed_at
│
└── coding_submissions (N:1 with profiles)
    ├── user_id (FK → profiles.id)
    ├── challenge_id
    ├── code, is_correct, error_message
    └── submitted_at
```

### Indexing Strategy

```sql
-- For frequently filtered queries
CREATE INDEX idx_mastery_scores_user_id ON mastery_scores(user_id)
CREATE INDEX idx_quiz_attempts_user_id ON quiz_attempts(user_id)
CREATE INDEX idx_quiz_attempts_timestamp ON quiz_attempts(timestamp)
CREATE INDEX idx_quiz_attempts_is_correct ON quiz_attempts(is_correct)
CREATE INDEX idx_revision_schedule_user_id ON revision_schedule(user_id)
CREATE INDEX idx_revision_schedule_next_date ON revision_schedule(next_revision_date)
```

### Row-Level Security (RLS)

All tables have RLS enabled. Examples:

```sql
-- Users can only see their own records
CREATE POLICY "Users can view own mastery scores"
  ON mastery_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own mastery scores"
  ON mastery_scores FOR UPDATE
  USING (auth.uid() = user_id);
```

**Key Security Points:**
- ANON key has limited permissions (RLS enforced)
- SERVICE ROLE key bypasses RLS (admin operations only)
- All client operations go through ANON key
- No direct SQL access from frontend

---

## 4. API Architecture

### Route Structure

```
/api
├── quiz-attempts/
│   ├── POST  → Save attempt
│   └── GET   → Get attempts (with filters)
│
├── mastery-scores/
│   ├── POST  → Upsert score
│   └── GET   → Get scores (with filters)
│
├── ai-explanation/
│   ├── POST  → Generate mistake explanation
│   └── python-debug/
│       └── POST → Generate debug explanation
│
├── revision-schedule/
│   ├── POST  → Upsert schedule
│   └── GET   → Get schedule (with filters)
│
└── coding-submissions/
    ├── POST  → Save submission
    └── GET   → Get submissions (with filters)
```

### API Design Patterns

**POST with Upsert:**
```typescript
// Mastery scores use upsert to avoid duplicates
await db.from('mastery_scores').upsert(
  { user_id, subject, topic, mastery_score },
  { onConflict: 'user_id,subject,topic' }
)
```

**GET with Filters:**
```typescript
// All GETs support optional filters
let query = db.from('table').select('*').eq('user_id', userId)
if (subject) query = query.eq('subject', subject)
const { data } = await query
```

**Error Handling:**
```typescript
try {
  const { data, error } = await db.from('table').select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
} catch (error) {
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
```

---

## 5. Frontend Architecture

### Component Hierarchy

```
Layout (Global)
  ├── Landing Page
  ├── Auth Pages
  │   ├── Login
  │   └── Signup
  ├── DiagnosticSetup
  ├── Diagnostic
  ├── Dashboard
  ├── Learn
  │   ├── Math
  │   └── Python
  ├── Revision
  └── Settings
```

### State Management Strategy

**Level 1: React Hooks** (component level)
```typescript
const [answers, setAnswers] = useState<{}>({})
const [currentQuestion, setCurrentQuestion] = useState(0)
```

**Level 2: Custom Hooks** (shared logic)
```typescript
const { user, loading, error, signIn, signOut } = useAuth()
const { profile, updateProfile } = useProfile(userId)
const { scores, updateMasteryScore } = useMasteryScores(userId)
```

**Level 3: Supabase Client** (data persistence)
```typescript
// Real-time sync with Supabase
const supabase = createBrowserClient()
await supabase.from('table').insert(data)
```

### Performance Optimizations

1. **Code Splitting**
   - Monaco Editor loaded dynamically
   - Heavy components only loaded when needed

2. **Memoization**
   - useCallback for event handlers
   - useMemo for expensive calculations

3. **Image Optimization**
   - Next.js automatic image optimization
   - SVG icons (no images)

4. **Lazy Loading**
   - Routes split by page
   - Dynamic imports for large components

### Styling Architecture

**Global Styles** → `globals.css`
- CSS variables for theme
- Tailwind @directives
- Dark mode support ready

**Component Styles** → Inline TailwindCSS
- No CSS files per component
- Utility-first approach
- cn() utility for conditional classes

```typescript
// Example: Conditional styling
className={cn(
  "base classes",
  isActive && "active:classes",
  disabled && "disabled:classes"
)}
```

---

## 6. AI Integration

### OpenAI API Structure

**Model**: GPT-4o-mini (optimized for speed/cost)

**Three Main Use Cases:**

#### 1. Mistake Explanation
```
Input:
- Question, user answer, correct answer
- Topic, explanation style, mastery level
- User's preferred explanation style

Output (JSON):
{
  "explanation": "...",
  "misconception": "...",
  "follow_up_question": "..."
}
```

**When Used**: After 2 consecutive wrong answers

**Adaptation**: 
- Easy language for low mastery
- Complex language for high mastery
- Different structure based on style preference

#### 2. Adaptive Question Generation
```
Input:
- Subject, topic, difficulty level
- Number of questions needed

Output (JSON array):
[
  {
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "correct_answer": "A",
    "explanation": "..."
  }
]
```

**When Used**: Initially for practice, could replace static questions

**Future**: Replace all quiz questions with AI-generated

#### 3. Python Debugging
```
Input:
- Code snippet
- Error message
- Explanation style

Output (JSON):
{
  "explanation": "...",
  "hint": "...",
  "suggested_improvement": "..."
}
```

**When Used**: When code execution fails or is incorrect

**Safety**: Text analysis only (no actual code execution)

### Prompt Engineering Techniques

**1. Role-Based Prompts**
```
"You are an expert {subject} tutor..."
```

**2. Personalization**
```
"The student has {masteryLevel}% mastery, so..."
```

**3. Structured Output**
```
"Format your response as JSON with these keys: ..."
```

**4. Style Adaptation**
```
"Use step-by-step format with numbered instructions"
```

---

## 7. Security Model

### Authentication Flow

```
User Input Email/Password
         ↓
Supabase Auth (bcrypt hash)
         ↓
JWT Token (stored in session)
         ↓
Protected Routes (check token)
         ↓
API Requests (JWT validated)
         ↓
RLS Policies (Supabase enforces)
         ↓
Data Access (only own records)
```

### Key Security Practices

1. **ANON Key** (published, safe)
   - Used by frontend
   - Limited by RLS
   - Can only modify own data

2. **SERVICE ROLE Key** (secret)
   - Used by backend servers only
   - Bypasses RLS
   - Store in .env only

3. **JWT Tokens**
   - Supabase creates on login
   - Valid for 1 hour (typical)
   - Refresh token for long sessions
   - Stored in secure cookie

4. **Environment Variables**
   ```
   NEXT_PUBLIC_* → Published (safe)
   others        → Secret (never share)
   ```

5. **HTTPS Only**
   - Production forces HTTPS
   - Development uses HTTP (localhost)
   - Supabase always HTTPS

### Data Protection

**In Transit:**
- HTTPS/TLS encryption
- Supabase enforces

**At Rest:**
- Database encryption (Supabase default)
- No sensitive data in localStorage
- JWT in secure httpOnly cookies (Supabase handles)

**Access Control:**
- RLS: Row-level
- Column-level: Done in application
- Field-level: Validate in API routes

---

## 8. Scalability Considerations

### Database Scaling

**Current Capacity:**
- 1000 users: No issues (Supabase free tier handles)
- 10,000 users: Indexes needed (implemented)
- 100,000 users: Connection pooling (PgBouncer)
- 1M+ users: Read replicas, vertical scaling

**Query Optimization:**
```sql
-- Indexed queries
SELECT * FROM mastery_scores WHERE user_id = $1 -- O(log n)

-- Avoid N+1 queries
SELECT profiles.*, 
       COUNT(quiz_attempts) as attempt_count
FROM profiles
LEFT JOIN quiz_attempts ON profiles.id = quiz_attempts.user_id
GROUP BY profiles.id
```

### API Scaling

**Current:**
- Serverless functions scale automatically
- ~100 concurrent users per instance

**Future Bottlenecks:**
1. OpenAI API rate limits
   - Solution: Implement queue system
   - Fall back to static explanations

2. Database connections
   - Solution: Connection pooling
   - Implement caching layer

3. File uploads (Python code)
   - Solution: Cloud storage (S3)
   - Virus scanning before execution

### Frontend Scaling

**Bundle Size Optimization:**
- Current: ~200KB (gzipped)
- Monaco Editor: Dynamic load (50KB)
- Next.js automatic splitting

**Performance Targets:**
- LCP: < 2.5s
- FID: < 100ms
- CLS: < 0.1

---

## 9. Monitoring & Analytics

### What We Track

**User Events:**
- signup, login, logout
- diagnostic_start, diagnostic_complete
- practice_start, practice_answer, practice_complete
- revision_start
- settings_update

**Performance Metrics:**
- API response times
- OpenAI API latency
- Database query times
- Frontend performance (Core Web Vitals)

**Quality Metrics:**
- Question difficulty distribution
- Mastery score trends
- Revision schedule adherence
- AI explanation quality (user feedback)

### Implementation (Future)

```typescript
// Analytics hook
const trackEvent = (eventName: string, properties: {}) => {
  // Send to Mixpanel, Amplitude, or GA
}

// Usage
trackEvent('practice_answer', {
  is_correct: true,
  topic: 'algebra',
  time_taken: 45000
})
```

---

## 10. Deployment Architecture

### Development Environment
```
Local Machine
    ↓
npm run dev
    ↓
http://localhost:3000 (frontend)
http://localhost:3000/api (backend)
    ↓
Supabase Cloud Database
OpenAI Cloud API
```

### Production Environment (Vercel)
```
GitHub Repository
    ↓
Git Push
    ↓
Vercel CI/CD
    ↓
Build & Test
    ↓
Deploy to Edge
    ↓
https://dualpath-ai.vercel.app
    ↓
Supabase Cloud Database
OpenAI Cloud API
```

### Environment Configuration

```
Development (.env.local):
- Localhost URLs
- Free tier API keys
- Debug logging ON

Staging (if added):
- Staging database
- Test API keys
- Some logging

Production (.env.production):
- Production URLs
- Production API keys
- Minimal logging
- Error tracking enabled
```

---

## 11. Design Patterns Used

### 1. Provider Pattern (Auth)
```typescript
// Provides auth state to entire app
const { user, signIn, signOut } = useAuth()
```

### 2. Hook Pattern (Data)
```typescript
// Encapsulates data fetching logic
const { profile, updateProfile } = useProfile(userId)
```

### 3. Component Composition
```typescript
// Card built from smaller components
<Card>
  <CardHeader>
    <CardTitle>...</CardTitle>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>
```

### 4. Upsert Pattern (Idempotence)
```typescript
// Same request twice = same result
.upsert({ ...data }, { onConflict: 'key' })
```

### 5. Error Boundary (Future)
```typescript
// Catch errors at component level
<ErrorBoundary fallback={<ErrorUI />}>
  <Component />
</ErrorBoundary>
```

---

## 12. Future Improvements

### Short Term (Week 1-2)
- [ ] Add quiz progress indicators
- [ ] Email notifications for revisions
- [ ] User progress graphs
- [ ] Dark mode support

### Medium Term (Month 1)
- [ ] Real code execution (Replit API)
- [ ] Student cohorts/class management
- [ ] Leaderboards
- [ ] Badges/achievements

### Long Term (Quarter 1)
- [ ] Mobile app (React Native)
- [ ] Video content integration
- [ ] Live tutoring marketplace
- [ ] Marketplace for custom content
- [ ] Premium features/monetization

---

## Conclusion

DualPath AI is built on a foundation of:
- **Simplicity**: Few technologies, well-integrated
- **Scalability**: Ready to handle growth
- **Security**: RLS, JWT, environment isolation
- **Maintainability**: TypeScript, clear structure
- **Performance**: Optimized queries, lazy loading

The architecture supports rapid development during hackathon while maintaining enough structure for production deployment.
