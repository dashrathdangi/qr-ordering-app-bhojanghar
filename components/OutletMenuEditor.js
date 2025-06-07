'use client';

import { useEffect, useState } from 'react';

export default function OutletMenuEditor({ slug }) {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;

    async function fetchMenus() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/outlets/${slug}/menu`);
        if (!res.ok) throw new Error('Failed to fetch menu');
        const data = await res.json();
        setMenus(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchMenus();
  }, [slug]);

  const handleAddMenu = () => alert('Add Menu clicked');
  const handleAddCategory = () => alert('Add Category clicked');

  return (
    <div className="p-4 border rounded">
      <h2 className="text-xl font-semibold mb-4">Menu for Outlet: {slug}</h2>

      <div className="mb-4 flex gap-2">
        <button
          onClick={handleAddMenu}
          className="bg-green-600 text-white px-3 py-1 rounded"
        >
          Add Menu
        </button>

        <button
          onClick={handleAddCategory}
          className="bg-blue-600 text-white px-3 py-1 rounded"
        >
          Add Category
        </button>
      </div>

      {loading && <p>Loading menus...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && menus.length === 0 && <p>No menus found.</p>}

      <ul>
        {menus.map((menu) => (
          <li key={menu.id} className="mb-2 border-b pb-2">
            <h3 className="font-bold">{menu.name}</h3>
            {/* You can list categories or other details here later */}
          </li>
        ))}
      </ul>
    </div>
  );
}