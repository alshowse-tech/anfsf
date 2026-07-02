import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = import.meta.env.VITE_ANFSF_API || '';

export interface GlobalEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export function useGlobalEvents() {
  const [events, setEvents] = useState<GlobalEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(API_BASE + '/api/v1/events');
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data) as GlobalEvent;
        setEvents(prev => [...prev.slice(-50), parsed]);
      } catch { /* ignore */ }
    };

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    return () => { es.close(); esRef.current = null; };
  }, []);

  const clearEvents = useCallback(() => setEvents([]), []);

  return { events, connected, clearEvents };
}
