'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import OrderCard from '../../components/OrderCard';
import mergeCartItems from '../../utils/mergeCartItems';
import SocketClient from '../../components/SocketClient';

export default function AdminDashboard() {
  const [soundAllowed, setSoundAllowed] = useState(false);
  const [orders, setOrders] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState(() => {
  return Cookies.get('selectedOutlet') || 'all';
});
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyToday, setOnlyToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [outlets, setOutlets] = useState([]);

  const router = useRouter();
  const audioRef = useRef(null);
  const knownOrderIds = useRef(new Set());

  // Setup audio notification once
  useEffect(() => {
    if (typeof Audio !== 'undefined') {
      audioRef.current = new Audio('/notification.wav');
      audioRef.current.volume = 0.5;
    }
  }, []); 

  // Function to play notification sound if allowed
  const playSound = useCallback(() => {
     console.log('playSound called, soundAllowed=', soundAllowed);
    if (!soundAllowed) {
    console.log('Sound not allowed, skipping');
    return;
  }
    if (!audioRef.current) {
    console.log('audioRef.current missing');
    return;
  }
    audioRef.current.currentTime = 0;
    audioRef.current.play().then(() => {
    console.log('Notification sound played');
  }).catch((err) => {
      console.warn('Audio play failed:', err);
    });
  }, [soundAllowed]);

  // Enable sound after user clicks button
  const enableSound = () => {
    if (!audioRef.current) return;
    audioRef.current.play()
      .then(() => {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        alert('Notification sound enabled!');
        setSoundAllowed(true);
      })
      .catch(() => {
        alert('Failed to enable notification sound. Please try again.');
      });
  };

  // Load list of outlets from backend
  const fetchOutlets = useCallback(async () => {
    try {
      const res = await fetch('/api/outlets');
      if (!res.ok) throw new Error(`Failed to fetch outlets: ${res.status}`);
      const data = await res.json();
      setOutlets(data);

      const saved = Cookies.get('selectedOutlet');
      if (saved && data.some((o) => o.slug === saved)) {
        setSelectedOutlet(saved);
      } else {
        setSelectedOutlet('all');
        Cookies.set('selectedOutlet', 'all');
      }
    } catch (err) {
      console.error(err);
      setError('Unable to load outlet list.');
    }
  }, []);

  // Load orders from backend based on filters
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedOutlet !== 'all') params.append('outlet', selectedOutlet);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (onlyToday) params.append('today', 'true');

      const res = await fetch(`/api/orders?${params.toString()}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        router.push('/admin/login');
        return;
      }

      const { orders: fetched } = await res.json();

      // Save IDs of orders to avoid duplicates later
      const ids = new Set();
      fetched.forEach((session) => {
        session.orders.forEach((o) => ids.add(o.id));
      });
      ids.forEach((id) => knownOrderIds.current.add(id));

      setOrders(fetched);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Error loading orders.');
    } finally {
      setLoading(false);
    }
  }, [selectedOutlet, searchQuery, onlyToday, router]);

  // Change order status by calling backend API
  const updateStatus = useCallback(async (orderId, newStatus) => {
  console.log("onOrderStatusUpdate called with:", orderId, newStatus); // ✅
  console.log("updateStatus called with:", { orderId, newStatus });
  if (!orderId) {
    console.error("❌ Invalid orderId passed to updateStatus:", orderId);
    return;
  }
  console.log("🛠️ updateStatus called with:", orderId, newStatus);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setOrders((prev) =>
          prev.map((session) => {
            const hasOrder = session.orders.some((o) => o.id === orderId);
            if (!hasOrder) return session;

            const updatedOrders = session.orders.map((o) =>
              o.id === orderId ? { ...o, status: newStatus } : o
            );

            let updatedSessionStatus = session.status;
            if (session.latest_order_id === orderId) {
              updatedSessionStatus = newStatus;
            }

            return {
              ...session,
              orders: updatedOrders,
              status: updatedSessionStatus,
            };
          })
        );
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  }, []);

  // Process new order received from socket and update UI
  const processOrder = useCallback((order) => {
  const ordersArray = Array.isArray(order) ? order : [order];

  ordersArray.forEach((newOrderRaw) => {
    if (!newOrderRaw) return;

    const orderId =
  newOrderRaw.id ??
  (Array.isArray(newOrderRaw.orders) && newOrderRaw.orders[0]?.id) ??
  null;
    if (!orderId) {
  console.log("⚠️ No orderId found in incoming order:", newOrderRaw);
  return;
}

if (knownOrderIds.current.has(orderId)) {
  console.log("🔁 Duplicate order detected, skipping ID:", orderId);
  return;
} else {
  console.log("🆕 New Order Detected with ID:", orderId);
}

    let cart = [];
    try {
      if (typeof newOrderRaw.cart === 'string') {
        cart = JSON.parse(newOrderRaw.cart);
      } else if (Array.isArray(newOrderRaw.cart)) {
        cart = newOrderRaw.cart;
      } else if (Array.isArray(newOrderRaw.orders) && newOrderRaw.orders.length > 0) {
        const firstChildOrder = newOrderRaw.orders[0];
        cart = Array.isArray(firstChildOrder.cart) ? firstChildOrder.cart : [];
      }
    } catch {
      cart = [];
    }

    const parsedOrderObj = {
      ...newOrderRaw,
      cart,
      customer_name: newOrderRaw.customer_name || 'Guest',
      table_number: newOrderRaw.is_package ? 'Takeaway' : newOrderRaw.table_number || 'N/A',
      total_amount:
        typeof newOrderRaw.total_amount === 'number'
          ? newOrderRaw.total_amount
          : cart.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0),
      created_at: newOrderRaw.created_at || new Date().toISOString(),
      order_number: newOrderRaw.order_number ?? 'N/A',
    };
    console.log("📦 Handling session for order ID:", parsedOrderObj.id, "Session ID:", parsedOrderObj.session_id);
    setOrders((prevSessions) => {
      const sessionIndex = prevSessions.findIndex(
        (s) => s.session_id === parsedOrderObj.session_id
      );

      if (sessionIndex === -1) {
        return [
          {
            session_id: parsedOrderObj.session_id,
            customer_name: parsedOrderObj.customer_name,
            table_number: parsedOrderObj.table_number,
            outlet_slug: parsedOrderObj.outlet_slug,
            combined_total: parsedOrderObj.total_amount,
            total_quantity: cart.reduce((sum, i) => sum + (i.quantity || 0), 0),
            has_takeaway: parsedOrderObj.is_package === true,
            has_dinein: parsedOrderObj.is_package !== true,
            orders: [parsedOrderObj],
            combined_cart: [...cart],
            latest_order_time: parsedOrderObj.created_at,
            latest_order_id: parsedOrderObj.id,
            status: parsedOrderObj.status,
          },
          ...prevSessions,
        ];
      }

      const updatedSessions = [...prevSessions];
      const existingSession = { ...updatedSessions[sessionIndex] };
      const alreadyExists = existingSession.orders.some((o) => o.id === parsedOrderObj.id);
      if (alreadyExists) {
  console.log("⚠️ Duplicate order ID, skipping update for:", parsedOrderObj.id);
  return [...prevSessions]; // return new reference to trigger re-render
}

      const newOrdersArray = [...existingSession.orders, parsedOrderObj];
      const allItems = newOrdersArray.flatMap((o) => o.cart || []);
      const mergedCart = mergeCartItems(allItems);

      const incomingTime = new Date(parsedOrderObj.created_at).getTime();
      const existingLatestTime = new Date(existingSession.latest_order_time).getTime();
      const isIncomingNewer = incomingTime > existingLatestTime;

      const customerNameConflict =
        existingSession.customer_name !== parsedOrderObj.customer_name;

      const updatedSession = {
        ...existingSession,
        orders: newOrdersArray,
        combined_cart: mergedCart,
        total_quantity: mergedCart.reduce((sum, i) => sum + (i.quantity || 0), 0),
        combined_total: mergedCart.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0),
        has_takeaway: existingSession.has_takeaway || parsedOrderObj.is_package === true,
        has_dinein: existingSession.has_dinein || parsedOrderObj.is_package !== true,
        latest_order_time: isIncomingNewer
          ? parsedOrderObj.created_at
          : existingSession.latest_order_time,
        latest_order_id: isIncomingNewer
          ? parsedOrderObj.id
          : existingSession.latest_order_id,
        status: isIncomingNewer ? parsedOrderObj.status : existingSession.status,
        customer_name:
          customerNameConflict && isIncomingNewer
            ? parsedOrderObj.customer_name
            : existingSession.customer_name,
        table_number:
          customerNameConflict && isIncomingNewer
            ? parsedOrderObj.table_number
            : existingSession.table_number,
      };

      updatedSessions[sessionIndex] = updatedSession;
      return updatedSessions;
    });
   console.log("✅ Orders updated with new order:", parsedOrderObj.id);
    knownOrderIds.current.add(parsedOrderObj.id);
    playSound();
  });
}, [playSound]);

console.log("Rendering Admin page, processOrder and updateStatus refs:", processOrder, updateStatus);
console.log('🔁 Current orders count:', orders.length);

  // Handle events from WebSocket client
 const handleSocketEvent = useCallback(
  (eventName, payload) => {
    console.log("📥 handleSocketEvent:", eventName, payload);
    if (eventName === 'newOrder') {
      processOrder(payload);  // ✅ used here
    } else if (eventName === 'orderStatusUpdate') {
      const { orderId, newStatus } = payload;
      updateStatus(orderId, newStatus);
    }
  },
  [processOrder, updateStatus] // ✅ both are used inside
);

  // Load outlets and orders when component mounts or filters change
  useEffect(() => {
    fetchOutlets();
  }, [fetchOutlets]);

  // Load orders on mount
useEffect(() => {
  fetchOrders();
}, [fetchOrders]);

  // Save selected outlet in cookie when changed
  useEffect(() => {
    Cookies.set('selectedOutlet', selectedOutlet);
  }, [selectedOutlet]);

  // Logout handler
  const logout = () => {
    Cookies.remove('token');
    router.push('/admin/login');
  };

  // Filter orders based on search, date, and outlet
  const filteredOrders = orders
    .filter((session) => {
      if (selectedOutlet !== 'all' && session.outlet_slug !== selectedOutlet) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCustomer = session.customer_name?.toLowerCase().includes(q);
        const matchTable = session.table_number?.toString().toLowerCase().includes(q);
        return matchCustomer || matchTable;
      }
      return true;
    })
    .filter((session) => {
      if (!onlyToday) return true;
      const today = new Date();
      const sessionDate = new Date(session.latest_order_time);
      return (
        sessionDate.getDate() === today.getDate() &&
        sessionDate.getMonth() === today.getMonth() &&
        sessionDate.getFullYear() === today.getFullYear()
      );
    });
   console.log("🧾 Full Orders:", orders);
  console.log("🔍 Filtered Orders:", filteredOrders);

  return (
    <main className="max-w-7xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <button
          onClick={logout}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Logout
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-4">
        <select
          value={selectedOutlet}
          onChange={(e) => setSelectedOutlet(e.target.value)}
          className="border border-gray-300 rounded p-2"
        >
          <option value="all">All Outlets</option>
          {outlets.map((o) => (
            <option key={o.slug} value={o.slug}>
              {o.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search by customer or table"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border border-gray-300 rounded p-2 flex-grow min-w-[200px]"
        />

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={onlyToday}
            onChange={() => setOnlyToday((v) => !v)}
          />
          Only Today
        </label>

        {!soundAllowed && (
          <button
            onClick={enableSound}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Enable Notification Sound
          </button>
        )}
      </div>

      {loading && <p>Loading orders...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && filteredOrders.length === 0 && <p>No orders found.</p>}

      <div className="space-y-6">
        {filteredOrders.map((session) => (
          <OrderCard
            key={session.session_id}
            session={session}
            updateStatus={updateStatus}
          />
        ))}
      </div>

      {/* WebSocket Client */}
      <SocketClient onSocketEvent={handleSocketEvent} />
    </main>
  );
}
