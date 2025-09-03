'use client';

import { useEffect, useCallback } from 'react';
import { getApiUrl } from '@/lib/utils/api';

export function useWorldStream(onEvent: (type: string, data: unknown) => void) {
  const connect = useCallback(() => {
    const eventSource = new EventSource(getApiUrl('/api/stream/world'));
    
    // Handle different event types
    const eventTypes = ['water', 'levelUp', 'spawn'];
    
    for (const eventType of eventTypes) {
      eventSource.addEventListener(eventType, (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          onEvent(eventType, data);
        } catch (error) {
          console.error('Error parsing SSE event:', error);
        }
      });
    }
    
    // Handle connection events
    eventSource.addEventListener('connected', (event: MessageEvent) => {
      console.log('Connected to world stream:', JSON.parse(event.data));
    });
    
    eventSource.addEventListener('heartbeat', (event: MessageEvent) => {
      // Heartbeat received, connection is alive
      console.debug('Heartbeat:', JSON.parse(event.data));
    });
    
    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      eventSource.close();
      
      // Reconnect after 5 seconds
      setTimeout(() => {
        console.log('Reconnecting to world stream...');
        connect();
      }, 5000);
    };
    
    return eventSource;
  }, [onEvent]);
  
  useEffect(() => {
    const eventSource = connect();
    
    return () => {
      eventSource.close();
    };
  }, [connect]);
}