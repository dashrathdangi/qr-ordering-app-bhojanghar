"use client";

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

let socket = null;

export default function OrderNotification() {
  const [orders, setOrders] = useState([]);
  const audioRef = useRef(null);
  const [soundEnabled, setSoundEnabled] = useState(false)
  
  useEffect(() => {
    // 🔁 Fetch recent orders on initial load
    const fetchInitialOrders = async () => {
      try {
        const res = await fetch("/api/orders");
        if (res.ok) {
          const data = await res.json();
          // Fix: Use correct key 'sessions' instead of 'orders'
          setOrders(data.sessions || []);
        } else {
          console.error("Failed to fetch initial orders:", res.status);
        }
      } catch (err) {
        console.error("Error fetching initial orders:", err.message);
      }
    };
   
    const enableSound = () => {
  if (audioRef.current) {
    audioRef.current.muted = false; // unmute audio
    setSoundEnabled(true); // allow playing on new order
  }
};

    fetchInitialOrders();

    // 🔌 Setup Socket.IO client
    if (!socket) {
      socket = io("http://localhost:3001", {
        path: "/api/socket",
        transports: ["websocket"], // Force websocket
        withCredentials: true,
      });

      socket.on("connect", () => {
        console.log("✅ WebSocket connected:", socket.id);
      });

      socket.on("disconnect", () => {
        console.warn("❌ WebSocket disconnected");
      });
    }

    const handleNewOrder = (order) => {
      console.log("📦 Received new order:", order);

      if (audioRef.current && soundEnabled) {
        audioRef.current.play().catch((err) => {
          console.warn("🔇 Failed to auto-play sound:", err.message);
        });
      }

      // Wrap order in session-like object for compatibility with UI
      const sessionId = order.session_id || order.id;
      const newSession = {
        session_id: sessionId,
        customer_name: order.customer_name,
        table_number: order.is_package ? "Takeaway" : order.table_number || "N/A",
        outlet_slug: order.outlet_slug,
        combined_total: order.total_amount,
        has_takeaway: order.is_package,
        has_dinein: !order.is_package,
        orders: [order],
      };

      setOrders((prev) => [newSession, ...prev]);
    };

    socket.on("newOrder", handleNewOrder);

    return () => {
      socket.off("newOrder", handleNewOrder);
    };
  }, [soundEnabled]);

  return (
    <div className="space-y-4 mt-4">
      {/* Enable Sound Button */}
    {!soundEnabled && (
      <button
        onClick={enableSound}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
      >
        🔔 Enable Notification Sound
      </button>
    )}

    {/* Audio element (muted initially) */}
      <audio ref={audioRef} src="/notification.wav" preload="auto" muted />

      {orders.length === 0 ? (
        <p className="text-gray-500">No new orders yet.</p>
      ) : (
        orders.map((session) => (
          <div
            key={session.session_id}
            className="p-4 border border-gray-300 rounded-xl shadow-sm bg-white"
          >
            <p className="text-lg font-semibold">
              🪑 Table: {session.table_number}
            </p>
            <p className="text-sm text-gray-600">
              📦 Session ID: {session.session_id}
            </p>

            {session.orders.map((order, idx) => (
              <div key={order.id || idx}>
                <ul className="list-disc pl-5 mt-2">
                  {order.cart.map((item, index) => (
                    <li key={index}>
                      {item.name} × {item.quantity}
                    </li>
                  ))}
                </ul>

                <p className="mt-2 font-bold">💰 Total: ₹{order.total_amount}</p>
                <p className="text-sm text-gray-500">
                  🕒 {new Date(order.created_at).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
