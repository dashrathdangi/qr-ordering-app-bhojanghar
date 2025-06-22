'use client';

import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

let socket;
const socketUrl = "https://api.stonezon.com";

export const getSocket = () => socket;

export default function SocketClient({ onNewOrder, onOrderStatusUpdate }) {
  console.log("✅ SocketClient mounted");

  const onNewOrderRef = useRef(onNewOrder);
  const onOrderStatusUpdateRef = useRef(onOrderStatusUpdate);

  useEffect(() => {
    onNewOrderRef.current = onNewOrder;
    onOrderStatusUpdateRef.current = onOrderStatusUpdate;
  }, [onNewOrder, onOrderStatusUpdate]);

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

    const newOrderListener = (data) => {
      console.log('📦 Received new order:', data);
      onNewOrderRef.current?.(data);
    };

    const statusUpdateListener = (data) => {
      console.log('🔄 Received order status update:', data);
      const { orderId, newStatus } = data || {};
      if (orderId && newStatus) {
        onOrderStatusUpdateRef.current?.(orderId, newStatus);
      } else {
        console.warn('⚠️ Invalid status update data:', data);
      }
    };

    socket.on('newOrder', newOrderListener);
    socket.on('orderStatusUpdate', statusUpdateListener);

    return () => {
      socket.off('newOrder', newOrderListener);
      socket.off('orderStatusUpdate', statusUpdateListener);
    };
  }, []);

  return null;
}
