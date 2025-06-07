'use client';
import { useEffect, useState } from 'react';
import DishForm from './DishForm';

export default function MenuEditor({ slug }) {
   console.log("Loaded slug:", slug);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    async function fetchMenus() {
      setLoading(true);
      const res = await fetch(`/api/outlets/${slug}/menu`);
      const data = await res.json();
      console.log("Fetched menus:", data);
      setMenus(Array.isArray(data) ? data : []);
      setLoading(false);
    }
    fetchMenus();
  }, [slug]);

  if (!slug) return <p className="text-red-500">Error: Outlet slug is missing</p>;

  const handleAddDish = async (menuId, categoryId, dish) => {
    await fetch('/api/dishes/' + dish.id, {
      method: dish.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...dish, menuId, categoryId }),
    });
    await fetchMenus();
  };

  const handleDeleteDish = async (dishId) => {
    await fetch('/api/dishes/' + dishId, { method: 'DELETE' });
    await fetchMenus();
  };

  if (loading) return <p>Loading menus...</p>;

  return (
    <div>
      {menus.map((menu) => (
        <div key={menu.id} className="mb-6 border p-4 rounded shadow">
          <h2 className="text-xl font-semibold">{menu.title}</h2>
          {menu.categories.map((cat) => (
            <div key={cat.id} className="ml-4 mt-3">
              <h3 className="text-lg font-medium">{cat.name}</h3>
              {cat.dishes.map((dish) => (
                <div
                  key={dish.id}
                  className="flex justify-between items-center border-b py-2"
                >
                  <div>
                    🍽 {dish.name} - ₹{dish.price}
                  </div>
                  <div className="space-x-2">
                    <DishForm
                      initialData={dish}
                      onSave={(d) => handleAddDish(menu.id, cat.id, d)}
                    />
                    <button
                      className="text-red-500"
                      onClick={() => handleDeleteDish(dish.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              <DishForm
                onSave={(d) => handleAddDish(menu.id, cat.id, d)}
                categoryId={cat.id}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
