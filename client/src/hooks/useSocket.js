import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const useSocket = (rideId, onEventMap) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!rideId) return;

    // Establish WebSocket Connection
    const socket = io(API_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log(`Socket connected: ${socket.id}`);
      // Join room for this ride
      socket.emit('join_ride', { rideId });
    });

    // Map listeners dynamically
    if (onEventMap) {
      Object.entries(onEventMap).forEach(([eventName, callback]) => {
        socket.on(eventName, callback);
      });
    }

    // Handle standard connection issues
    socket.on('connect_error', (error) => {
      console.error('Socket connect error:', error.message);
    });

    return () => {
      // Unsubscribe all events and disconnect
      if (onEventMap) {
        Object.keys(onEventMap).forEach((eventName) => {
          socket.off(eventName);
        });
      }
      socket.disconnect();
      console.log(`Socket disconnected for ride room ${rideId}`);
    };
  }, [rideId, onEventMap]);

  // Method to emit events securely
  const emit = useCallback((eventName, data) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(eventName, { ...data, rideId });
    } else {
      console.warn('Socket not connected. Cannot emit event:', eventName);
    }
  }, [rideId]);

  return { emit };
};
