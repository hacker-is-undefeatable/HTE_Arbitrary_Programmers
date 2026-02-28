'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

const WS_URL = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_QUIZ_WS_URL : undefined;

export type QuizPartyWsStatus = {
  status?: string;
  current_question_index?: number;
  total_questions?: number;
  current_question?: {
    question_text: string;
    choices: string[];
    question_index: number;
  };
  quiz_id?: string;
};

/**
 * Optional WebSocket hook for Live Quiz Party.
 * When NEXT_PUBLIC_QUIZ_WS_URL is set, connects to AWS API Gateway WebSocket
 * and subscribes to status updates for the given serverId.
 * When not set, returns null and the app keeps using REST polling.
 */
export function useQuizPartyWs(
  serverId: string | null,
  onStatus: (data: QuizPartyWsStatus) => void
): { connected: boolean } {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  useEffect(() => {
    if (!WS_URL || !serverId) {
      setConnected(false);
      return;
    }

    let ws: WebSocket;
    try {
      ws = new WebSocket(WS_URL);
      wsRef.current = ws;
    } catch {
      setConnected(false);
      return;
    }

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ action: 'subscribe', server_id: serverId }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        if (data.type === 'status' && data.payload) {
          onStatusRef.current(data.payload);
        }
      } catch (_) {}
    };

    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    return () => {
      wsRef.current = null;
      ws.close();
      setConnected(false);
    };
  }, [serverId]);

  return { connected };
}

export function isQuizPartyWsConfigured(): boolean {
  return Boolean(WS_URL);
}
