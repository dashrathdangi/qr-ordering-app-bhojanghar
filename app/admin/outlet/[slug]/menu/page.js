'use client';

import { useState, useEffect } from 'react';

export default function AdminMenuManagerPage() {
  const [outlets, setOutlets] = useState([]);
  const [selectedOutletSlug, setSelectedOutletSlug] = useState('');
  const [menus, setMenus] = useState([]);
  const [loadingOutlets, setLoadingOutlets] = useState(false);
  const [loadingMenus, setLoadingMenus] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Fetch all outlets on mount
  useEffect(() => {
    const fetchOutlets = async () => {
      setLoadingOutlets(true);
      try {
        const res = await fetch('/api/outlets');
        if (!res.ok) throw new Error('Failed to load outlets');
        const data = await res.json();
        console.log("Fetched raw response:", data);
        setOutlets(data);
        if (data.length > 0) setSelectedOutletSlug(data[0].slug); // default to first outlet
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingOutlets(false);
      }
    };
    fetchOutlets();
  }, []);

  // Fetch menus when selectedOutletSlug changes
  useEffect(() => {
    if (!selectedOutletSlug) {
      setMenus([]);
      return;
    }
   console.log("Selected slug:", selectedOutletSlug);
    const fetchMenus = async () => {
      setLoadingMenus(true);
      try {
        const res = await fetch(`/api/outlets/${selectedOutletSlug}/menu`);
        if (!res.ok) throw new Error('Failed to load menus');
        const data = await res.json();
         console.log("Fetched raw response:", data);
        setMenus(data || []);
console.log('Menus API response:', data);
console.log('Menus state being set:', (data.menus || data));
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingMenus(false);
      }
    };
    fetchMenus();
  }, [selectedOutletSlug]);

  // Handlers to update menus state locally

  // Update Menu Title
  const updateMenuTitle = (menuIndex, newTitle) => {
    setMenus((prev) => {
      const copy = [...prev];
      copy[menuIndex].title = newTitle;
      return copy;
    });
  };

  // Add New Menu
  const addNewMenu = () => {
    setMenus((prev) => [...prev, { id: null, title: '', categories: [] }]);
  };

  // Delete Menu
  const deleteMenu = (menuIndex) => {
    setMenus((prev) => prev.filter((_, i) => i !== menuIndex));
  };

  // Update Category Field
  const updateCategoryField = (menuIndex, categoryIndex, field, value) => {
    setMenus((prev) => {
      const copy = [...prev];
      copy[menuIndex].categories[categoryIndex][field] = value;
      return copy;
    });
  };

  // Add New Category
  const addNewCategory = (menuIndex) => {
    setMenus((prev) => {
      const copy = [...prev];
      copy[menuIndex].categories.push({ id: null, name: '', dishes: [] });
      return copy;
    });
  };

  // Delete Category
  const deleteCategory = (menuIndex, categoryIndex) => {
    setMenus((prev) => {
      const copy = [...prev];
      copy[menuIndex].categories.splice(categoryIndex, 1);
      return copy;
    });
  };

  // Update Dish Field (inside category)
  const updateDishField = (menuIndex, categoryIndex, dishIndex, field, value) => {
    setMenus((prev) => {
      const copy = [...prev];
      copy[menuIndex].categories[categoryIndex].dishes[dishIndex][field] = value;
      return copy;
    });
  };

  // Add New Dish (inside category)
  const addNewDish = (menuIndex, categoryIndex) => {
    setMenus((prev) => {
      const copy = [...prev];
      copy[menuIndex].categories[categoryIndex].dishes.push({
        id: null,
        name: '',
        price: '',
        image_url: '',
      });
      return copy;
    });
  };

  // Delete Dish (inside category)
  const deleteDish = (menuIndex, categoryIndex, dishIndex) => {
    setMenus((prev) => {
      const copy = [...prev];
      copy[menuIndex].categories[categoryIndex].dishes.splice(dishIndex, 1);
      return copy;
    });
  };

  // Save menus to API
  const saveMenus = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      console.log('Saving menus payload:', menus);
      const res = await fetch(`/api/outlets/${selectedOutletSlug}/menu`, {
        method: 'POST', // or PUT based on your API
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(menus),
      });
      const data = await res.json();
     console.log('Save response:', data);
      if (!res.ok) throw new Error(data.error || 'Failed to save menus');
      setSuccessMsg('Menus saved successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
 console.log("Rendering menus:", menus);
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Admin Menu Manager</h1>

      {/* Outlet selector */}
      <div className="mb-6">
        {loadingOutlets ? (
          <p>Loading outlets...</p>
        ) : (
          <select
            value={selectedOutletSlug}
            onChange={(e) => setSelectedOutletSlug(e.target.value)}
            className="p-2 border rounded"
          >
            {outlets.map((outlet) => (
              <option key={outlet.id} value={outlet.slug}>
                {outlet.name || outlet.slug}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Loading or error for menus */}
      {loadingMenus && <p>Loading menus for {selectedOutletSlug}...</p>}
      {error && <p className="mb-4 text-red-600">{error}</p>}

      {/* Menus editor */}
     {!loadingMenus && (!menus || menus.length === 0) && (
  <p>No menus found for this outlet.</p>
)}
      {menus.map((menu, menuIndex) => (
        <div
          key={menu.id ?? `new-menu-${menuIndex}`}
          className="border rounded-lg p-4 mb-6 bg-gray-50"
        >
          <div className="flex items-center mb-3">
            <input
              type="text"
              placeholder="Menu Title"
              value={menu.title}
              onChange={(e) => updateMenuTitle(menuIndex, e.target.value)}
              className="flex-grow p-2 border rounded"
            />
            <button
              onClick={() => deleteMenu(menuIndex)}
              className="ml-4 text-red-600 font-bold"
            >
              Delete Menu
            </button>
          </div>

          <div className="ml-4">
        {(menu.categories && menu.categories.length > 0) ? (
          menu.categories.map((category, catIndex) => (
            <div
              key={category.id ?? `new-cat-${catIndex}`}
              className="ml-4 mb-4 p-3 border rounded bg-white"
            >
              {/* Category Name input */}
              <input
                type="text"
                placeholder="Category Name"
                value={category.name}
                onChange={(e) =>
                  updateCategoryField(menuIndex, catIndex, 'name', e.target.value)
                }
                className="p-2 border rounded w-full mb-2"
              />
              {category.dishes.map((dish, dishIndex) => (
                <div
                  key={dish.id ?? `new-dish-${dishIndex}`}
                  className="flex items-center mb-2 space-x-2"
                >
                  <input
                    type="text"
                    placeholder="Dish Name"
                    value={dish.name}
                    onChange={(e) =>
                      updateDishField(menuIndex, catIndex, dishIndex, 'name', e.target.value)
                    }
                    className="p-2 border rounded flex-grow"
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={dish.price}
                    onChange={(e) =>
                      updateDishField(menuIndex, catIndex, dishIndex, 'price', e.target.value)
                    }
                    className="p-2 border rounded w-24"
                  />
                  <input
                    type="text"
                    placeholder="Image URL"
                    value={dish.image_url}
                    onChange={(e) =>
                      updateDishField(menuIndex, catIndex, dishIndex, 'image_url', e.target.value)
                    }
                    className="p-2 border rounded flex-grow"
                  />
                  <button
                    onClick={() => deleteDish(menuIndex, catIndex, dishIndex)}
                    className="text-red-600 font-bold"
                  >
                    X
                  </button>
                </div>
              ))}

              <button
                onClick={() => addNewDish(menuIndex, catIndex)}
                className="mt-2 px-3 py-1 bg-blue-600 text-white rounded"
              >
                + Add Dish
              </button>

              <button
                onClick={() => deleteCategory(menuIndex, catIndex)}
                className="mt-2 text-red-600 font-bold"
              >
                Delete Category
              </button>
            </div>
           ))
  ) : (
    <p className="ml-4 text-gray-500 italic">No categories found</p>
  )}
        <button
          onClick={() => addNewCategory(menuIndex)}
          className="mt-2 px-3 py-1 bg-green-600 text-white rounded"
        >
          + Add Category
        </button>
      </div>
    </div>
  ))}

      <button
        onClick={addNewMenu}
        className="mb-4 px-4 py-2 bg-green-600 text-white rounded"
      >
        + Add New Menu
      </button>

      <div>
        <button
          onClick={saveMenus}
          disabled={saving}
          className="px-6 py-3 bg-indigo-600 text-white rounded font-semibold"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {successMsg && <p className="mt-4 text-green-600">{successMsg}</p>}
    </div>
  );
}
