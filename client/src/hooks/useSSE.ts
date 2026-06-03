import { useEffect, useRef, useCallback } from 'react';

export interface SSEEvent {
  type: string;
  data: any;
}

export function useSSE(
  courseId: string | null,
  onEvent: (event: SSEEvent) => void,
  enabled: boolean = true
) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (!courseId || !enabled) return;

    const url = `http://localhost:8000/api/sse/stream/${courseId}`;
    const es = new EventSource(url);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onEventRef.current({ type: e.type || 'message', data });
      } catch {
        onEventRef.current({ type: 'message', data: e.data });
      }
    };

    const eventTypes = ['graph_updated', 'controversy_ready', 'quiz_ready', 'progress', 'notification'];
    eventTypes.forEach((type) => {
      es.addEventListener(type, (e: any) => {
        try {
          const data = JSON.parse(e.data);
          onEventRef.current({ type, data });
        } catch {
          onEventRef.current({ type, data: e.data });
        }
      });
    });

    es.onerror = () => {
      es.close();
      // 5秒后自动重连
      setTimeout(connect, 5000);
    };

    eventSourceRef.current = es;
  }, [courseId, enabled]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  return { disconnect };
}
