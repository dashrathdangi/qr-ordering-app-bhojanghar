'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';

let socket;
const socketUrl = "https://api.stonezon.com";

export const getSocket = () => socket;

export default function SocketClient({ onNewOrder, onOrderStatusUpdate }) {
  console.log("✅ SocketClient mounted");

  useEffect(() => {
    // Create socket connection if not already made
    if (!socket) {
      socket = io(socketUrl, {
        transports: ['websocket'],
        withCredentials: true,
        path: "/api/socket",
        reconnectionAttempts: 5,
        timeout: 10000,
        reconnectionDelayMax: 2000,
      });

      // Expose socket globally for testing
      window.socket = socket;

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

    const handleNewOrder = (orders) => {
      console.log('📦 Received new order:', orders);
      if (onNewOrder) {
        const orderList = Array.isArray(orders) ? orders : [orders];
        orderList.forEach((order) => onNewOrder(order));
      }
    };

    const handleStatusUpdate = (data) => {
      console.log('🔄 Order status updated:', JSON.stringify(data));
      if (onOrderStatusUpdate) onOrderStatusUpdate(data);
    };

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
