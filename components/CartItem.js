'use client';

export default function CartItem({ item }) {
  if (!item) return null;

  return (
    <li className="flex justify-between">
      <span>
        {item.name} × {item.quantity} {item.is_package ? '🥡' : '🍽️'}
      </span>
      <span className="text-gray-600">
        ₹{(item.price * item.quantity).toFixed(2)}
      </span>
    </li>
  );
}
