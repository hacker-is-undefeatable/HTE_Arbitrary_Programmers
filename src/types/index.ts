// Types for the DualPath AI application

export type UserRole = 'high_school' | 'college';
export type Subject = 'math' | 'python';
export type ExplanationStyle = 'step-by-step' | 'conceptual' | 'visual';
export type QuizDifficulty = 'easy' | 'medium' | 'hard';

export interface Profile {
  id: string;
  name: string | null;
  role: UserRole;
  learning_goal: string | null;
  preferred_explanation_style: ExplanationStyle;
  created_at: string;
  updated_at: string;
}

export interface MasteryScore {
  id: string;
  user_id: string;
  subject: Subject;
  topic: string;
  mastery_score: number;
  last_updated: string;
  created_at: string;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  subject: Subject;
  topic: string;
  question: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  timestamp: string;
}

export interface RevisionSchedule {
  id: string;
  user_id: string;
  subject: Subject;
  topic: string;
  priority_score: number;
  next_revision_date: string;
  created_at: string;
  updated_at: string;
}

export interface DiagnosticQuiz {
  id: string;
  user_id: string;
  subject: Subject;
  completed_at: string;
}

export interface CodingSubmission {
  id: string;
  user_id: string;
  challenge_id: string;
  code: string;
  is_correct: boolean | null;
  error_message: string | null;
  submitted_at: string;
}

export interface AIExplanation {
  explanation: string;
  misconception: string;
  follow_up_question: string;
}

export interface QuizQuestion {
  id: string;
  subject: Subject;
  topic: string;
  difficulty: QuizDifficulty;
  question: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
}

export interface CodingChallenge {
  id: string;
  title: string;
  description: string;
  initial_code: string;
  test_cases?: string[];
  difficulty: QuizDifficulty;
  hints: string[];
}

export interface DashboardStats {
  totalMastery: number;
  topicsCount: number;
  weakTopics: string[];
  developingTopics: string[];
  strongTopics: string[];
  todayRevision: RevisionSchedule[];
}
