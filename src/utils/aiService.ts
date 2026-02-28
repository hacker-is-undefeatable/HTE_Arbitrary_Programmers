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
  masteryLevel: number
): Promise<AIExplanation> => {
  const stylePrompt = getStylePrompt(explanationStyle);
  const masteryAdaptation = getMasteryAdaptation(masteryLevel);

  const prompt = `You are an expert tutor explaining why a student's answer is incorrect.

Topic: ${topic}
Student's Mastery Level: ${masteryLevel}%

Question: ${question}
Student's Answer: ${userAnswer}
Correct Answer: ${correctAnswer}

${stylePrompt}
${masteryAdaptation}

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
 * Generate Python debugging explanation
 */
export const generatePythonDebugExplanation = async (
  code: string,
  error: string,
  explanationStyle: ExplanationStyle
): Promise<{
  explanation: string;
  hint: string;
  suggested_improvement: string;
}> => {
  const stylePrompt = getStylePrompt(explanationStyle);

  const prompt = `You are an expert Python tutor. A student's code has an error and needs help understanding it.

Code:
\`\`\`python
${code}
\`\`\`

Error Message:
${error}

${stylePrompt}

Please provide:
1. A clear explanation of what went wrong
2. A helpful hint to guide the student
3. A suggested improvement to the code

Format your response as JSON:
{
  "explanation": "...",
  "hint": "...",
  "suggested_improvement": "..."
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
      max_tokens: 600,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    return {
      explanation: parsed.explanation || '',
      hint: parsed.hint || '',
      suggested_improvement: parsed.suggested_improvement || '',
    };
  } catch (error) {
    console.error('Error generating Python debug explanation:', error);
    return {
      explanation: 'Unable to generate explanation at this time.',
      hint: 'Check the error message and review the Python documentation.',
      suggested_improvement: 'Review your code logic.',
    };
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

    return parsed
      .filter((item): item is Record<string, unknown> => 
        item !== null && typeof item === 'object' && 
        'question' in item && Array.isArray((item as Record<string, unknown>).options) && 'correct_answer' in item
      )
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

    return parsed
      .filter((item): item is Record<string, unknown> => 
        item !== null && typeof item === 'object' && 'front' in item && 'back' in item
      )
      .map((item) => ({
        front: String(item.front),
        back: String(item.back),
      }));
  } catch (error) {
    console.error('Error generating lecture flashcards:', error);
    return [];
  }
};

/**
 * Process a lecture image and extract text with LaTeX equations
 */
export const extractLecturePageContent = async (
  imageBase64: string,
  pageNum: number
): Promise<string> => {
  const prompt = `You are an expert at extracting text from lecture slides and documents.
Extract ALL text from this image exactly as it appears.

For mathematical equations and formulas:
- Write them in LaTeX format enclosed in $ for inline or $$ for display equations
- Example: $E = mc^2$ or $$F = \\frac{1}{4\\pi\\epsilon_0} \\frac{|q_1 q_2|}{r^2}$$

Preserve the document structure (headings, bullet points, tables, etc.).
This is page ${pageNum}.`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${imageBase64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error(`Error extracting page ${pageNum}:`, error);
    return `[Error extracting page ${pageNum}]`;
  }
};

export interface EnhancedSection {
  title: string;
  content: string;
  type: 'text' | 'equation' | 'table' | 'list' | 'example' | 'question' | 'concept';
  realWorldExample?: {
    title: string;
    description: string;
    funFact?: string;
  };
  derivation?: {
    available: boolean;
    teaser?: string;
  };
  whyItMatters?: string;
  explorationHook?: string;
}

export interface EnhancedLectureData {
  title: string;
  course?: string;
  subjectType: 'stem' | 'humanities' | 'business' | 'other';
  openingHook: string;
  sections: EnhancedSection[];
  keyTakeaways: string[];
}

/**
 * Fix unescaped backslashes in JSON strings (common issue with LaTeX in AI output)
 * Converts \frac to \\frac, \alpha to \\alpha, etc.
 */
function fixJsonEscapes(jsonStr: string): string {
  // First, try to parse as-is
  try {
    JSON.parse(jsonStr);
    return jsonStr; // Already valid
  } catch {
    // Need to fix escapes
  }

  // Replace common LaTeX backslash commands with escaped versions
  // This regex finds backslashes NOT followed by valid JSON escapes or already escaped
  let fixed = jsonStr;
  
  // In JSON strings, valid escapes are: \" \\ \/ \b \f \n \r \t \uXXXX
  // Everything else needs to have the backslash escaped
  
  // Strategy: Find all strings in the JSON and fix backslashes within them
  const stringPattern = /"(?:[^"\\]|\\.)*"/g;
  
  fixed = jsonStr.replace(stringPattern, (match) => {
    // Within this string, escape any backslash not followed by valid JSON escape chars
    let result = '';
    for (let i = 0; i < match.length; i++) {
      const c = match[i];
      if (c === '\\' && i + 1 < match.length) {
        const next = match[i + 1];
        // Valid JSON escapes
        if (['"', '\\', '/', 'b', 'f', 'n', 'r', 't'].includes(next)) {
          result += c + next;
          i++;
        } else if (next === 'u' && i + 5 < match.length && /^[0-9a-fA-F]{4}$/.test(match.slice(i + 2, i + 6))) {
          // Unicode escape \uXXXX
          result += match.slice(i, i + 6);
          i += 5;
        } else {
          // Invalid escape - escape the backslash itself
          result += '\\\\' + next;
          i++;
        }
      } else {
        result += c;
      }
    }
    return result;
  });
  
  return fixed;
}

/**
 * Extract a single top-level JSON object from AI response (handles markdown wrappers and nested braces)
 */
function extractJsonObject(content: string): string | null {
  const trimmed = content.trim();
  if (!trimmed) return null;

  // Strip markdown code block if present
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = codeBlockMatch ? codeBlockMatch[1].trim() : trimmed;

  const startIdx = candidate.indexOf('{');
  if (startIdx === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;
  let quoteChar = '';

  for (let i = startIdx; i < candidate.length; i++) {
    const c = candidate[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === '\\' && inString) {
      escape = true;
      continue;
    }
    if (!inString) {
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          const extracted = candidate.slice(startIdx, i + 1);
          // Fix escape sequences before returning
          return fixJsonEscapes(extracted);
        }
      } else if (c === '"' || c === "'") {
        inString = true;
        quoteChar = c;
      }
      continue;
    }
    if (c === quoteChar) inString = false;
  }
  return null;
}

/**
 * Fallback: split raw content into sections when AI returns no/empty sections
 */
function rawContentToSections(rawContent: string): EnhancedSection[] {
  const sections: EnhancedSection[] = [];
  const trimmed = rawContent.trim();
  if (!trimmed || trimmed.length < 50) return sections;

  // Split by "--- Page N ---" first (common in OCR output)
  const pageMarker = /---\s*Page\s+\d+\s*---\s*\n?/gi;
  const pageBlocks = trimmed.split(pageMarker).map(b => b.trim()).filter(Boolean);
  const hasPageMarkers = pageBlocks.length > 1 || (pageBlocks.length === 1 && trimmed.match(pageMarker));

  if (hasPageMarkers && pageBlocks.length > 0) {
    pageBlocks.forEach((block, idx) => {
      const text = block.replace(/^Here is the extracted text[^\n]*\n?/i, '').replace(/^---\s*\n?/g, '').trim();
      if (text.length < 15) return;
      const firstBold = text.match(/\*\*([^*]+)\*\*/);
      const firstLine = firstBold ? firstBold[1].trim() : text.split('\n')[0]?.replace(/^#+\s*|\*+/g, '').trim() || `Page ${idx + 1}`;
      sections.push({
        title: firstLine.slice(0, 80) || `Section ${idx + 1}`,
        content: text,
        type: 'text',
      });
    });
    if (sections.length > 0) return sections;
  }

  // Otherwise split by bold headers (**...** on own line or after newline)
  const parts = trimmed.split(/(?=^\s*\*\*[^*]+\*\*)/m);
  for (const part of parts) {
    const cleaned = part.trim();
    if (cleaned.length < 30) continue;
    const headerMatch = cleaned.match(/^\*\*([^*]+)\*\*/);
    const title = headerMatch ? headerMatch[1].trim().slice(0, 80) : 'Section';
    const content = headerMatch ? cleaned.slice(headerMatch[0].length).trim() : cleaned;
    if (content.length < 10) continue;
    sections.push({ title, content, type: 'text' });
  }

  if (sections.length > 0) return sections;

  // Last resort: one section per large paragraph (double newline)
  const paragraphs = trimmed.split(/\n\s*\n/).filter(p => p.trim().length > 40);
  paragraphs.forEach((p, idx) => {
    const firstLine = p.split('\n')[0]?.replace(/^#+\s*|\*+/g, '').trim().slice(0, 60) || `Part ${idx + 1}`;
    sections.push({ title: firstLine, content: p.trim(), type: 'text' });
  });

  return sections;
}

/**
 * Process raw OCR text and transform it into clean, educational content.
 * - Fixes OCR errors and garbled text
 * - Fills in gaps using AI knowledge of the subject
 * - Explains concepts (not just restates them)
 * - Adds real-world examples and context
 * - Structures into logical sections
 */
export const structureLectureContent = async (
  rawContent: string,
  title: string
): Promise<EnhancedLectureData> => {
  const fallbackResult = (): EnhancedLectureData => {
    const sections = rawContentToSections(rawContent);
    return {
      title,
      subjectType: 'other',
      openingHook: sections.length > 0 ? 'Here’s what we extracted from your notes — explore section by section.' : '',
      sections,
      keyTakeaways: [],
    };
  };

  const prompt = `You are a university teaching assistant creating study materials. You will receive RAW TEXT extracted from lecture notes via OCR which may contain errors, garbled text, or incomplete sentences.

YOUR TASK:
1. UNDERSTAND the lecture topic by analyzing context clues
2. FIX OCR errors - correct misspellings, garbled text, truncated words
3. FILL IN GAPS - if information is clearly missing, use your subject knowledge to complete it
4. EXPLAIN concepts clearly - write as if teaching a student, not just restating facts
5. STRUCTURE into clear, logical sections
6. For STEM: ensure equations are properly formatted in LaTeX

RAW OCR TEXT:
${rawContent.slice(0, 14000)}

Title hint: ${title}

Return a JSON object with this structure:
{
  "title": "Descriptive academic title",
  "course": "Course code if identifiable",
  "subjectType": "stem|humanities|business|other",
  "openingHook": "A clear 1-2 sentence overview of what this lecture covers and its significance (professional tone, no emojis)",
  "sections": [
    {
      "title": "Section title",
      "content": "Cleaned, well-explained content. Fix OCR errors. Use LaTeX: $inline$ or $$block$$. Write in a clear academic style.",
      "type": "text|equation|concept|example|question",
      "realWorldExample": null,
      "derivation": { "available": true/false, "teaser": "Brief description of what understanding this derivation provides" },
      "whyItMatters": null,
      "explorationHook": null
    }
  ],
  "keyTakeaways": ["Concise point 1", "Concise point 2", "Concise point 3"]
}

STYLE GUIDELINES:
- Write in a clear, academic tone similar to Khan Academy or MIT OpenCourseWare
- NO emojis anywhere
- NO phrases like "fun fact", "did you know", "exciting", "amazing"
- Keep explanations substantive but concise
- For "realWorldExample": include ONLY 1-2 in the ENTIRE output, and they must be RECENT (2020-2025) real-world applications, innovations, or events NOT mentioned in the input text. Set to null for most sections.
- For "whyItMatters": include for only 1-2 KEY concepts in the entire lecture. Set to null for most sections.
- For "explorationHook": use sparingly (max 1-2 total). Set to null for most sections.
- For "derivation": set available=true for concepts that benefit from step-by-step explanation (formulas, theories, models, processes, frameworks)

TECHNICAL:
- Fix garbled equations using subject knowledge
- Create 3-6 sections covering main topics
- For LaTeX in JSON: use double backslashes (\\\\frac, \\\\alpha)
- Return ONLY valid JSON, no markdown fences`;

  try {
    console.log('Calling AI to process lecture content...');
    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 4500,
    });

    const content = response.choices[0]?.message?.content || '';
    console.log('AI response length:', content.length);
    
    if (!content || content.length < 50) {
      console.error('AI returned empty or very short response');
      return fallbackResult();
    }

    const jsonStr = extractJsonObject(content);
    if (!jsonStr) {
      console.error('Could not extract JSON from AI response. First 500 chars:', content.slice(0, 500));
      return fallbackResult();
    }

    try {
      const parsed = JSON.parse(jsonStr);
      const sections = Array.isArray(parsed.sections) ? parsed.sections : [];
      console.log('Parsed sections count:', sections.length);
      
      const validSections = sections
        .filter((s: unknown) => s && typeof s === 'object' && typeof (s as { title?: string }).title === 'string' && typeof (s as { content?: string }).content === 'string')
        .map((s: { title: string; content: string; type?: string }) => ({
          title: String(s.title),
          content: String(s.content),
          type: (s.type && ['text', 'equation', 'table', 'list', 'example', 'question', 'concept'].includes(s.type)) ? s.type : 'text' as const,
          realWorldExample: (s as EnhancedSection).realWorldExample,
          derivation: (s as EnhancedSection).derivation,
          whyItMatters: (s as EnhancedSection).whyItMatters,
          explorationHook: (s as EnhancedSection).explorationHook,
        }));

      console.log('Valid sections count:', validSections.length);

      if (validSections.length > 0) {
        return {
          title: parsed.title || title,
          course: parsed.course,
          subjectType: parsed.subjectType || 'other',
          openingHook: parsed.openingHook || '',
          sections: validSections,
          keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
        };
      } else {
        console.error('No valid sections found in parsed JSON');
      }
    } catch (parseErr) {
      console.error('JSON parse error in structureLectureContent:', parseErr);
      console.error('JSON string that failed to parse:', jsonStr.slice(0, 1000));
    }
    return fallbackResult();
  } catch (error) {
    console.error('Error structuring lecture content:', error);
    return fallbackResult();
  }
};

/**
 * Generate a derivation for a formula with citations
 * @param isRetry - if true, uses more detailed prompt and higher token limit
 */
export const generateDerivation = async (
  formula: string,
  context: string,
  isRetry = false
): Promise<{
  derivation: string;
  steps: Array<{ step: string; explanation: string }>;
  sources: Array<{ title: string; url?: string; description: string }>;
}> => {
  const emptyResult = { derivation: '', steps: [], sources: [] };
  
  // More detailed prompt for retries or when initial attempt fails
  const detailedPrompt = `Explain the derivation, proof, or reasoning behind this concept step by step.

CONCEPT: ${formula}

CONTEXT:
${context.slice(0, 400)}

Adapt your response to the subject:
- For STEM (math, physics, engineering, CS): show mathematical derivation with formulas
- For business/economics: show logical progression, models, or calculations
- For biology/medicine: show biological mechanisms or pathways
- For other subjects: show logical reasoning or causal chain

Return JSON:
{
  "derivation": "1-2 sentence overview of what we're explaining",
  "steps": [
    {"step": "Key concept or formula (use $LaTeX$ for math)", "explanation": "Why this step follows"}
  ],
  "sources": [
    {"title": "Relevant textbook or resource", "description": "Topic covered"}
  ]
}

Requirements:
- 3-5 clear steps showing the logical progression
- Use LaTeX ($...$) for any mathematical notation
- For non-math subjects, "step" can be a key concept or principle
- Return valid JSON only`;

  const quickPrompt = `Break down "${formula}" into steps.

Context: ${context.slice(0, 300)}

You MUST return this JSON structure with at least 3 steps:
{"derivation":"What this explains","steps":[{"step":"Step 1 content","explanation":"Why"},{"step":"Step 2 content","explanation":"Why"},{"step":"Step 3 content","explanation":"Why"}],"sources":[{"title":"Any textbook","description":"Topic"}]}

IMPORTANT: Always provide steps, even for conceptual topics. JSON only, no other text.`;

  const prompt = isRetry ? detailedPrompt : quickPrompt;
  const maxTokens = isRetry ? 1500 : 1000;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: isRetry ? 0.5 : 0.3,
      max_tokens: maxTokens,
    });

    const content = response.choices[0]?.message?.content || '';
    console.log('Derivation raw response length:', content.length);
    console.log('Derivation raw response preview:', content.slice(0, 800));
    
    if (!content.trim()) {
      console.error('Empty response from AI for derivation');
      return emptyResult;
    }

    // Remove markdown code blocks if present
    let cleanContent = content
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    // Try to extract JSON
    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in derivation response. Content:', cleanContent.slice(0, 300));
      return emptyResult;
    }

    let jsonStr = jsonMatch[0];
    
    // Fix common JSON issues with LaTeX backslashes
    try {
      // First try parsing as-is
      const parsed = JSON.parse(jsonStr);
      console.log('Parsed derivation successfully, steps count:', parsed.steps?.length || 0);
      
      return {
        derivation: parsed.derivation || 'See steps below:',
        steps: Array.isArray(parsed.steps) 
          ? parsed.steps
              .filter((s: { step?: string; explanation?: string }) => s.step || s.explanation)
              .map((s: { step?: string; explanation?: string }) => ({
                step: s.step || '',
                explanation: s.explanation || ''
              }))
          : [],
        sources: Array.isArray(parsed.sources) ? parsed.sources : [],
      };
    } catch (parseErr) {
      console.error('Initial JSON parse failed, attempting to fix escapes...');
      
      // Try to fix backslash escaping issues
      try {
        // Replace single backslashes with double (but not already doubled ones)
        const fixedJson = jsonStr.replace(/(?<!\\)\\(?![\\"])/g, '\\\\');
        const parsed = JSON.parse(fixedJson);
        console.log('Parsed derivation after fix, steps count:', parsed.steps?.length || 0);
        
        return {
          derivation: parsed.derivation || 'See steps below:',
          steps: Array.isArray(parsed.steps) 
            ? parsed.steps
                .filter((s: { step?: string; explanation?: string }) => s.step || s.explanation)
                .map((s: { step?: string; explanation?: string }) => ({
                  step: s.step || '',
                  explanation: s.explanation || ''
                }))
            : [],
          sources: Array.isArray(parsed.sources) ? parsed.sources : [],
        };
      } catch (fixErr) {
        console.error('JSON parse error in derivation after fix attempt:', fixErr);
        console.error('JSON string that failed:', jsonStr.slice(0, 500));
        return emptyResult;
      }
    }
  } catch (error) {
    console.error('Error generating derivation:', error);
    return emptyResult;
  }
};

/**
 * Generate a "Why?" explanation for a concept
 */
export const generateWhyExplanation = async (
  concept: string,
  context: string
): Promise<{
  explanation: string;
  historicalContext?: string;
  modernRelevance: string;
}> => {
  const prompt = `Why does "${concept}" matter?

Context: ${context.slice(0, 300)}

Return JSON: {"explanation":"2-3 sentences on significance","historicalContext":"1 sentence background (optional)","modernRelevance":"1 sentence on current applications or importance"}

Adapt to the subject (science, business, humanities, etc). Be concise. JSON only.`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 400,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { explanation: '', modernRelevance: '' };
  } catch (error) {
    console.error('Error generating why explanation:', error);
    return { explanation: '', modernRelevance: '' };
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
 * Get mastery-level adaptation for prompts
 */
function getMasteryAdaptation(masteryLevel: number): string {
  if (masteryLevel < 40) {
    return 'The student is a beginner. Use simple language and basic examples.';
  } else if (masteryLevel <= 75) {
    return 'The student is intermediate. You can use moderately complex explanations.';
  } else {
    return 'The student is advanced. Provide sophisticated explanations and edge cases.';
  }
}
