import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = import.meta.env.VITE_ANFSF_API || '';

interface SSEMessage {
  status?: string;
  steps?: Array<{ name: string; duration: number; status: string }>;
}

export function useSSE(runId: string | null) {
  const [events, setEvents] = useState<SSEMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;
  const reconnectBaseDelay = 1000;

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setConnected(false);
  }, []);

  const connect = useCallback(() => {
    if (!runId) return;
    cleanup();

    const es = new EventSource(`${API_BASE}/api/v1/pipeline/${runId}/stream`);
    eventSourceRef.current = es;

    es.addEventListener('status', (e) => {
      try {
        const data = JSON.parse(e.data) as SSEMessage;
        setEvents((prev) => [...prev, data]);
      } catch { /* ignore parse errors */ }
    });

    es.addEventListener('step', (e) => {
      try {
        const data = JSON.parse(e.data) as SSEMessage;
        setEvents((prev) => [...prev, data]);
      } catch { /* ignore parse errors */ }
    });

    // Handle server-side timeout
    es.addEventListener('verification', (e) => { try { const data = JSON.parse(e.data); setEvents((prev) => [...prev, data]); } catch {} });

    es.addEventListener('timeout', (_) => {
      reconnectAttempts.current = 0;
      setConnected(false);
    });

    es.onopen = () => {
      setConnected(true);
      reconnectAttempts.current = 0;
    };

    es.onerror = () => {
      setConnected(false);
      cleanup();

      // Reconnection logic with exponential backoff + jitter
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = reconnectBaseDelay * Math.pow(2, reconnectAttempts.current);
        const jitter = delay * (0.5 + Math.random() * 0.5);
        reconnectAttempts.current++;

        setTimeout(() => {
          if (runId) connect();
        }, jitter);
      }
    };
  }, [runId, cleanup]);

  useEffect(() => {
    connect();
    return () => cleanup();
  }, [connect, cleanup]);

  const disconnect = useCallback(() => {
    reconnectAttempts.current = maxReconnectAttempts; // prevent auto-reconnect
    cleanup();
  }, [cleanup]);

  return { events, connected, connect, disconnect };
}
