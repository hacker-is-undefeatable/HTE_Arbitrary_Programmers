import { Checkpoint } from '@/types/flight';

type QuizLike = {
  question: string;
};

type FlashcardLike = {
  front: string;
};

export function buildLectureCheckpoints(
  summary: string,
  quizzes: QuizLike[],
  flashcards: FlashcardLike[],
): Checkpoint[] {
  const summaryStops: Checkpoint[] = (summary || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#') && !line.startsWith('- '))
    .slice(0, 4)
    .map((line, index) => ({
      id: `summary-${index}`,
      name: line,
      type: 'topic' as const,
    }));

  const quizStops: Checkpoint[] = (quizzes || []).slice(0, 4).map((quiz, index) => ({
    id: `quiz-${index}`,
    name: quiz.question,
    type: 'topic' as const,
  }));

  const flashcardStops: Checkpoint[] = (flashcards || []).slice(0, 4).map((flashcard, index) => ({
    id: `flash-${index}`,
    name: flashcard.front,
    type: 'topic' as const,
  }));

  return [
    {
      id: 'summary-chapter',
      name: 'Summary Route',
      type: 'chapter' as const,
      children: summaryStops,
    },
    {
      id: 'quiz-chapter',
      name: 'Quiz Route',
      type: 'chapter' as const,
      children: quizStops,
    },
    {
      id: 'flashcard-chapter',
      name: 'Flashcard Route',
      type: 'chapter' as const,
      children: flashcardStops,
    },
  ].filter((checkpoint) => (checkpoint.children?.length || 0) > 0);
}
