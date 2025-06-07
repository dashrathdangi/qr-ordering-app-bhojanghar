'use client';

import { useState } from 'react';
import CartItem from './CartItem';

export default function OrderCard({ session, updateStatus }) {
  const [updatingId, setUpdatingId] = useState(null);

  if (!session || typeof session !== 'object') return null;

  const {
    session_id,
    table_number,
    outlet_slug,
    combined_total,
    orders = [],
    has_dinein,
    has_takeaway,
    status,
    created_at,
    customer_name,
    combined_cart = [],
  } = session;

  // Sort orders by creation time ascending
  const sortedOrders = [...orders].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );

  // Pick latest order for display id and action buttons
  const latestOrder = sortedOrders.at(-1);
  // Use order_number if available, else id, else fallback '—'
 const displayOrderId = latestOrder?.outlet_order_number ?? latestOrder?.id ?? '—';

  const statusStyles = {
    pending: 'bg-yellow-200 text-yellow-800',
    completed: 'bg-green-200 text-green-800',
    cancelled: 'bg-red-200 text-red-800',
  };

  const sessionIcon =
    has_dinein && has_takeaway
      ? '🍽️🥡'
      : has_dinein
      ? '🍽️'
      : has_takeaway
      ? '🥡'
      : '';

  const tableDisplay =
    has_dinein && has_takeaway
      ? 'Dine-in + Takeaway'
      : has_dinein
      ? table_number || 'Dine-in'
      : has_takeaway
      ? 'Takeaway'
      : table_number || 'N/A';

  const formatTime = (value) => {
    const rawTime = value || latestOrder?.created_at || created_at;
    const date = new Date(rawTime);
    return isNaN(date)
      ? 'N/A'
      : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleUpdate = async (orderId, newStatus, currentStatus) => {
    console.log("handleUpdate called with orderId:", orderId, "newStatus:", newStatus);
    if (updatingId || newStatus === currentStatus) return;
    setUpdatingId(orderId);
    await updateStatus(orderId, newStatus);
    setUpdatingId(null);
  };

  // Group items in a cart by name + package status to merge duplicates
  const groupCartItems = (cart = []) => {
    const grouped = {};
    cart.forEach((item) => {
      if (!item?.name) return;

      const quantity = parseInt(item.quantity) || 1;
      const price = parseFloat(item.price) || 0;
      const is_package = !!item.is_package;

      const key = `${item.name}-${is_package ? 'package' : 'dinein'}`;

      if (grouped[key]) {
        grouped[key].quantity += quantity;
      } else {
        grouped[key] = {
          ...item,
          quantity,
          price,
          is_package,
        };
      }
    });

    return Object.entries(grouped).map(([key, value]) => ({
      key,
      ...value,
    }));
  };

  const allCartItems = Array.isArray(combined_cart)
    ? combined_cart.map((item) => ({
        ...item,
        quantity: parseInt(item.quantity) || 1,
        price: parseFloat(item.price) || 0,
        is_package: !!item.is_package,
      }))
    : [];

  const groupedItems = groupCartItems(allCartItems);

  const sessionTotal =
    combined_total ||
    groupedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div
      // Use session_id as key at top level to avoid duplicates if rendering multiple OrderCards
      key={session_id}
      className="border rounded p-4 mb-4 shadow hover:shadow-lg transition bg-white"
    >
      {/* 🧾 Session Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2">
        <div>
          <p className="text-sm text-gray-700">
            Table: <strong>{tableDisplay}</strong> | Session ID:{' '}
            <code className="text-xs text-gray-500 break-words">{session_id}</code>
          </p>
        </div>
        <p className="text-sm text-gray-800 mt-2 sm:mt-0">
          <strong>Total Bill:</strong> ₹{sessionTotal.toFixed(2)} {sessionIcon}
        </p>
      </div>

      <p className="text-sm text-gray-600 mb-1">
        <strong>Outlet:</strong> {outlet_slug}
      </p>

      {/* 📦 Header Info */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-base flex flex-wrap gap-2 items-center">
          <span>Order #{displayOrderId}</span>
          {customer_name && (
            <span className="text-sm font-normal text-gray-500">
              | Customer: {customer_name}
            </span>
          )}
        </h3>
        <span
          className={`px-2 py-1 rounded text-xs font-semibold capitalize ${
            statusStyles[status] || 'bg-gray-200 text-gray-700'
          }`}
        >
          {status}
        </span>
      </div>

      {/* 🧾 Combined Summary */}
      <div className="mb-4">
        <p className="font-medium text-sm text-gray-700 mb-1">🧾 Combined Summary:</p>
        {groupedItems.length > 0 ? (
          <ul className="text-sm space-y-1">
            {groupedItems.map((item) => (
              // Use item.key for unique keys here, prefixed to avoid collisions
              <CartItem key={`grouped-${item.key}`} item={item} />
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 italic">⚠️ No items in this session.</p>
        )}
      </div>

      {/* 📦 Per-order Breakdown */}
      <div className="mb-2">
        <p className="font-medium text-sm text-gray-700 mb-1">📦 Order Breakdown:</p>
        {sortedOrders.length === 0 ? (
          <p className="text-gray-500 text-sm italic">No orders yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {sortedOrders.map((order) => {
              const items = groupCartItems(order.cart || []);
              return (
                <li
                  // Use stable key: order.id if available, else fallback with created_at timestamp
                  key={order.id ?? `order-${order.created_at}`}
                  className="border p-2 rounded bg-gray-50"
                >
                  <p className="text-xs text-gray-500 mb-1">
                    🕒 {formatTime(order.created_at)}
                  </p>
                  {order.notes && (
                  <p className="text-sm text-gray-600 mt-1"><strong>Note:</strong> {order.notes}</p>
                 )}

                  {items.length > 0 ? (
                    <ul className="space-y-1">
                      {items.map((item) => (
                        <CartItem
                          key={`${order.id ?? 'order'}-${item.key}`}
                          item={item}
                        />
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400 italic">No items in this order.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 💰 Final Total */}
      <p className="mt-2 font-semibold text-sm">
        Total: ₹{sessionTotal.toFixed(2)} {sessionIcon}
      </p>

      {/* ✅ Action Buttons */}
      <div className="mt-2 flex gap-2">
        {status !== 'completed' && latestOrder && (
          <>
            <button
              disabled={updatingId === latestOrder.id}
              onClick={() => handleUpdate(latestOrder.id, 'completed', status)}
              className="px-3 py-1 bg-green-500 text-white rounded disabled:opacity-50"
            >
              Mark Completed
            </button>
            <button
              disabled={updatingId === latestOrder.id}
              onClick={() => handleUpdate(latestOrder.id, 'cancelled', status)}
              className="px-3 py-1 bg-red-500 text-white rounded disabled:opacity-50"
            >
              Cancel
            </button>
          </>
        )}
      </div>

      <p className="text-xs text-gray-500 mt-2">
        Created at: {formatTime(latestOrder?.created_at || created_at)}
      </p>
    </div>
  );
}
