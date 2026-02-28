'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MathText } from '@/components/math-text';

type DifficultyLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

type QuizSubject = 'math' | 'ai';

type OptionKey = 'A' | 'B' | 'C' | 'D';

interface MCQ {
  id: string;
  subject: QuizSubject;
  difficulty: DifficultyLevel;
  concept: string;
  question: string;
  options: Record<OptionKey, string>;
  correctOption: OptionKey;
  misconception: string;
  reinforcementTip: string;
}

interface QuestionReview {
  questionId: string;
  concept: string;
  correctOption: OptionKey;
  correctExplanation: string;
  studentOption: OptionKey | null;
  isCorrect: boolean;
  misconception: string | null;
  reinforcementTip: string;
}

interface RoundSummary {
  round: number;
  subject: QuizSubject;
  difficulty: DifficultyLevel;
  score: number;
  accuracy: number;
  weakestConcept: string | null;
  strongestConcept: string | null;
  masterySignal: 'Struggling' | 'Developing' | 'Proficient' | 'Advanced';
  difficultyAdjustment: 'Increase' | 'Maintain' | 'Decrease';
  nextDifficulty: DifficultyLevel;
  rationale: string;
  questionReviews: QuestionReview[];
}

const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  L1: 'Recall',
  L2: 'Comprehension',
  L3: 'Application',
  L4: 'Analysis',
  L5: 'Synthesis / Evaluation',
};

const MAX_ROUNDS = 5;
const QUESTIONS_PER_ROUND = 5;

/** localStorage key for question IDs used in past completed sessions (per subject). No database ? questions stay in code. */
const USED_QUESTION_IDS_KEY = 'adaptiveQuizUsedQuestionIds';

/** When a difficulty has fewer than 5 questions, pull from these levels to fill the round. */
const DIFFICULTY_FALLBACKS: Record<DifficultyLevel, DifficultyLevel[]> = {
  L1: ['L2'],
  L2: ['L1', 'L3'],
  L3: ['L2', 'L4'],
  L4: ['L3', 'L5'],
  L5: ['L4'],
};

const MATH_QUESTIONS: MCQ[] = [
  // L1 ? Recall
  {
    id: 'math-l1-1',
    subject: 'math',
    difficulty: 'L1',
    concept: 'arithmetic',
    question: 'What is 7 + 5?',
    options: {
      A: '11',
      B: '12',
      C: '13',
      D: '15',
    },
    correctOption: 'B',
    misconception: 'Confusing addition with multiplication or miscounting by one.',
    reinforcementTip: 'Pair numbers that make 10 first \\(7 + 3 + 2\\) to simplify mental addition.',
  },
  {
    id: 'math-l1-2',
    subject: 'math',
    difficulty: 'L1',
    concept: 'fractions',
    question: 'What fraction of a pizza is left if you eat 1 out of 4 equal slices?',
    options: {
      A: '1/4',
      B: '2/4',
      C: '3/4',
      D: '4/4',
    },
    correctOption: 'C',
    misconception: 'Mixing up how many parts are eaten vs. how many are left.',
    reinforcementTip: 'Think: denominator = total pieces, numerator = pieces you have.',
  },
  {
    id: 'math-l1-3',
    subject: 'math',
    difficulty: 'L1',
    concept: 'algebra notation',
    question: 'In the expression 3x, what does the 3 represent?',
    options: {
      A: 'The variable',
      B: 'The exponent',
      C: 'The coefficient',
      D: 'The constant term',
    },
    correctOption: 'C',
    misconception: 'Confusing coefficients with constants or exponents.',
    reinforcementTip: 'The coefficient is the number multiplying the variable.',
  },

  // L2 ? Comprehension
  {
    id: 'math-l2-1',
    subject: 'math',
    difficulty: 'L2',
    concept: 'linear equations',
    question: 'When solving 2(x - 3) = 10, what does (x - 3) represent?',
    options: {
      A: 'The final value of x',
      B: 'A shifted version of x that must be isolated first',
      C: 'The slope of the equation',
      D: 'A constant term that can be ignored',
    },
    correctOption: 'B',
    misconception: 'Treating (x - 3) as a constant or as the final answer.',
    reinforcementTip: 'See (x - 3) as a "box" you first isolate, then solve for x inside it.',
  },
  {
    id: 'math-l2-2',
    subject: 'math',
    difficulty: 'L2',
    concept: 'functions',
    question: 'A function is increasing on an interval if:',
    options: {
      A: 'Its graph is always above the x-axis on that interval',
      B: 'The y-values get larger as the x-values get larger',
      C: 'The graph is symmetric about the y-axis',
      D: 'Its derivative is equal to zero on that interval',
    },
    correctOption: 'B',
    misconception: 'Thinking "increasing" means "positive values" instead of "values going up."',
    reinforcementTip: 'Trace the graph from left to right; if you go uphill, the function increases.',
  },
  {
    id: 'math-l2-3',
    subject: 'math',
    difficulty: 'L2',
    concept: 'limits',
    question: 'Saying the limit of f(x) as x approaches 2 equals 5 means:',
    options: {
      A: 'f(2) must equal 5',
      B: 'As x gets closer to 2, f(x) gets closer to 5',
      C: 'The graph must pass through (2, 5)',
      D: 'The function is undefined at x = 2',
    },
    correctOption: 'B',
    misconception: 'Confusing the limit value with the actual function value at that point.',
    reinforcementTip: 'Limits describe trend near a point, not necessarily the value at the point.',
  },

  // L3 ? Application
  {
    id: 'math-l3-1',
    subject: 'math',
    difficulty: 'L3',
    concept: 'probability',
    question:
      'A fair six-sided die is rolled once. What does a probability of 1/6 for rolling a 4 mean?',
    options: {
      A: 'You will definitely roll a 4 after six rolls',
      B: 'A 4 is less likely than any other number',
      C: 'In many rolls, about one-sixth of the outcomes will be 4',
      D: 'You will never roll a 4 twice in a row',
    },
    correctOption: 'C',
    misconception: 'Interpreting probability as a guarantee instead of a long-run frequency.',
    reinforcementTip: 'Think of probability as "what happens in the long run," not a short guarantee.',
  },
  {
    id: 'math-l3-2',
    subject: 'math',
    difficulty: 'L3',
    concept: 'pythagorean theorem',
    question: 'A right triangle has legs of lengths 3 and 4. What is the hypotenuse?',
    options: {
      A: '5 because 3 + 4 = 7 and 7 - 2 = 5',
      B: '7 because 3 + 4 = 7',
      C: '5 because \\(3^2 + 4^2 = 5^2\\)',
      D: '25 because \\(3^2 + 4^2 = 25\\)',
    },
    correctOption: 'C',
    misconception: 'Adding lengths instead of using squares in the theorem.',
    reinforcementTip: 'For right triangles, work with squares of sides, not just side lengths.',
  },
  {
    id: 'math-l3-3',
    subject: 'math',
    difficulty: 'L3',
    concept: 'average speed',
    question:
      'A train travels 60 mph for 2 hours, then 40 mph for 3 hours. What is its average speed?',
    options: {
      A: '50 mph',
      B: '48 mph',
      C: '45 mph',
      D: '55 mph',
    },
    correctOption: 'B',
    misconception: 'Averaging 60 and 40 directly instead of using total distance / total time.',
    reinforcementTip: 'Always compute average speed as total distance divided by total time.',
  },

  // L4 ? Analysis
  {
    id: 'math-l4-1',
    subject: 'math',
    difficulty: 'L4',
    concept: 'function behavior',
    question:
      'Which statement best compares linear and exponential growth over a long time horizon?',
    options: {
      A: 'Linear always grows faster than exponential',
      B: 'Exponential eventually outgrows any linear function',
      C: 'They always grow at the same rate',
      D: 'Neither can exceed the other',
    },
    correctOption: 'B',
    misconception: 'Underestimating how quickly exponential functions grow.',
    reinforcementTip:
      'Plot \\(y = x\\) and \\(y = 2^x\\); exponential may start lower but quickly overtakes linear growth.',
  },
  {
    id: 'math-l4-2',
    subject: 'math',
    difficulty: 'L4',
    concept: 'derivatives',
    question:
      'If f\'(x) is positive on (a, b) and negative on (b, c), what can you say about f at x = b?',
    options: {
      A: 'f has a local minimum at x = b',
      B: 'f has a local maximum at x = b',
      C: 'f is constant at x = b',
      D: 'No information can be determined',
    },
    correctOption: 'B',
    misconception: 'Reversing the sign change pattern for maxima and minima.',
    reinforcementTip: 'Positive-to-negative slope change means the graph turns from uphill to downhill.',
  },
  {
    id: 'math-l4-3',
    subject: 'math',
    difficulty: 'L4',
    concept: 'statistics',
    question:
      'Two classes take the same test. Class A has mean 75 with small variance; Class B has mean 75 with large variance. What does this tell you?',
    options: {
      A: 'Class A scored higher on average',
      B: 'Class B scored higher on average',
      C: 'Both have similar average performance but Class B is more spread out',
      D: 'Both classes performed identically',
    },
    correctOption: 'C',
    misconception: 'Ignoring variance and focusing only on the mean.',
    reinforcementTip: 'Mean shows center; variance shows how tightly scores cluster around that center.',
  },

  // L5 ? Synthesis / Evaluation
  {
    id: 'math-l5-1',
    subject: 'math',
    difficulty: 'L5',
    concept: 'modeling',
    question:
      'You are modeling population growth that starts slowly, then accelerates rapidly. Which model is most appropriate?',
    options: {
      A: 'Linear model',
      B: 'Quadratic model',
      C: 'Exponential model',
      D: 'Constant model',
    },
    correctOption: 'C',
    misconception: 'Using linear models for situations with accelerating growth.',
    reinforcementTip:
      'Whenever a quantity grows by a percentage or factor over equal time steps, think exponential.',
  },
  {
    id: 'math-l5-2',
    subject: 'math',
    difficulty: 'L5',
    concept: 'method selection',
    question:
      'You need to approximate the area under a curve where an exact antiderivative is difficult to find. Which approach is best?',
    options: {
      A: 'Guess a formula by sight',
      B: 'Use numerical integration methods like the trapezoidal rule',
      C: 'Differentiate the function again',
      D: 'Ignore the area and use the maximum value only',
    },
    correctOption: 'B',
    misconception: 'Thinking exact symbolic methods are always required.',
    reinforcementTip:
      'When exact formulas are hard, numerical methods trade a tiny error for practical solutions.',
  },
  {
    id: 'math-l5-3',
    subject: 'math',
    difficulty: 'L5',
    concept: 'comparing strategies',
    question:
      'To reduce error in measuring an experimental quantity, which strategy is generally most effective?',
    options: {
      A: 'Take many measurements and average them',
      B: 'Use only the first measurement',
      C: 'Always choose the largest reading',
      D: 'Always choose the smallest reading',
    },
    correctOption: 'A',
    misconception: 'Believing one reading is enough to represent a noisy process.',
    reinforcementTip:
      'Averaging many measurements cancels random errors and gives a more reliable estimate.',
  },
];

const AI_QUESTIONS: MCQ[] = [
  // L1 ? Recall
  {
    id: 'ai-l1-1',
    subject: 'ai',
    difficulty: 'L1',
    concept: 'supervised learning',
    question: 'In supervised learning, what is a "label"?',
    options: {
      A: 'The raw input data',
      B: 'The correct output the model should learn to predict',
      C: 'The number of layers in a network',
      D: 'The learning rate value',
    },
    correctOption: 'B',
    misconception: 'Confusing inputs (features) with outputs (labels).',
    reinforcementTip: 'Features go in; labels are the answers you want the model to learn.',
  },
  {
    id: 'ai-l1-2',
    subject: 'ai',
    difficulty: 'L1',
    concept: 'datasets',
    question: 'What is a "training set" in machine learning?',
    options: {
      A: 'Data reserved only for final evaluation',
      B: 'Data used to fit or learn the model parameters',
      C: 'Data that the model never sees',
      D: 'Random noise added to features',
    },
    correctOption: 'B',
    misconception: 'Mixing up training data with test or validation data.',
    reinforcementTip: 'The model "studies" the training set; it is graded on the test set.',
  },
  {
    id: 'ai-l1-3',
    subject: 'ai',
    difficulty: 'L1',
    concept: 'loss function',
    question: 'What does a loss function measure?',
    options: {
      A: 'How fast the code runs',
      B: "How wrong the model's predictions are",
      C: 'How much data is stored',
      D: 'How many layers the model has',
    },
    correctOption: 'B',
    misconception: 'Thinking loss is about resource usage instead of prediction error.',
    reinforcementTip: 'Lower loss means predictions are closer to the correct labels.',
  },

  // L2 ? Comprehension
  {
    id: 'ai-l2-1',
    subject: 'ai',
    difficulty: 'L2',
    concept: 'overfitting',
    question: 'Overfitting in a model means:',
    options: {
      A: 'It performs poorly on both training and test data',
      B: 'It is too simple to capture patterns in data',
      C: 'It has learned noise and specifics of the training data, hurting performance on new data',
      D: 'It trains too quickly and stops early',
    },
    correctOption: 'C',
    misconception: 'Confusing overfitting (too complex) with underfitting (too simple).',
    reinforcementTip: 'Overfitted models memorize; well-generalized models understand patterns.',
  },
  {
    id: 'ai-l2-2',
    subject: 'ai',
    difficulty: 'L2',
    concept: 'learning paradigms',
    question: 'The main difference between supervised and unsupervised learning is that:',
    options: {
      A: 'Supervised uses labeled data, unsupervised uses unlabeled data',
      B: 'Supervised is always better than unsupervised',
      C: 'Unsupervised needs more human annotations',
      D: 'Supervised cannot use numerical features',
    },
    correctOption: 'A',
    misconception: 'Thinking the difference is which algorithm is used rather than label availability.',
    reinforcementTip: 'Ask: "Do we know the correct answers for each example?" If yes, it\'s supervised.',
  },
  {
    id: 'ai-l2-3',
    subject: 'ai',
    difficulty: 'L2',
    concept: 'gradient descent',
    question: 'In gradient descent, the learning rate controls:',
    options: {
      A: 'How many layers the network has',
      B: 'How big each step is when updating parameters',
      C: 'The total number of training examples',
      D: 'Whether we use linear or nonlinear activations',
    },
    correctOption: 'B',
    misconception: 'Confusing the learning rate with model size or dataset size.',
    reinforcementTip: 'Think of learning rate as the step size while walking downhill on the loss surface.',
  },

  // L3 ? Application
  {
    id: 'ai-l3-1',
    subject: 'ai',
    difficulty: 'L3',
    concept: 'evaluation metrics',
    question:
      'A binary classifier has high accuracy but very poor recall for the positive class. Which scenario fits this?',
    options: {
      A: 'It correctly finds almost all positives but misses many negatives',
      B: 'It correctly finds almost all negatives but misses many positives',
      C: 'It predicts positives and negatives equally well',
      D: 'It never predicts the negative class',
    },
    correctOption: 'B',
    misconception: 'Mixing up precision, recall, and accuracy.',
    reinforcementTip:
      'Recall asks: "Of all true positives, how many did we catch?" High accuracy can hide low recall.',
  },
  {
    id: 'ai-l3-2',
    subject: 'ai',
    difficulty: 'L3',
    concept: 'confusion matrix',
    question: 'A confusion matrix is mainly used to:',
    options: {
      A: 'Visualize how many parameters a model has',
      B: 'Summarize correct and incorrect predictions across classes',
      C: 'Choose which algorithm to use before training',
      D: 'Normalize input features',
    },
    correctOption: 'B',
    misconception: 'Thinking it describes model architecture rather than prediction outcomes.',
    reinforcementTip:
      'Rows or columns show true vs. predicted labels so you can see which classes get confused.',
  },
  {
    id: 'ai-l3-3',
    subject: 'ai',
    difficulty: 'L3',
    concept: 'regularization',
    question:
      'Adding L2 regularization (weight decay) mainly encourages which behavior in model weights?',
    options: {
      A: 'Weights become very large',
      B: 'Weights move toward zero in magnitude',
      C: 'Weights become strictly positive',
      D: 'Weights are frozen and never update',
    },
    correctOption: 'B',
    misconception: 'Thinking regularization makes models more complex.',
    reinforcementTip:
      'Regularization penalizes large weights, nudging them smaller and reducing overfitting.',
  },

  // L4 ? Analysis
  {
    id: 'ai-l4-1',
    subject: 'ai',
    difficulty: 'L4',
    concept: 'bias-variance tradeoff',
    question:
      'If you switch from a simple linear model to a very deep neural network on a small dataset, what shift in bias/variance is likely?',
    options: {
      A: 'Higher bias, lower variance',
      B: 'Lower bias, higher variance',
      C: 'Lower bias, lower variance',
      D: 'Higher bias, higher variance',
    },
    correctOption: 'B',
    misconception: 'Assuming more complex models always improve generalization.',
    reinforcementTip:
      'Complex models fit training data better (low bias) but can fluctuate more (high variance).',
  },
  {
    id: 'ai-l4-2',
    subject: 'ai',
    difficulty: 'L4',
    concept: 'data leakage',
    question:
      'Which situation is a clear example of data leakage when training a model?',
    options: {
      A: 'Shuffling the training examples before each epoch',
      B: 'Using test labels accidentally during feature engineering',
      C: 'Normalizing features using only training set statistics',
      D: 'Splitting the data into train and test sets',
    },
    correctOption: 'B',
    misconception: 'Underestimating how subtle leakage can be when test information sneaks into training.',
    reinforcementTip:
      'Anything derived from test labels that influences training breaks the independence of evaluation.',
  },
  {
    id: 'ai-l4-3',
    subject: 'ai',
    difficulty: 'L4',
    concept: 'feature importance',
    question:
      'You train a model and find one feature has extremely high importance while others are near zero. What is a reasonable analysis step?',
    options: {
      A: 'Immediately delete the important feature',
      B: 'Assume the other features are useless without checking',
      C: 'Investigate whether the important feature leaks target information or encodes it unfairly',
      D: 'Ignore it because feature importance is unreliable',
    },
    correctOption: 'C',
    misconception: 'Blindly trusting importance scores without considering leakage or bias.',
    reinforcementTip:
      'Unusually powerful features may hide leakage, proxies for sensitive attributes, or data errors.',
  },

  // L5 ? Synthesis / Evaluation
  {
    id: 'ai-l5-1',
    subject: 'ai',
    difficulty: 'L5',
    concept: 'model selection',
    question:
      'You must deploy a model to a low-power edge device with strict latency limits. Which model family is usually the best starting point?',
    options: {
      A: 'Very deep transformer with billions of parameters',
      B: 'Small logistic regression or shallow tree-based model',
      C: 'Large ensemble of hundreds of models',
      D: 'Any model, latency does not depend on complexity',
    },
    correctOption: 'B',
    misconception: 'Equating "best" only with most complex or most accurate on large servers.',
    reinforcementTip:
      'On constrained hardware, simpler models often give the best accuracy?latency tradeoff.',
  },
  {
    id: 'ai-l5-2',
    subject: 'ai',
    difficulty: 'L5',
    concept: 'evaluation strategy',
    question:
      'Your dataset is time-series data with strong seasonality. Which evaluation strategy is most appropriate?',
    options: {
      A: 'Randomly shuffle all timestamps and do standard k-fold cross-validation',
      B: 'Use a time-based split where training uses earlier data and testing uses later data',
      C: 'Train and test on exactly the same time window',
      D: 'Only evaluate on the very first time period',
    },
    correctOption: 'B',
    misconception: 'Ignoring temporal order and leakage when validating time-series models.',
    reinforcementTip:
      'Future data should never influence the past; evaluation should mimic real deployment order.',
  },
  {
    id: 'ai-l5-3',
    subject: 'ai',
    difficulty: 'L5',
    concept: 'fairness',
    question:
      'You discover your classifier performs much worse on a particular demographic group. What is a responsible next step?',
    options: {
      A: 'Ignore it if overall accuracy is high',
      B: 'Hide group membership so the issue disappears from metrics',
      C: 'Investigate data balance, features, and metrics by group before deciding how to mitigate',
      D: 'Immediately deploy a more complex model',
    },
    correctOption: 'C',
    misconception: 'Focusing only on global metrics instead of subgroup performance.',
    reinforcementTip:
      "Fairness work starts with measurement: check each group's error rates, data quality, and representation.",
  },
];

/**
 * Returns a new set of questions for a round. Excludes any question IDs in excludedIds
 * (from previous sessions + current session) so questions never repeat across sessions.
 * Questions are only in code (MATH_QUESTIONS / AI_QUESTIONS); nothing is stored in a database.
 */
function getQuestionsForRound(
  subject: QuizSubject,
  difficulty: DifficultyLevel,
  excludedIds: Set<string>
): MCQ[] {
  const allQuestions = subject === 'math' ? MATH_QUESTIONS : AI_QUESTIONS;

  // Build pool for this difficulty (and fallbacks), excluding already-used questions
  let pool = allQuestions.filter(
    (q) => q.difficulty === difficulty && !excludedIds.has(q.id)
  );

  const fallbacks = DIFFICULTY_FALLBACKS[difficulty];
  for (const fallbackLevel of fallbacks) {
    if (pool.length >= QUESTIONS_PER_ROUND) break;
    const extra = allQuestions.filter(
      (q) => q.difficulty === fallbackLevel && !excludedIds.has(q.id)
    );
    const existingIds = new Set(pool.map((q) => q.id));
    for (const q of extra) {
      if (pool.length >= QUESTIONS_PER_ROUND) break;
      if (!existingIds.has(q.id)) {
        pool.push(q);
        existingIds.add(q.id);
      }
    }
  }

  // If we still don't have enough (e.g. many previous sessions), allow repeats for this round only
  if (pool.length < QUESTIONS_PER_ROUND) {
    pool = allQuestions.filter((q) => q.difficulty === difficulty);
    for (const fallbackLevel of fallbacks) {
      if (pool.length >= QUESTIONS_PER_ROUND) break;
      const extra = allQuestions.filter((q) => q.difficulty === fallbackLevel);
      const existingIds = new Set(pool.map((q) => q.id));
      for (const q of extra) {
        if (pool.length >= QUESTIONS_PER_ROUND) break;
        if (!existingIds.has(q.id)) {
          pool.push(q);
          existingIds.add(q.id);
        }
      }
    }
  }

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, QUESTIONS_PER_ROUND);
}

/** Load used question IDs from localStorage for a subject (no database). */
function loadUsedQuestionIds(subject: QuizSubject): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(USED_QUESTION_IDS_KEY);
    if (!raw) return new Set();
    const data = JSON.parse(raw) as Record<string, string[]>;
    const list = data[subject] ?? [];
    return new Set(list);
  } catch {
    return new Set();
  }
}

/** Persist used question IDs to localStorage after a session completes (no database). */
function saveUsedQuestionIds(subject: QuizSubject, newIds: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(USED_QUESTION_IDS_KEY);
    const data: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    const existing = data[subject] ?? [];
    const totalForSubject =
      subject === 'math' ? MATH_QUESTIONS.length : AI_QUESTIONS.length;
    const combined = [...existing, ...newIds];
    // Keep at most totalForSubject so we can cycle and avoid unbounded growth
    data[subject] =
      combined.length <= totalForSubject
        ? combined
        : combined.slice(-totalForSubject);
    window.localStorage.setItem(USED_QUESTION_IDS_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save used question IDs to localStorage', e);
  }
}

function getNextDifficulty(current: DifficultyLevel, correctCount: number): {
  adjustment: 'Increase' | 'Maintain' | 'Decrease';
  next: DifficultyLevel;
} {
  const order: DifficultyLevel[] = ['L1', 'L2', 'L3', 'L4', 'L5'];
  const idx = order.indexOf(current);

  let adjustment: 'Increase' | 'Maintain' | 'Decrease' = 'Maintain';
  let targetIdx = idx;

  if (correctCount >= 4) {
    adjustment = 'Increase';
    targetIdx = Math.min(order.length - 1, idx + 1);
  } else if (correctCount <= 1) {
    adjustment = 'Decrease';
    targetIdx = Math.max(0, idx - 1);
  }

  return { adjustment, next: order[targetIdx] };
}

function getMasterySignal(correctCount: number): 'Struggling' | 'Developing' | 'Proficient' | 'Advanced' {
  if (correctCount <= 1) return 'Struggling';
  if (correctCount <= 3) return 'Developing';
  if (correctCount === 4) return 'Proficient';
  return 'Advanced';
}

function buildRoundSummary(
  round: number,
  subject: QuizSubject,
  difficulty: DifficultyLevel,
  questions: MCQ[],
  answers: Record<string, OptionKey | null>
): RoundSummary {
  const reviews: QuestionReview[] = questions.map((q) => {
    const studentOption = answers[q.id] ?? null;
    const isCorrect = studentOption === q.correctOption;

    return {
      questionId: q.id,
      concept: q.concept,
      correctOption: q.correctOption,
      correctExplanation: q.options[q.correctOption],
      studentOption,
      isCorrect,
      misconception: isCorrect ? null : q.misconception,
      reinforcementTip: q.reinforcementTip,
    };
  });

  const score = reviews.filter((r) => r.isCorrect).length;
  const accuracy = (score / QUESTIONS_PER_ROUND) * 100;

  const conceptCounts: Record<string, { correct: number; total: number }> = {};
  reviews.forEach((r) => {
    if (!conceptCounts[r.concept]) {
      conceptCounts[r.concept] = { correct: 0, total: 0 };
    }
    conceptCounts[r.concept].total += 1;
    if (r.isCorrect) conceptCounts[r.concept].correct += 1;
  });

  let weakestConcept: string | null = null;
  let strongestConcept: string | null = null;
  let minAccuracy = Infinity;
  let maxAccuracy = -Infinity;

  Object.entries(conceptCounts).forEach(([concept, stats]) => {
    const conceptAccuracy = (stats.correct / stats.total) * 100;
    if (conceptAccuracy < minAccuracy) {
      minAccuracy = conceptAccuracy;
      weakestConcept = concept;
    }
    if (conceptAccuracy > maxAccuracy) {
      maxAccuracy = conceptAccuracy;
      strongestConcept = concept;
    }
  });

  const masterySignal = getMasterySignal(score);
  const { adjustment, next } = getNextDifficulty(difficulty, score);

  let rationale: string;
  if (adjustment === 'Increase') {
    rationale =
      score >= 5
        ? 'High accuracy this round signals strong mastery, so the next round steps up in difficulty.'
        : 'You answered most questions correctly, so the system is gently increasing challenge.';
  } else if (adjustment === 'Decrease') {
    rationale =
      'This round was challenging; reducing difficulty slightly helps focus on consolidating core ideas.';
  } else {
    rationale =
      'Mixed performance suggests the current difficulty is a good fit, so the level is maintained.';
  }

  return {
    round,
    subject,
    difficulty,
    score,
    accuracy,
    weakestConcept,
    strongestConcept,
    masterySignal,
    difficultyAdjustment: adjustment,
    nextDifficulty: next,
    rationale,
    questionReviews: reviews,
  };
}

function AdaptiveQuiz({ subject }: { subject: QuizSubject }) {
  const [round, setRound] = useState(1);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('L2');
  const [currentQuestions, setCurrentQuestions] = useState<MCQ[]>([]);
  const [answers, setAnswers] = useState<Record<string, OptionKey | null>>({});
  const [currentSummary, setCurrentSummary] = useState<RoundSummary | null>(null);
  const [_allSummaries, setAllSummaries] = useState<RoundSummary[]>([]);
  const [roundSubmitted, setRoundSubmitted] = useState(false);
  /** IDs used in previous completed sessions (from localStorage). No database. */
  const [usedIdsFromPreviousSessions, setUsedIdsFromPreviousSessions] = useState<string[]>([]);
  /** IDs used in the current session so far (this round + previous rounds). */
  const [usedIdsInCurrentSession, setUsedIdsInCurrentSession] = useState<string[]>([]);
  const [sessionReady, setSessionReady] = useState(false);
  const hasSavedSessionRef = useRef(false);

  const subjectLabel = subject === 'math' ? 'Math' : 'AI / Machine Learning';

  const currentDifficultyLabel = useMemo(
    () => `${difficulty} ? ${DIFFICULTY_LABELS[difficulty]}`,
    [difficulty]
  );

  // Load used question IDs from localStorage and init first round. No database ? questions stay in code.
  useEffect(() => {
    const usedFromStorage = loadUsedQuestionIds(subject);
    setUsedIdsFromPreviousSessions(Array.from(usedFromStorage));
    const excluded = new Set(usedFromStorage);
    const initial = getQuestionsForRound(subject, 'L2', excluded);
    setRound(1);
    setDifficulty('L2');
    setAnswers({});
    setCurrentSummary(null);
    setAllSummaries([]);
    setRoundSubmitted(false);
    setCurrentQuestions(initial);
    setUsedIdsInCurrentSession(initial.map((q) => q.id));
    setSessionReady(true);
    hasSavedSessionRef.current = false;
  }, [subject]);

  const handleOptionChange = (questionId: string, option: OptionKey) => {
    if (roundSubmitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleSubmitRound = () => {
    if (roundSubmitted) return;
    const summary = buildRoundSummary(round, subject, difficulty, currentQuestions, answers);
    setCurrentSummary(summary);
    setAllSummaries((prev) => [...prev, summary]);
    setRoundSubmitted(true);
  };

  const handleNextRound = () => {
    if (!currentSummary) return;
    if (round >= MAX_ROUNDS) return;

    const nextDifficulty = currentSummary.nextDifficulty;
    const excluded = new Set([
      ...usedIdsFromPreviousSessions,
      ...usedIdsInCurrentSession,
    ]);
    const nextQuestions = getQuestionsForRound(subject, nextDifficulty, excluded);

    setRound((r) => r + 1);
    setDifficulty(nextDifficulty);
    setCurrentQuestions(nextQuestions);
    setUsedIdsInCurrentSession((prev) => [...prev, ...nextQuestions.map((q) => q.id)]);
    setAnswers({});
    setCurrentSummary(null);
    setRoundSubmitted(false);
  };

  const isSessionComplete = round > MAX_ROUNDS || (round === MAX_ROUNDS && roundSubmitted);

  // When session completes, persist used question IDs to localStorage once so next session gets a new set. No database.
  useEffect(() => {
    if (
      !isSessionComplete ||
      !sessionReady ||
      usedIdsInCurrentSession.length === 0 ||
      hasSavedSessionRef.current
    )
      return;
    hasSavedSessionRef.current = true;
    saveUsedQuestionIds(subject, usedIdsInCurrentSession);
  }, [isSessionComplete, subject, sessionReady, usedIdsInCurrentSession]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{subjectLabel} Session</p>
          <p className="text-lg font-semibold">
            Round {Math.min(round, MAX_ROUNDS)} of {MAX_ROUNDS}
          </p>
          <p className="text-sm text-muted-foreground">Difficulty tier: {currentDifficultyLabel}</p>
        </div>
        <div className="text-sm text-muted-foreground">
          5 questions per round ? Adaptive difficulty based on your performance
        </div>
      </div>

      {!sessionReady && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading questions?
          </CardContent>
        </Card>
      )}
      {sessionReady && !isSessionComplete && (
        <Card>
          <CardHeader>
            <CardTitle>Round {round} Questions</CardTitle>
            <CardDescription>
              Answer all 5 MCQs. Difficulty will adjust after you submit this round.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentQuestions.map((q, index) => {
              const selected = answers[q.id] ?? null;
              return (
                <div key={q.id} className="space-y-3 border-b last:border-none pb-4 last:pb-0">
                  <p className="font-medium">
                    <span className="mr-2 font-semibold">
                      Q{index + 1}.
                    </span>
                    <MathText>{q.question}</MathText>
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(Object.keys(q.options) as OptionKey[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleOptionChange(q.id, key)}
                        className={`flex items-start gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                          selected === key
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted/50'
                        }`}
                      >
                        <span className="mt-0.5 font-semibold">{key})</span>
                        <MathText>{q.options[key]}</MathText>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="flex justify-end">
              <Button
                onClick={handleSubmitRound}
                disabled={
                  roundSubmitted ||
                  currentQuestions.some((q) => (answers[q.id] ?? null) === null)
                }
              >
                {roundSubmitted ? 'Round Submitted' : 'Submit Round'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentSummary && (
        <Card>
          <CardHeader>
            <CardTitle>Round {currentSummary.round} Analysis</CardTitle>
            <CardDescription>
              Structured feedback for each question plus a performance summary.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            <div className="space-y-4">
              {currentSummary.questionReviews.map((r, idx) => (
                <div key={r.questionId} className="rounded-md border bg-muted/40 p-3">
                  <p className="font-semibold mb-1">
                    Question {idx + 1} Review
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Concept Tested: <span className="font-medium">{r.concept}</span>
                  </p>
                  <p className="mb-1">
                    <span className="font-semibold">Correct Answer:</span>{' '}
                    {r.correctOption}) <MathText>{r.correctExplanation}</MathText>
                  </p>
                  <p className="mb-1">
                    <span className="font-semibold">Student&apos;s Answer:</span>{' '}
                    {r.studentOption ? (
                      <>
                        {r.studentOption}){' '}
                        <MathText>
                          {currentQuestions.find((q) => q.id === r.questionId)?.options[
                            r.studentOption
                          ] ?? ''}
                        </MathText>
                      </>
                    ) : (
                      'No answer selected'
                    )}{' ? '}
                    <span className={r.isCorrect ? 'text-green-700' : 'text-red-700'}>
                      {r.isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  </p>
                  {!r.isCorrect && r.misconception && (
                    <p className="mb-1">
                      <span className="font-semibold">Misconception Detected:</span> <MathText>{r.misconception}</MathText>
                    </p>
                  )}
                  <p>
                    <span className="font-semibold">Reinforcement Tip:</span> <MathText>{r.reinforcementTip}</MathText>
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-md border bg-background p-3">
              <p className="font-semibold mb-1">
                Round {currentSummary.round} Performance Summary
              </p>
              <p>
                <span className="font-semibold">Score:</span> {currentSummary.score}/
                {QUESTIONS_PER_ROUND}
              </p>
              <p>
                <span className="font-semibold">Accuracy:</span>{' '}
                {currentSummary.accuracy.toFixed(0)}%
              </p>
              <p>
                <span className="font-semibold">Weakest Concept:</span>{' '}
                {currentSummary.weakestConcept ?? '?'}
              </p>
              <p>
                <span className="font-semibold">Strongest Concept:</span>{' '}
                {currentSummary.strongestConcept ?? '?'}
              </p>
              <p>
                <span className="font-semibold">Overall Mastery Signal:</span>{' '}
                {currentSummary.masterySignal}
              </p>
              <p>
                <span className="font-semibold">Difficulty Adjustment for Next Round:</span>{' '}
                {currentSummary.difficultyAdjustment} to level {currentSummary.nextDifficulty}
              </p>
              <p className="mt-1 text-muted-foreground">{currentSummary.rationale}</p>
            </div>

            {round < MAX_ROUNDS && (
              <div className="flex justify-end">
                <Button onClick={handleNextRound}>Start Next Round</Button>
              </div>
            )}
            {round === MAX_ROUNDS && (
              <div className="flex justify-end">
                <Button disabled>Session Complete</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AdaptiveQuizzesPage() {
  const [tab, setTab] = useState<QuizSubject>('math');

  return (
    <AppShell
      title="Adaptive Quiz Engine"
      subtitle="5-round, Bloom-aligned adaptive sessions for Math and AI"
    >
      <div className="space-y-6">
        <div className="inline-flex rounded-md border bg-muted/40 p-1 text-sm">
          <button
            type="button"
            onClick={() => setTab('math')}
            className={`rounded px-3 py-1.5 ${
              tab === 'math' ? 'bg-background font-semibold shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Math Quiz
          </button>
          <button
            type="button"
            onClick={() => setTab('ai')}
            className={`rounded px-3 py-1.5 ${
              tab === 'ai' ? 'bg-background font-semibold shadow-sm' : 'text-muted-foreground'
            }`}
          >
            AI / ML Quiz
          </button>
        </div>

        <AdaptiveQuiz subject={tab} />
      </div>
    </AppShell>
  );
}

