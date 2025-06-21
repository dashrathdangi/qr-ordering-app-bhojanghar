'use client';

import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

let socket;
const socketUrl = "https://api.stonezon.com";

export const getSocket = () => socket;

export default function SocketClient({ onNewOrder, onOrderStatusUpdate }) {
  console.log("✅ SocketClient mounted");

  // 🔁 Store latest function references
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

      // ✅ Expose socket to browser console
      window.socket = socket;

      socket.on('connect', () => {
        console.log('✅ Connected to socket server:', socket.id);
        socket.emit('adminConnected'); // ✅ Let server know it's an admin
      });

      socket.on('connect_error', (err) => {
        console.error('❌ Socket connection error:', err.message);
      });

      socket.on('disconnect', () => {
        console.log('❌ Disconnected from socket server');
      });
    }

    const handleNewOrder = (data) => {
      console.log('📦 Received new order:', data);
      onNewOrderRef.current?.(data);
    };
const handleStatusUpdate = (data) => {
  console.log('🔄 Order status updated:', JSON.stringify(data));
  const { orderId, newStatus } = data || {};
  if (orderId && newStatus) {
    onOrderStatusUpdateRef.current?.(orderId, newStatus); // ✅ correct signature
  } else {
    console.warn('⚠️ Incomplete data for orderStatusUpdate:', data);
  }
};
    // ✅ Attach listeners only once
    socket.on('newOrder', handleNewOrder);
    socket.on('orderStatusUpdate', handleStatusUpdate);

    return () => {
      socket?.off('newOrder', handleNewOrder);
      socket?.off('orderStatusUpdate', handleStatusUpdate);
    };
  }, []);

  return null;
}
