import { AIExplanation, ExplanationStyle, UserRole } from '@/types';
import { AzureOpenAI } from 'openai';

// Initialize client lazily to avoid errors during build
let openaiClient: AzureOpenAI | null = null;

function getOpenAIClient(): AzureOpenAI {
  if (!openaiClient) {
    openaiClient = new AzureOpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-10-21',
      baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o-mini'}`,
    });
  }
  return openaiClient;
}

/**
 * Generate mistake-aware explanation using OpenAI
 * Explains why the student's answer is incorrect and identifies misconceptions
 */
export const generateMistakeExplanation = async (
  question: string,
  userAnswer: string,
  correctAnswer: string,
  topic: string,
  explanationStyle: ExplanationStyle,
  age: number | null
): Promise<AIExplanation> => {
  const stylePrompt = getStylePrompt(explanationStyle);
  const ageAdaptation = getAgeAdaptation(age);

  const prompt = `You are an expert tutor explaining why a student's answer is incorrect.

Topic: ${topic}
Student Age: ${age ?? 'Not provided'}

Question: ${question}
Student's Answer: ${userAnswer}
Correct Answer: ${correctAnswer}

${stylePrompt}
${ageAdaptation}

Please provide:
1. A clear explanation of why the student's answer is incorrect
2. Identify the likely misconception causing this error
3. Provide a step-by-step correction
4. Generate a follow-up practice question to reinforce learning

Format your response as JSON with these exact keys:
{
  "explanation": "...",
  "misconception": "...",
  "follow_up_question": "..."
}`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    return {
      explanation: parsed.explanation || '',
      misconception: parsed.misconception || '',
      follow_up_question: parsed.follow_up_question || '',
    };
  } catch (error) {
    console.error('Error generating AI explanation:', error);
    return {
      explanation: 'Unable to generate explanation at this time.',
      misconception: 'Please consult your study materials.',
      follow_up_question: 'Try the question again!',
    };
  }
};

/**
 * Generate adaptive quiz questions based on difficulty
 */
export const generateAdaptiveQuestions = async (
  subject: string,
  topic: string,
  difficulty: 'easy' | 'medium' | 'hard',
  count: number = 1
): Promise<string[]> => {
  const difficultyPrompt = {
    easy: 'Create a basic, foundational question',
    medium: 'Create a moderately challenging question that requires some application of concepts',
    hard: 'Create a challenging question that requires deep understanding and complex reasoning',
  };

  const prompt = `Generate ${count} high-quality education quiz question(s) for a student learning ${subject}.

Topic: ${topic}
Difficulty Level: ${difficulty}
Requirement: ${difficultyPrompt[difficulty]}

Format: For each question, provide a JSON object with:
{
  "question": "...",
  "options": ["A", "B", "C", "D"],
  "correct_answer": "A",
  "explanation": "..."
}

Generate exactly ${count} question(s) in valid JSON format.`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content || '';
    // Extract JSON from response
    const jsonMatches = content.match(/\{[\s\S]*?\}/g) || [];
    return jsonMatches.slice(0, count);
  } catch (error) {
    console.error('Error generating adaptive questions:', error);
    return [];
  }
};

/**
 * Generate roadmap for learning project
 */
export const generateLearningRoadmap = async (
  subject: string,
  userRole: UserRole,
  learningGoal: string
): Promise<string[]> => {
  const prompt = `Create a personalized learning roadmap for a ${userRole} student learning ${subject}.

Learning Goal: ${learningGoal}

Please provide a structured, progressive list of topics/milestones they should master in order. 
Each item should be specific and achievable.

Format as a JSON array of strings:
["Topic 1", "Topic 2", "Topic 3", ...]

Provide 8-10 key topics in logical order.`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || '[]';
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error generating learning roadmap:', error);
    return [];
  }
};

/**
 * Summarize a lecture transcript and supporting notes using Azure OpenAI
 */
export const summarizeLectureFromTranscript = async (
  lectureTitle: string,
  transcript: string,
  notes?: string
): Promise<string> => {
  const transcriptSnippet = transcript.length > 18000 ? `${transcript.slice(0, 18000)}...` : transcript;
  const notesSnippet = notes
    ? notes.length > 6000
      ? `${notes.slice(0, 6000)}...`
      : notes
    : '';

  const prompt = `You are an expert teaching assistant. Create a concise, high-quality lecture summary.

Lecture Title: ${lectureTitle}

Transcript:
${transcriptSnippet || 'No transcript provided.'}

Supporting Notes:
${notesSnippet || 'No supporting notes provided.'}

Return a markdown summary with:
1) Core Concepts (bullet list)
2) Key Explanations (short paragraph)
3) Important Terms (bullet list)
4) Actionable Study Checklist (5 bullets)
5) 3 Follow-up Questions for revision`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 900,
    });

    return response.choices[0]?.message?.content?.trim() || 'Unable to generate summary.';
  } catch (error) {
    console.error('Error generating lecture summary:', error);
    return 'Unable to generate summary at this time.';
  }
};

export interface GeneratedLectureQuizItem {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

export interface GeneratedFlashcardItem {
  front: string;
  back: string;
}

function parseJsonArrayResponse(content: string): unknown[] {
  const normalized = content.trim();
  if (!normalized) return [];

  const fencedMatch = normalized.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const jsonCandidate = fencedMatch?.[1]?.trim() || normalized;

  try {
    const parsed = JSON.parse(jsonCandidate);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const arrayStart = jsonCandidate.indexOf('[');
    const arrayEnd = jsonCandidate.lastIndexOf(']');

    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      try {
        const parsed = JSON.parse(jsonCandidate.slice(arrayStart, arrayEnd + 1));
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    return [];
  }
}

export const generateLectureQuizzes = async (
  lectureTitle: string,
  transcript: string,
  summary: string,
  count: number = 5
): Promise<GeneratedLectureQuizItem[]> => {
  const transcriptSnippet = transcript.length > 10000 ? `${transcript.slice(0, 10000)}...` : transcript;
  const summarySnippet = summary.length > 5000 ? `${summary.slice(0, 5000)}...` : summary;

  const prompt = `Generate ${count} multiple-choice quiz questions from this lecture.

Lecture Title: ${lectureTitle}

Transcript:
${transcriptSnippet}

Summary:
${summarySnippet}

Return ONLY valid JSON as an array of objects:
[{
  "question":"...",
  "options":["A","B","C","D"],
  "correct_answer":"...",
  "explanation":"..."
}]`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 1200,
    });

    const content = response.choices[0]?.message?.content || '[]';
    const parsed = parseJsonArrayResponse(content);
    type QuizItem = { question?: unknown; options?: unknown; correct_answer?: unknown; explanation?: unknown };
    return (parsed as QuizItem[])
      .filter((item) => item?.question && Array.isArray(item?.options) && item?.correct_answer)
      .map((item) => ({
        question: String(item.question),
        options: (item.options as unknown[]).map((opt: unknown) => String(opt)).slice(0, 6),
        correct_answer: String(item.correct_answer),
        explanation: String(item.explanation || ''),
      }));
  } catch (error) {
    console.error('Error generating lecture quizzes:', error);
    return [];
  }
};

export const generateLectureFlashcards = async (
  lectureTitle: string,
  transcript: string,
  summary: string,
  count: number = 8
): Promise<GeneratedFlashcardItem[]> => {
  const transcriptSnippet = transcript.length > 10000 ? `${transcript.slice(0, 10000)}...` : transcript;
  const summarySnippet = summary.length > 5000 ? `${summary.slice(0, 5000)}...` : summary;

  const prompt = `Generate ${count} study flashcards from this lecture.

Lecture Title: ${lectureTitle}

Transcript:
${transcriptSnippet}

Summary:
${summarySnippet}

Return ONLY valid JSON as an array:
[{"front":"...","back":"..."}]`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content || '[]';
    const parsed = parseJsonArrayResponse(content);

    return (parsed as Array<{ front?: unknown; back?: unknown }>)
      .filter((item) => item?.front && item?.back)
      .map((item) => ({
        front: String(item.front),
        back: String(item.back),
      }));
  } catch (error) {
    console.error('Error generating lecture flashcards:', error);
    return [];
  }
};

// Helper functions

/**
 * Get style-specific prompt for AI
 */
function getStylePrompt(style: ExplanationStyle): string {
  const stylePrompts = {
    'step-by-step': 'Provide detailed step-by-step instructions.',
    conceptual: 'Focus on the underlying concepts and principles.',
    visual: 'Describe how to visualize or diagram this concept.',
  };
  return stylePrompts[style];
}

/**
 * Get age-based adaptation for prompts
 */
function getAgeAdaptation(age: number | null): string {
  if (!age || Number.isNaN(age) || age <= 0) {
    return 'Use clear, accessible language suitable for a broad student audience.';
  }

  if (age <= 12) {
    return 'Use very simple language, short sentences, and concrete examples suitable for children.';
  }

  if (age <= 17) {
    return 'Use student-friendly language with relatable examples for teenagers.';
  }

  if (age <= 22) {
    return 'Use concise but slightly technical language suitable for young adults and early college students.';
  }

  return 'Use professional, concise language with clear reasoning and practical examples.';
}
