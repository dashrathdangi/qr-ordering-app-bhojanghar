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
  // Debug log to inspect the incoming payload:
  console.log('📥 processOrder triggered with:', order);

  // If the payload is an array, just pick the first element.
  const newOrder = Array.isArray(order) ? order[0] : order;
  if (!newOrder) return;

  // Determine a unique orderId
  const orderId = newOrder.id ?? newOrder.orders?.[0]?.id;
  if (!orderId) return;

  // Normalize cart into an array of items
  let cart = [];
  try {
    if (typeof newOrder.cart === 'string') {
      cart = JSON.parse(newOrder.cart);
    } else if (Array.isArray(newOrder.cart)) {
      cart = newOrder.cart;
    } else if (Array.isArray(newOrder.orders) && newOrder.orders.length > 0) {
      const firstChildOrder = newOrder.orders[0];
      cart = Array.isArray(firstChildOrder.cart) ? firstChildOrder.cart : [];
    }
  } catch {
    cart = [];
  }

  // Build a “flat” order object that we will merge into state
  const parsedOrderObj = {
    ...newOrder,
    cart,
    customer_name: newOrder.customer_name || 'Guest',
    table_number: newOrder.is_package ? 'Takeaway' : newOrder.table_number || 'N/A',
    total_amount:
      typeof newOrder.total_amount === 'number'
        ? newOrder.total_amount
        : cart.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0),
    created_at: newOrder.created_at || new Date().toISOString(),
    order_number: newOrder.order_number ?? 'N/A',
  };

  // Now update `orders` state:
  setOrders((prevSessions) => {
    // 1) Does this session_id already exist in state?
   const sessionIndex = prevSessions.findIndex(
  (s) => s.session_id === parsedOrderObj.session_id && s.outlet_slug === parsedOrderObj.outlet_slug
);
    // If there is no existing session with this session_id, create a brand-new session object:
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

    // 2) Otherwise, we’re *appending* to an existing session object:
    const updatedSessions = [...prevSessions];
    const existingSession = { ...updatedSessions[sessionIndex] };

    // 2a) If the same order ID is already in that session, skip (duplicate)
    const alreadyExists = existingSession.orders.some((o) => o.id === parsedOrderObj.id);
    if (alreadyExists) {
      console.log('⏩ Duplicate order detected, skipping update.');
      return prevSessions;
    }

    // 2b) Compute merged cart and totals
    const newOrdersArray = [...existingSession.orders, parsedOrderObj];
    const allItems = newOrdersArray.flatMap((o) => o.cart || []);
    // mergeCartItems should coalesce items by name + is_package
    const mergedCart = mergeCartItems(allItems);

    // 2c) Determine if this incoming order is strictly “newer” than the session’s latest_order_time
    const incomingTime = new Date(parsedOrderObj.created_at).getTime();
    const existingLatestTime = new Date(existingSession.latest_order_time).getTime();
    const isIncomingNewer = incomingTime > existingLatestTime;

    // 2d) Detect a “customer_name conflict”: same session_id but different customer_name
    const customerNameConflict =
      existingSession.customer_name !== parsedOrderObj.customer_name;

    // 2e) Build the updated session object
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

      // 2f) If the incoming order’s customer_name differs AND it’s newer, update it:
      customer_name:
        customerNameConflict && isIncomingNewer
          ? parsedOrderObj.customer_name
          : existingSession.customer_name,

      // 2g) Likewise for table_number (only if indeed this new order is newer)
      table_number:
        customerNameConflict && isIncomingNewer
          ? parsedOrderObj.table_number
          : existingSession.table_number,
    };

    // 3) Replace that one session in the array
    updatedSessions[sessionIndex] = updatedSession;
    return updatedSessions;
  });

  // Finally, allow sound for each NEW order
  knownOrderIds.current.add(parsedOrderObj.id);
  playSound();
}, [playSound]);  // Removed orders here

console.log("Rendering Admin page, processOrder and updateStatus refs:", processOrder, updateStatus);
  // Handle events from WebSocket client
  const handleSocketEvent = useCallback(
    (eventName, payload) => {
      if (eventName === 'newOrder') {
        processOrder(payload);
      } else if (eventName === 'orderStatusUpdate') {
        const { orderId, newStatus } = payload;
        updateStatus(orderId, newStatus);
      }
    },
    [processOrder, updateStatus]
  );

  // Load outlets and orders when component mounts or filters change
  useEffect(() => {
    fetchOutlets();
  }, [fetchOutlets]);

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
      <SocketClient 
  onNewOrder={processOrder} 
  onOrderStatusUpdate={fetchOrders}
/>
    </main>
  );
}
