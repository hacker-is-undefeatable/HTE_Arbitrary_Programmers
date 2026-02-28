import { QuizAttempt, RevisionSchedule } from '@/types';

/**
 * Calculate priority score for revision
 * priority_score = (100 - mastery_score) + (recent mistakes × 5) + (days since last practice × 2)
 */
export const calculatePriorityScore = (
  masteryScore: number,
  recentMistakes: number,
  daysSinceLastPractice: number
): number => {
  return (100 - masteryScore) + (recentMistakes * 5) + (daysSinceLastPractice * 2);
};

/**
 * Count recent mistakes (in last 7 days)
 */
export const countRecentMistakes = (attempts: QuizAttempt[], days: number = 7): number => {
  const recentDate = new Date();
  recentDate.setDate(recentDate.getDate() - days);

  return attempts.filter((attempt) => {
    const attemptDate = new Date(attempt.timestamp);
    return !attempt.is_correct && attemptDate >= recentDate;
  }).length;
};

/**
 * Calculate days since last practice for a topic
 */
export const daysSinceLastPractice = (lastPracticeDate: string | null): number => {
  if (!lastPracticeDate) return 999; // Consider as never practiced

  const lastDate = new Date(lastPracticeDate);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - lastDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

/**
 * Get next revision date based on spaced repetition algorithm
 * Weak topics (< 50): 1-2 days
 * Developing (50-75): 3-7 days
 * Strong (> 75): 14-30 days
 */
export const getNextRevisionDate = (masteryScore: number): Date => {
  const today = new Date();
  const nextDate = new Date(today);

  if (masteryScore < 50) {
    // Weak: 1-2 days
    nextDate.setDate(nextDate.getDate() + Math.random() * 1 + 1);
  } else if (masteryScore <= 75) {
    // Developing: 3-7 days
    nextDate.setDate(nextDate.getDate() + Math.floor(Math.random() * 5 + 3));
  } else {
    // Strong: 14-30 days
    nextDate.setDate(nextDate.getDate() + Math.floor(Math.random() * 16 + 14));
  }

  return nextDate;
};

/**
 * Generate revision items for today
 */
export const getTodayRevisionItems = (
  revisionSchedules: RevisionSchedule[]
): RevisionSchedule[] => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  return revisionSchedules.filter(
    (schedule) => schedule.next_revision_date === today
  );
};

/**
 * Get top topics to revise (by priority score)
 */
export const getTopRevisionTopics = (
  revisionSchedules: RevisionSchedule[],
  limit: number = 5
): RevisionSchedule[] => {
  return revisionSchedules
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, limit);
};

/**
 * Calculate if a topic needs revision (priority > threshold)
 */
export const shouldRevise = (priorityScore: number, threshold: number = 60): boolean => {
  return priorityScore > threshold;
};
