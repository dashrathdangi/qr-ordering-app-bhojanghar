'use client';

import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

let socket; // keep this only once, globally

export const getSocket = () => socket;

export default function SocketClient({ onNewOrder, onOrderStatusUpdate }) {
  console.log("✅ SocketClient mounted");

  const audioRef = useRef(null);

  useEffect(() => {
    // Load notification sound
    audioRef.current = new Audio('/notification.wav');

   // Handler for 'newOrder' event
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

    // Handler for 'orderStatusUpdate' event
    const handleStatusUpdate = (data) => {
      console.log('🔄 Order status updated:', JSON.stringify(data));
      if (onOrderStatusUpdate) onOrderStatusUpdate(data);
    };

    // Create socket connection once
    if (!socket) {

  socket = io("https://bhojanghar.ap-south-1.elasticbeanstalk.com", {
  transports: ['websocket'],
  withCredentials: true,
  path: "/api/socket",
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

    // Register listeners
    socket.off('newOrder', handleNewOrder);
    socket.on('newOrder', handleNewOrder);

    socket.off('orderStatusUpdate', handleStatusUpdate);
    socket.on('orderStatusUpdate', handleStatusUpdate);

    // Cleanup on unmount
    return () => {
      socket?.off('newOrder', handleNewOrder);
      socket?.off('orderStatusUpdate', handleStatusUpdate);
    };
  }, [onNewOrder, onOrderStatusUpdate]);

  return null;
}
