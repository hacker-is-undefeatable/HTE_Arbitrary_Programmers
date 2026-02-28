/**
 * Live Quiz Party state stored in AWS DynamoDB.
 * Uses AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION.
 * Table: QUIZ_PARTY_TABLE_NAME or "QuizParty".
 */

import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

let dynamoClient: DynamoDBClient | null = null;

function getClient(): DynamoDBClient {
  if (!dynamoClient) {
    const region = process.env.AWS_REGION || 'us-east-1';
    dynamoClient = new DynamoDBClient({
      region,
      credentials:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }
  return dynamoClient;
}

function getTableName(): string {
  return process.env.QUIZ_PARTY_TABLE_NAME || 'QuizParty';
}

export function isQuizPartyStoreConfigured(): boolean {
  return Boolean(
    process.env.AWS_REGION &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY
  );
}

export function generateInviteCode(): string {
  let code = '';
  const array = new Uint8Array(6);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
    for (let i = 0; i < 6; i++) code += CHARS[array[i]! % CHARS.length];
  } else {
    for (let i = 0; i < 6; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export type QuizServer = {
  id: string;
  invite_code: string;
  host_user_id: string | null;
  lecture_session_id: string | null;
  max_players: number;
  duration_minutes: number;
  status: 'waiting' | 'generating' | 'active' | 'ended';
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  current_question_index: number;
};

export type QuizParticipant = {
  id: string;
  quiz_server_id: string;
  user_id: string | null;
  display_name: string;
  guest: boolean;
  guest_tag_data_uri: string | null;
  score: number;
  joined_at: string;
};

export type QuizQuestion = {
  question_index: number;
  question_text: string;
  choices: string[];
  correct_choice_index: number;
  explanation: string;
  difficulty: string;
  source_span: string;
};

export type QuizContent = {
  quiz_id: string;
  title: string;
  question_count: number;
  questions: QuizQuestion[];
  generated_at: string;
  metadata?: Record<string, unknown>;
};

/** Create a new quiz server; returns server id and invite code. */
export async function createServer(params: {
  inviteCode: string;
  hostUserId: string | null;
  lectureSessionId: string | null;
  maxPlayers: number;
  durationMinutes: number;
}): Promise<{ id: string; invite_code: string }> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const table = getTableName();
  const client = getClient();

  await client.send(
    new PutItemCommand({
      TableName: table,
      Item: marshall({
        pk: 'SERVER',
        sk: id,
        inviteCode: params.inviteCode,
        hostUserId: params.hostUserId ?? null,
        lectureSessionId: params.lectureSessionId ?? null,
        maxPlayers: params.maxPlayers,
        durationMinutes: params.durationMinutes,
        status: 'waiting',
        createdAt: now,
        startedAt: null,
        endedAt: null,
        currentQuestionIndex: 0,
      }),
    })
  );

  await client.send(
    new PutItemCommand({
      TableName: table,
      Item: marshall({
        pk: `INVITE#${params.inviteCode}`,
        sk: 'SERVER',
        serverId: id,
      }),
    })
  );

  return { id, invite_code: params.inviteCode };
}

/** Get server by invite code. */
export async function getServerByInviteCode(
  inviteCode: string
): Promise<QuizServer | null> {
  const table = getTableName();
  const client = getClient();

  const inviteRes = await client.send(
    new GetItemCommand({
      TableName: table,
      Key: marshall({ pk: `INVITE#${inviteCode}`, sk: 'SERVER' }),
    })
  );
  if (!inviteRes.Item) return null;
  const { serverId } = unmarshall(inviteRes.Item) as { serverId: string };
  return getServer(serverId);
}

/** Get server by id. */
export async function getServer(serverId: string): Promise<QuizServer | null> {
  const table = getTableName();
  const client = getClient();

  const res = await client.send(
    new GetItemCommand({
      TableName: table,
      Key: marshall({ pk: 'SERVER', sk: serverId }),
    })
  );
  if (!res.Item) return null;
  const r = unmarshall(res.Item) as Record<string, unknown>;
  return {
    id: serverId,
    invite_code: String(r.inviteCode),
    host_user_id: r.hostUserId as string | null,
    lecture_session_id: r.lectureSessionId as string | null,
    max_players: Number(r.maxPlayers),
    duration_minutes: Number(r.durationMinutes),
    status: r.status as QuizServer['status'],
    created_at: String(r.createdAt),
    started_at: (r.startedAt as string) || null,
    ended_at: (r.endedAt as string) || null,
    current_question_index: Number(r.currentQuestionIndex ?? 0),
  };
}

/** Update server fields. */
export async function updateServer(
  serverId: string,
  updates: Partial<{
    status: QuizServer['status'];
    started_at: string | null;
    ended_at: string | null;
    current_question_index: number;
  }>
): Promise<void> {
  const table = getTableName();
  const client = getClient();

  const setExpr: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  if (updates.status !== undefined) {
    setExpr.push('#st = :st');
    names['#st'] = 'status';
    values[':st'] = updates.status;
  }
  if (updates.started_at !== undefined) {
    setExpr.push('startedAt = :startedAt');
    values[':startedAt'] = updates.started_at;
  }
  if (updates.ended_at !== undefined) {
    setExpr.push('endedAt = :endedAt');
    values[':endedAt'] = updates.ended_at;
  }
  if (updates.current_question_index !== undefined) {
    setExpr.push('currentQuestionIndex = :cqi');
    values[':cqi'] = updates.current_question_index;
  }
  if (setExpr.length === 0) return;

  await client.send(
    new UpdateItemCommand({
      TableName: table,
      Key: marshall({ pk: 'SERVER', sk: serverId }),
      UpdateExpression: 'SET ' + setExpr.join(', '),
      ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
      ExpressionAttributeValues: marshall(values),
    })
  );
}

/** Check if an invite code is already used (for unique code generation). */
export async function inviteCodeExists(inviteCode: string): Promise<boolean> {
  const s = await getServerByInviteCode(inviteCode);
  return s !== null;
}

/** Add a participant; returns participant id and record. */
export async function addParticipant(params: {
  serverId: string;
  userId: string | null;
  displayName: string;
  guest: boolean;
  guestTagDataUri: string | null;
}): Promise<QuizParticipant> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const table = getTableName();
  const client = getClient();

  await client.send(
    new PutItemCommand({
      TableName: table,
      Item: marshall({
        pk: `SERVER#${params.serverId}`,
        sk: `PARTICIPANT#${id}`,
        userId: params.userId ?? null,
        displayName: params.displayName,
        guest: params.guest,
        guestTagDataUri: params.guestTagDataUri ?? null,
        score: 0,
        joinedAt: now,
      }),
    })
  );

  return {
    id,
    quiz_server_id: params.serverId,
    user_id: params.userId,
    display_name: params.displayName,
    guest: params.guest,
    guest_tag_data_uri: params.guestTagDataUri,
    score: 0,
    joined_at: now,
  };
}

/** List participants for a server, ordered by score desc. */
export async function listParticipants(serverId: string): Promise<QuizParticipant[]> {
  const table = getTableName();
  const client = getClient();

  const res = await client.send(
    new QueryCommand({
      TableName: table,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: marshall({
        ':pk': `SERVER#${serverId}`,
        ':sk': 'PARTICIPANT#',
      }),
    })
  );

  const items = (res.Items || []).map((i) => unmarshall(i) as Record<string, unknown>);
  const participants: QuizParticipant[] = items.map((r) => ({
    id: (r.sk as string).replace('PARTICIPANT#', ''),
    quiz_server_id: serverId,
    user_id: r.userId as string | null,
    display_name: String(r.displayName),
    guest: Boolean(r.guest),
    guest_tag_data_uri: (r.guestTagDataUri as string) || null,
    score: Number(r.score ?? 0),
    joined_at: String(r.joinedAt),
  }));
  participants.sort((a, b) => b.score - a.score);
  return participants;
}

/** Get participant count for a server. */
export async function getParticipantCount(serverId: string): Promise<number> {
  const list = await listParticipants(serverId);
  return list.length;
}

/** Save quiz content (after generation). */
export async function saveQuizContent(
  serverId: string,
  params: {
    quizId: string;
    title: string;
    questionCount: number;
    questions: QuizQuestion[];
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const table = getTableName();
  const client = getClient();

  await client.send(
    new PutItemCommand({
      TableName: table,
      Item: marshall({
        pk: `SERVER#${serverId}`,
        sk: 'QUIZ',
        quizId: params.quizId,
        title: params.title,
        questionCount: params.questionCount,
        questions: params.questions,
        generatedAt: now,
        metadata: params.metadata ?? null,
      }),
    })
  );
}

/** Get quiz content by server id. quizId in API can be serverId (one quiz per server). */
export async function getQuizContent(serverId: string): Promise<QuizContent | null> {
  const table = getTableName();
  const client = getClient();

  const res = await client.send(
    new GetItemCommand({
      TableName: table,
      Key: marshall({ pk: `SERVER#${serverId}`, sk: 'QUIZ' }),
    })
  );
  if (!res.Item) return null;
  const r = unmarshall(res.Item) as Record<string, unknown>;
  const questions = (r.questions as Record<string, unknown>[]) || [];
  return {
    quiz_id: String(r.quizId),
    title: String(r.title),
    question_count: Number(r.questionCount ?? 0),
    questions: questions.map((q) => ({
      question_index: Number(q.question_index),
      question_text: String(q.question_text),
      choices: Array.isArray(q.choices) ? q.choices.map(String) : [],
      correct_choice_index: Number(q.correct_choice_index ?? 0),
      explanation: String(q.explanation ?? ''),
      difficulty: String(q.difficulty ?? 'medium'),
      source_span: String(q.source_span ?? ''),
    })),
    generated_at: String(r.generatedAt),
    metadata: r.metadata as Record<string, unknown> | undefined,
  };
}

/** Get a single question by server id and question index. (quizId in URL is serverId.) */
export async function getQuestion(
  serverId: string,
  questionIndex: number
): Promise<QuizQuestion | null> {
  const quiz = await getQuizContent(serverId);
  if (!quiz || questionIndex < 0 || questionIndex >= quiz.questions.length)
    return null;
  return quiz.questions[questionIndex] ?? null;
}

/** Record an answer and return points earned. */
export async function submitAnswer(params: {
  serverId: string;
  participantId: string;
  questionIndex: number;
  choiceIndex: number;
  correct: boolean;
  timeMs: number | null;
}): Promise<{ points: number }> {
  const BASE_POINTS = 100;
  const BONUS_PER_SECOND = 2;
  let points = 0;
  if (params.correct) {
    points = BASE_POINTS;
    if (params.timeMs != null && params.timeMs < 60000) {
      points += Math.floor((60000 - params.timeMs) / 1000) * BONUS_PER_SECOND;
    }
  }

  const table = getTableName();
  const client = getClient();
  const now = new Date().toISOString();

  await client.send(
    new PutItemCommand({
      TableName: table,
      Item: marshall({
        pk: `SERVER#${params.serverId}`,
        sk: `ANSWER#${params.questionIndex}#${params.participantId}`,
        choiceIndex: params.choiceIndex,
        correct: params.correct,
        timeMs: params.timeMs ?? null,
        answeredAt: now,
      }),
    })
  );

  const participants = await listParticipants(params.serverId);
  const part = participants.find((p) => p.id === params.participantId);
  const currentScore = part?.score ?? 0;
  const newScore = currentScore + points;

  await client.send(
    new UpdateItemCommand({
      TableName: table,
      Key: marshall({
        pk: `SERVER#${params.serverId}`,
        sk: `PARTICIPANT#${params.participantId}`,
      }),
      UpdateExpression: 'SET score = :score',
      ExpressionAttributeValues: marshall({ ':score': newScore }),
    })
  );

  return { points, total_score: newScore };
}

/** Get participant by id (for score lookup). */
export async function getParticipant(
  serverId: string,
  participantId: string
): Promise<QuizParticipant | null> {
  const list = await listParticipants(serverId);
  return list.find((p) => p.id === participantId) ?? null;
}

/** Mark quiz as saved for user. */
export async function saveQuizForUser(
  serverId: string,
  userId: string
): Promise<void> {
  const table = getTableName();
  const client = getClient();

  await client.send(
    new PutItemCommand({
      TableName: table,
      Item: marshall({
        pk: `SERVER#${serverId}`,
        sk: `SAVED#${userId}`,
        savedAt: new Date().toISOString(),
      }),
    })
  );
}

/** Record a download (user or guest). */
export async function recordDownload(params: {
  serverId: string;
  userId: string | null;
  guestDisplayName: string | null;
  fileType: string;
}): Promise<void> {
  const table = getTableName();
  const client = getClient();
  const now = new Date().toISOString();
  const id = `${params.userId || 'guest'}#${now}`;

  await client.send(
    new PutItemCommand({
      TableName: table,
      Item: marshall({
        pk: `SERVER#${params.serverId}`,
        sk: `DOWNLOAD#${id}`,
        userId: params.userId ?? null,
        guestDisplayName: params.guestDisplayName ?? null,
        fileType: params.fileType,
        downloadAt: now,
      }),
    })
  );
}
