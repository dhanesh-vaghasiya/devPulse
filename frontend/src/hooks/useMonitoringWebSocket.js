import { useEffect, useRef, useState } from 'react';
import { getWebSocketUrl } from '../services/monitoringApi';

export function useMonitoringWebSocket({ onStatusUpdate, onAlert }) {
  const [connectionState, setConnectionState] = useState('connecting');
  const handlersRef = useRef({ onStatusUpdate, onAlert });
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  useEffect(() => {
    handlersRef.current = { onStatusUpdate, onAlert };
  }, [onStatusUpdate, onAlert]);

  useEffect(() => {
    let active = true;

    function connect() {
      if (!active) return;

      const socket = new WebSocket(getWebSocketUrl());
      socketRef.current = socket;
      setConnectionState('connecting');

      socket.onopen = () => {
        if (active) {
          setConnectionState('connected');
        }
      };

      socket.onmessage = (event) => {
        if (!active) return;

        let message;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }

        if (message.type === 'STATUS_UPDATE' && handlersRef.current.onStatusUpdate) {
          handlersRef.current.onStatusUpdate(message);
        }

        if (message.type === 'ALERT' && handlersRef.current.onAlert) {
          handlersRef.current.onAlert(message);
        }
      };

      socket.onerror = () => {
        if (active) {
          setConnectionState('error');
        }
      };

      socket.onclose = () => {
        if (!active) return;

        setConnectionState('reconnecting');
        reconnectTimerRef.current = window.setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      active = false;

      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }

      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  return connectionState;
}
