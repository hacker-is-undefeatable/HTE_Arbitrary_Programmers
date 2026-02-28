import { QuizQuestion, CodingChallenge } from '@/types';

/**
 * Diagnostic Math Questions for High School Students
 */
export const HIGH_SCHOOL_DIAGNOSTIC_MATH: QuizQuestion[] = [
  {
    id: 'hs-math-1',
    subject: 'math',
    topic: 'algebra',
    difficulty: 'easy',
    question: 'Solve for x: 2x + 5 = 15',
    options: ['x = 5', 'x = 10', 'x = 7.5', 'x = 3'],
    correct_answer: 'x = 5',
    explanation: '2x + 5 = 15 → 2x = 10 → x = 5',
  },
  {
    id: 'hs-math-2',
    subject: 'math',
    topic: 'quadratic-equations',
    difficulty: 'easy',
    question: 'What is the discriminant of x² + 4x + 4 = 0?',
    options: ['0', '4', '16', '-4'],
    correct_answer: '0',
    explanation: 'Using b² - 4ac where a=1, b=4, c=4: 16 - 16 = 0',
  },
  {
    id: 'hs-math-3',
    subject: 'math',
    topic: 'geometry',
    difficulty: 'easy',
    question: 'What is the area of a circle with radius 3?',
    options: ['9π', '6π', '3π', '12π'],
    correct_answer: '9π',
    explanation: 'A = πr² = π × 3² = 9π',
  },
  {
    id: 'hs-math-4',
    subject: 'math',
    topic: 'trigonometry',
    difficulty: 'medium',
    question: 'What is sin(90°)?',
    options: ['0', '1', '-1', 'undefined'],
    correct_answer: '1',
    explanation: 'sin(90°) = 1 (opposite over hypotenuse when angle is 90°)',
  },
  {
    id: 'hs-math-5',
    subject: 'math',
    topic: 'word-problems',
    difficulty: 'medium',
    question:
      'If a train travels 60 mph for 2 hours, then 40 mph for 3 hours, what is the average speed?',
    options: ['50 mph', '48 mph', '45 mph', '55 mph'],
    correct_answer: '48 mph',
    explanation:
      'Total distance = 60×2 + 40×3 = 120 + 120 = 240 miles. Total time = 5 hours. Average = 240/5 = 48 mph',
  },
];

/**
 * Diagnostic Python Questions for College Students
 */
export const COLLEGE_DIAGNOSTIC_PYTHON: QuizQuestion[] = [
  {
    id: 'col-py-1',
    subject: 'python',
    topic: 'basic-syntax',
    difficulty: 'easy',
    question: 'What is the output of print(2 ** 3)?',
    options: ['6', '8', '9', 'Error'],
    correct_answer: '8',
    explanation: '** is the exponentiation operator, so 2 ** 3 = 8',
  },
  {
    id: 'col-py-2',
    subject: 'python',
    topic: 'data-structures',
    difficulty: 'easy',
    question: 'What does len([1, 2, 3, 4]) return?',
    options: ['3', '4', '5', 'Error'],
    correct_answer: '4',
    explanation: 'len() returns the number of elements in a list',
  },
  {
    id: 'col-py-3',
    subject: 'python',
    topic: 'functions',
    difficulty: 'medium',
    question: 'What is a lambda function in Python?',
    options: [
      'An anonymous function defined with lambda keyword',
      'A function that returns another function',
      'A built-in Python function',
      'A function with no parameters',
    ],
    correct_answer: 'An anonymous function defined with lambda keyword',
    explanation: 'lambda creates a small anonymous function: lambda x: x * 2',
  },
  {
    id: 'col-py-4',
    subject: 'python',
    topic: 'object-oriented-programming',
    difficulty: 'medium',
    question: 'In Python, what keyword is used to create a class?',
    options: ['function', 'class', 'object', 'def'],
    correct_answer: 'class',
    explanation: 'class is used to define a new class in Python',
  },
  {
    id: 'col-py-5',
    subject: 'python',
    topic: 'machine-learning-basics',
    difficulty: 'medium',
    question: 'What does normalization do in machine learning?',
    options: [
      'Scales features to a standard range (e.g., 0-1)',
      'Removes outliers from data',
      'Increases model accuracy',
      'Converts categorical data to numerical',
    ],
    correct_answer: 'Scales features to a standard range (e.g., 0-1)',
    explanation: 'Normalization scales feature values to a common range for fair comparison',
  },
];

/**
 * Sample Math Quiz Questions for Adaptive Learning
 */
export const MATH_QUIZ_BANK: { [difficulty: string]: QuizQuestion[] } = {
  easy: [
    {
      id: 'math-easy-1',
      subject: 'math',
      topic: 'algebra',
      difficulty: 'easy',
      question: 'What is 5 + 3?',
      options: ['7', '8', '9', '10'],
      correct_answer: '8',
      explanation: '5 + 3 = 8',
    },
    {
      id: 'math-easy-2',
      subject: 'math',
      topic: 'algebra',
      difficulty: 'easy',
      question: 'Solve: x - 4 = 2',
      options: ['x = 4', 'x = 6', 'x = 8', 'x = 2'],
      correct_answer: 'x = 6',
      explanation: 'x - 4 = 2 → x = 2 + 4 → x = 6',
    },
  ],
  medium: [
    {
      id: 'math-med-1',
      subject: 'math',
      topic: 'algebra',
      difficulty: 'medium',
      question: 'Solve: 3x + 2 = 14',
      options: ['x = 3', 'x = 4', 'x = 5', 'x = 6'],
      correct_answer: 'x = 4',
      explanation: '3x + 2 = 14 → 3x = 12 → x = 4',
    },
  ],
  hard: [
    {
      id: 'math-hard-1',
      subject: 'math',
      topic: 'algebra',
      difficulty: 'hard',
      question: 'Solve the system: x + y = 5 and 2x - y = 4',
      options: ['x = 3, y = 2', 'x = 2, y = 3', 'x = 4, y = 1', 'x = 1, y = 4'],
      correct_answer: 'x = 3, y = 2',
      explanation: 'Adding equations: 3x = 9 → x = 3, then y = 5 - 3 = 2',
    },
  ],
};

/**
 * Sample Python Coding Challenges
 */
export const PYTHON_CHALLENGES: CodingChallenge[] = [
  {
    id: 'py-challenge-1',
    title: 'Simple Addition Function',
    description: 'Write a function that takes two numbers and returns their sum.',
    initial_code: `def add(a, b):
    # Your code here
    pass`,
    test_cases: ['add(2, 3) == 5', 'add(-1, 1) == 0', 'add(0, 0) == 0'],
    difficulty: 'easy',
    hints: [
      'You need to return the sum of a and b',
      'Use the + operator',
      'The function signature is already provided',
    ],
  },
  {
    id: 'py-challenge-2',
    title: 'Reverse a String',
    description: 'Write a function that reverses a string.',
    initial_code: `def reverse_string(s):
    # Your code here
    pass`,
    test_cases: ['reverse_string("hello") == "olleh"', 'reverse_string("") == ""'],
    difficulty: 'easy',
    hints: [
      'Python strings can be sliced with [::-1]',
      'You can also loop through and build a new string',
    ],
  },
  {
    id: 'py-challenge-3',
    title: 'Count Vowels',
    description: 'Write a function that counts the number of vowels in a string.',
    initial_code: `def count_vowels(s):
    # Your code here
    pass`,
    test_cases: ['count_vowels("hello") == 2', 'count_vowels("aeiou") == 5'],
    difficulty: 'medium',
    hints: ['Loop through each character', 'Check if the character is in "aeiouAEIOU"'],
  },
];

/**
 * Topic definitions for each subject
 */
export const TOPICS_BY_SUBJECT = {
  math: {
    'high_school': [
      'algebra',
      'quadratic-equations',
      'geometry',
      'trigonometry',
      'word-problems',
      'exponents',
      'fractions',
      'percentages',
    ],
    'college': [
      'calculus-limits',
      'derivatives',
      'integrals',
      'linear-algebra',
      'probability',
      'statistics',
      'differential-equations',
    ],
  },
  python: {
    'high_school': [
      'basic-syntax',
      'variables-types',
      'lists-strings',
      'conditionals',
      'loops',
      'functions',
    ],
    'college': [
      'basic-syntax',
      'data-structures',
      'functions',
      'object-oriented-programming',
      'machine-learning-basics',
      'data-analysis',
      'web-development-basics',
    ],
  },
};

/**
 * Get quiz questions for diagnostic
 */
export const getDiagnosticQuestions = (
  subject: string,
  role: string
): QuizQuestion[] => {
  if (subject === 'math' && role === 'high_school') {
    return HIGH_SCHOOL_DIAGNOSTIC_MATH;
  }
  if (subject === 'python' && role === 'college') {
    return COLLEGE_DIAGNOSTIC_PYTHON;
  }
  return [];
};
