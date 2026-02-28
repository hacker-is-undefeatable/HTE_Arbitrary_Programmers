import { MasteryScore } from '@/types';

/**
 * Calculate new mastery score based on answer correctness
 * Start at 50
 * Correct answer → +10
 * Wrong answer → -10
 * Cap between 0–100
 */
export const calculateMasteryScore = (
  currentScore: number = 50,
  isCorrect: boolean
): number => {
  const delta = isCorrect ? 10 : -10;
  const newScore = currentScore + delta;
  
  // Cap between 0 and 100
  return Math.max(0, Math.min(100, newScore));
};

/**
 * Determine quiz difficulty based on mastery score
 * < 40: easy
 * 40-75: medium
 * > 75: hard
 */
export const getDifficultyLevel = (masteryScore: number): 'easy' | 'medium' | 'hard' => {
  if (masteryScore < 40) return 'easy';
  if (masteryScore <= 75) return 'medium';
  return 'hard';
};

/**
 * Categorize mastery level
 * < 50: Weak (red)
 * 50-75: Developing (yellow)
 * > 75: Strong (green)
 */
export const categorizeMastery = (
  score: number
): { category: 'weak' | 'developing' | 'strong'; color: string } => {
  if (score < 50) return { category: 'weak', color: 'red' };
  if (score <= 75) return { category: 'developing', color: 'yellow' };
  return { category: 'strong', color: 'green' };
};

/**
 * Calculate average mastery across all topics
 */
export const calculateAverageMastery = (scores: MasteryScore[]): number => {
  if (scores.length === 0) return 50;
  const total = scores.reduce((sum, score) => sum + score.mastery_score, 0);
  return Math.round(total / scores.length);
};

/**
 * Get categorized topics from mastery scores
 */
export const categorizeMasteryTopics = (scores: MasteryScore[]) => {
  const weak: string[] = [];
  const developing: string[] = [];
  const strong: string[] = [];

  scores.forEach((score) => {
    const { category } = categorizeMastery(score.mastery_score);
    const topicLabel = `${score.topic} (${score.subject})`;
    
    if (category === 'weak') weak.push(topicLabel);
    else if (category === 'developing') developing.push(topicLabel);
    else strong.push(topicLabel);
  });

  return { weak, developing, strong };
};
