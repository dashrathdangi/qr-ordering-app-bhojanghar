'use client';

import { useState } from 'react';

export default function CloseSessionButton({ sessionId, onClose }) {
  const [loading, setLoading] = useState(false);
  const [closed, setClosed] = useState(false);
  const [error, setError] = useState(null);

  const handleClose = async () => {
    if (!sessionId || closed) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sessionId }), // ✅ FIXED
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Failed to close session');
        return;
      }

      console.log('✅ Session closed:', data.message);
      setClosed(true);
      if (onClose) onClose(); // Optional callback
    } catch (err) {
      console.error('❌ Error closing session:', err);
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2">
      <button
        onClick={handleClose}
        disabled={loading || closed}
        className={`px-3 py-1 rounded text-sm font-medium transition ${
          closed
            ? 'bg-green-500 text-white cursor-default'
            : loading
            ? 'bg-gray-400 text-white cursor-wait'
            : 'bg-red-600 text-white hover:bg-red-700'
        }`}
      >
        {closed ? 'Session Closed' : loading ? 'Closing...' : 'Close Session'}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
