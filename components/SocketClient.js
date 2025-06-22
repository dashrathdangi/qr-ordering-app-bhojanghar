// components/SocketClient.jsx
'use client';

import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

let socket;
const socketUrl = "https://api.stonezon.com";

export const getSocket = () => socket;

export default function SocketClient({ onSocketEvent }) {
  console.log("✅ SocketClient mounted");

  const onSocketEventRef = useRef(onSocketEvent);

  useEffect(() => {
    onSocketEventRef.current = onSocketEvent;
  }, [onSocketEvent]);

  useEffect(() => {
    if (!socket) {
      socket = io(socketUrl, {
        transports: ['websocket'],
        withCredentials: true,
        path: "/api/socket",
        reconnectionAttempts: 5,
        timeout: 10000,
        reconnectionDelayMax: 2000,
      });

      window.socket = socket;

      socket.on('connect', () => {
        console.log('🟢 Connected to socket server:', socket.id);
        socket.emit('adminConnected');
      });

      socket.on('connect_error', (err) => {
        console.error('❌ Socket connection error:', err.message);
      });

      socket.on('disconnect', () => {
        console.log('🔴 Disconnected from socket server');
      });
    }

    const handleNewOrder = (data) => {
      console.log('📡 newOrder received via socket:', data);
      onSocketEventRef.current?.('newOrder', data);
    };

    const handleStatusUpdate = (data) => {
      console.log('📡 orderStatusUpdate received via socket:', data);
      const { orderId, newStatus } = data || {};
      if (orderId && newStatus) {
        onSocketEventRef.current?.('orderStatusUpdate', { orderId, newStatus });
      } else {
        console.warn('⚠️ Invalid status update data:', data);
      }
    };

    socket.on('newOrder', handleNewOrder);
    socket.on('orderStatusUpdate', handleStatusUpdate);

    return () => {
      socket.off('newOrder', handleNewOrder);
      socket.off('orderStatusUpdate', handleStatusUpdate);
    };
  }, []);

  return null;
}
