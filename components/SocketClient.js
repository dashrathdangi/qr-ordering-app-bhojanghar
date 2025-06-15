'use client';

import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

let socket;

export const getSocket = () => socket;

export default function SocketClient({ onNewOrder, onOrderStatusUpdate }) {
  console.log("✅ SocketClient mounted");

  const audioRef = useRef(null);

  useEffect(() => {
    // Load notification sound
    audioRef.current = new Audio('/notification.wav');

    const handleNewOrder = (orders) => {
      console.log('📦 Received new order:', orders);
      if (audioRef.current) {
        audioRef.current.play().catch((e) => {
          console.warn("⚠ Failed to play sound", e.message);
        });
      }
      if (onNewOrder) {
        const orderList = Array.isArray(orders) ? orders : [orders];
        orderList.forEach((order) => onNewOrder(order));
      }
    };

    const handleStatusUpdate = (data) => {
      console.log('🔄 Order status updated:', JSON.stringify(data));
      if (onOrderStatusUpdate) onOrderStatusUpdate(data);
    };

    if (!socket) {
      // ✅ Use current origin (domain) dynamically
      const baseUrl =
        typeof window !== 'undefined' ? window.location.origin : '';

      socket = io(baseUrl, {
        path: "/api/socket", // Make sure your server uses this path
        transports: ['websocket'],
        withCredentials: true,
        reconnectionAttempts: 5,
        timeout: 10000,
        reconnectionDelayMax: 2000,
      });

      socket.on('connect', () => {
        console.log('✅ Connected to socket server:', socket.id);
      });

      socket.on('connect_error', (err) => {
        console.error('❌ Socket connection error:', err.message);
      });

      socket.on('disconnect', () => {
        console.log('❌ Disconnected from socket server');
      });
    }

    socket.off('newOrder', handleNewOrder);
    socket.on('newOrder', handleNewOrder);

    socket.off('orderStatusUpdate', handleStatusUpdate);
    socket.on('orderStatusUpdate', handleStatusUpdate);

    return () => {
      socket?.off('newOrder', handleNewOrder);
      socket?.off('orderStatusUpdate', handleStatusUpdate);
    };
  }, [onNewOrder, onOrderStatusUpdate]);

  return null;
}
