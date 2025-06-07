'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Trash2, Minus, Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const getLogoSrc = (url, outletSlug) => {
  if (!url) return '/fallback-image.png';
  if (!url.startsWith('http') && !url.startsWith('/')) {
    return `/uploads/outlets/${outletSlug}/${url}`;
  }
  return url;
};

const getImageSrc = (url, outletSlug) => {
  if (!url) return '/fallback-image.png';
  if (!url.startsWith('http') && !url.startsWith('/')) {
    return `/uploads/outlets/${outletSlug}/${url}`;
  }
  return url;
};

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

export default function OutletPage() {
  const { slug } = useParams();

  const [metadata, setMetadata] = useState(null);
  const [outletInfo, setOutletInfo] = useState(null);
  const [menus, setMenus] = useState([]);
  const [cart, setCart] = useState({});
  const [name, setName] = useState('');
  const [table, setTable] = useState('');
  const [isPackage, setIsPackage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [notes, setNotes] = useState('');
  const logoSrc = getLogoSrc(metadata?.logo) || '/logo.png';
  const outletLogoSrc = getLogoSrc(outletInfo?.logo) || '/logo.png';

  const SESSION_STORAGE_KEY = `session_data_${slug}`;
  const SESSION_EXPIRY_MS = 3 * 60 * 60 * 1000; // 3 hours

  const saveSession = useCallback(
    (data) => {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
      setSessionData(data);
    },
    [SESSION_STORAGE_KEY]
  );

  useEffect(() => {
    if (!slug) return;

    if (isPackage) {
      const newSession = {
        sessionId: uuidv4(),
        name: name.trim(),
        table: 'Package',
        createdAt: Date.now(),
      };
      saveSession(newSession);
      console.log('[Session] Package order - new session created:', newSession.sessionId);
      return;
    }

    if (!name.trim() || !table.trim()) {
      setSessionData(null);
      return;
    }

    const storedStr = localStorage.getItem(SESSION_STORAGE_KEY);
    const now = Date.now();

    if (!storedStr) {
      const newSession = {
        sessionId: uuidv4(),
        name: name.trim(),
        table: table.trim(),
        createdAt: now,
      };
      saveSession(newSession);
      console.log('[Session] No stored session, new created:', newSession.sessionId);
      return;
    }

    try {
      const stored = JSON.parse(storedStr);

      const expired = now - stored.createdAt > SESSION_EXPIRY_MS;
      const changedUser = stored.name !== name.trim() || stored.table !== table.trim();

      if (expired || changedUser) {
        const newSession = {
          sessionId: uuidv4(),
          name: name.trim(),
          table: table.trim(),
          createdAt: now,
        };
        saveSession(newSession);
        console.log('[Session] Session expired or user changed, new created:', newSession.sessionId);
      } else {
        setSessionData(stored);
        console.log('[Session] Reusing stored session:', stored.sessionId);
      }
    } catch (err) {
      const newSession = {
        sessionId: uuidv4(),
        name: name.trim(),
        table: table.trim(),
        createdAt: now,
      };
      saveSession(newSession);
      console.log('[Session] Error parsing stored session, new created:', newSession.sessionId);
    }
  }, [slug, name, table, isPackage, SESSION_EXPIRY_MS, SESSION_STORAGE_KEY, saveSession]);

  useEffect(() => {
    if (!slug) return;
    const fetchMetadata = async () => {
      try {
        const res = await fetch(`/api/outlets/${slug}/metadata`, { cache: 'no-store' });
        if (!res.ok) {
          setMetadata(null);
          return;
        }
        const data = await res.json();
        setMetadata(data);
      } catch {
        setMetadata(null);
      }
    };
    fetchMetadata();
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const fetchOutlet = async () => {
      try {
        const res = await fetch(`/api/outlets/${slug}`);
        const data = await res.json();
        if (!res.ok) {
          setOutletInfo(null);
          return;
        }
        setOutletInfo(data);
      } catch {
        setOutletInfo(null);
      }
    };
    fetchOutlet();
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const fetchMenu = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/outlets/${slug}/menu`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Menu not found');
        setMenus(data);
      } catch {
        alert("Couldn't fetch the menu.");
        setMenus([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [slug]);

  const updateCart = (itemId, delta) => {
    setCart((prev) => {
      const newQty = (prev[itemId] || 0) + delta;
      const updated = { ...prev };
      if (newQty <= 0) delete updated[itemId];
      else updated[itemId] = newQty;
      return updated;
    });
  };

  const allDishes = menus.flatMap((menu) =>
    menu.categories.flatMap((category) => category.dishes)
  );

  const totalPrice = allDishes.reduce((total, item) => {
    return total + (cart[item.id] || 0) * parseFloat(item.price);
  }, 0);

  const handlePlaceOrder = async () => {
  if (isPlacingOrder) return;          // 🚫 Prevent double tap
  setIsPlacingOrder(true);             // 🔒 Lock the button immediately

  if (!name.trim()) {
    alert('Please enter your name');
    setIsPlacingOrder(false);
    return;
  }

  if (!isPackage && !table.trim()) {
    alert('Please enter table number');
    setIsPlacingOrder(false);
    return;
  }

  if (Object.keys(cart).length === 0) {
    alert('Your cart is empty');
    setIsPlacingOrder(false);
    return;
  }

  if (!outletInfo?.id) {
    alert('Outlet info missing');
    setIsPlacingOrder(false);
    return;
  }

  const orderItems = Object.entries(cart)
    .map(([id, qty]) => {
      const dish = allDishes.find((i) => i.id === parseInt(id));
      if (!dish) {
        console.warn(`Dish with ID ${id} not found`);
        return null;
      }
      return {
        id: dish.id,
        name: dish.name,
        price: parseFloat(dish.price),
        quantity: qty,
      };
    })
    .filter(Boolean);

  const currentSessionId = isPackage
    ? uuidv4()
    : sessionData?.sessionId;

  if (!currentSessionId) {
    alert('Session ID missing. Please enter your name and table number.');
    setIsPlacingOrder(false);
    return;
  }

  const order = {
    customerName: name.trim(),
    tableNumber: isPackage ? 'Package' : table.trim(),
    isPackage,
    cart: orderItems,
    totalAmount: totalPrice,
    outletSlug: slug,
    sessionId: currentSessionId,
    notes: notes.trim(), 
  };

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-outlet-id': outletInfo.id,
      },
      body: JSON.stringify(order),
    });

    const data = await res.json();

    if (res.ok) {
      setCart({});                  // ✅ Clear cart
      setOrderSuccess(true);        // ✅ Show visual success
      setTimeout(() => setOrderSuccess(false), 3000); // ✅ Hide after 3 sec
      alert(`✅ Order placed! Total ₹${totalPrice.toFixed(2)}`);
      setName('');
      setTable('');
      setIsPackage(false);

      if (isPackage) {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        setSessionData(null);
      }
    } else {
      alert(`❌ Failed: ${data.message}`);
    }
  } catch (error) {
    alert('Something went wrong while placing the order.');
    console.error('Order failed:', error);
  } finally {
    setIsPlacingOrder(false);       // 🔓 Always re-enable button
  }
};

  return (
    <div className="min-h-screen bg-white p-6 flex flex-col items-center">
      {/* Logo and outlet name */}
      {metadata ? (
  <div className="mb-8 text-center">
     {console.log('metadata.logo:', metadata?.logo)}
    {console.log('getLogoSrc(metadata.logo):', getLogoSrc(metadata?.logo))}
    {console.log('FULL metadata object:', metadata)}
    <div className="mx-auto mb-3 w-28 h-28 relative">
     <Image
  src={getLogoSrc(metadata.logo, slug)}
  alt={`${metadata.name} logo`}
  fill
  sizes="112px"
  style={{ objectFit: 'contain' }}
  priority
/>
    </div>
    <h1 className="text-3xl font-extrabold">{metadata.name}</h1>
  </div>
) : outletInfo ? (
  <div className="mb-8 text-center">
      {console.log('outletInfo.logo:', outletInfo?.logo)}
      {console.log('getLogoSrc(outletInfo.logo):', getLogoSrc(outletInfo?.logo))}
    <div className="mx-auto mb-3 w-28 h-28 relative">
      <Image
  src={getLogoSrc(outletInfo.logo, slug)}
  alt={`${outletInfo.name} logo`}
  fill
  sizes="112px"
  style={{ objectFit: 'contain' }}
  priority
/>
        </div>
        <h1 className="text-3xl font-extrabold">{outletInfo.name}</h1>
      </div>
    ) : (
      <div className="mb-8 text-center text-gray-500">Loading outlet info...</div>
    )}

      {/* User inputs */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-center">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border rounded-md px-3 py-2 w-48"
        />
        {!isPackage && (
          <input
            type="text"
            placeholder="Table number"
            value={table}
            onChange={(e) => setTable(e.target.value)}
            className="border rounded-md px-3 py-2 w-32"
          />
        )}
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isPackage}
            onChange={(e) => setIsPackage(e.target.checked)}
            className="cursor-pointer"
          />
          <span>Package order</span>
        </label>
      </div>
      
      <div className="mb-6 w-full max-w-md">
  <label className="block mb-1 font-medium text-sm text-gray-700">Notes (optional)</label>
  <textarea
    value={notes}
    onChange={(e) => setNotes(e.target.value)}
    rows={2}
    className="w-full p-2 border border-gray-300 rounded-md text-sm"
    placeholder="e.g. Less spicy, no onions..."
  />
</div>

      {/* Menus and dishes */}
      {loading ? (
        <p>Loading menu...</p>
      ) : (
        menus.map((menu) => (
          <div key={menu.id} className="mb-8 w-full max-w-4xl">
            <h2 className="text-xl font-bold mb-4">{menu.name}</h2>
            {menu.categories.map((category) => (
              <div key={category.id} className="mb-6">
                <h3 className="text-lg font-semibold mb-2">{category.name}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {category.dishes.map((dish) => {
                    console.log('Dish image URL:', dish.image_url);
                    return (
                      <div
                        key={dish.id}
                        className="border rounded-lg p-4 flex flex-col"
                      >
                        <div className="relative w-full h-32 mb-2" style={{ borderRadius: '0.5rem', overflow: 'hidden' }}>
 <Image
  src={getImageSrc(dish.image_url, slug)}
  alt={dish.name}
  fill
  sizes="(max-width: 768px) 100vw, 33vw"
  style={{ objectFit: 'cover' }}
  priority
/>
</div>
                        <h4 className="font-semibold">{dish.name}</h4>
                        <p className="text-sm text-gray-600 mb-2">
                          ₹{dish.price}
                        </p>

                        <div className="mt-auto flex items-center gap-3">
                          <button
                            onClick={() => updateCart(dish.id, -1)}
                            disabled={!cart[dish.id]}
                            className="disabled:opacity-40"
                            aria-label={`Remove one ${dish.name}`}
                          >
                            <Minus size={16} />
                          </button>
                          <span>{cart[dish.id] || 0}</span>
                          <button
                            onClick={() => updateCart(dish.id, 1)}
                            aria-label={`Add one ${dish.name}`}
                          >
                            <Plus size={16} />
                          </button>
                          {cart[dish.id] ? (
                            <button
                              onClick={() =>
                                setCart((prev) => {
                                  const updated = { ...prev };
                                  delete updated[dish.id];
                                  return updated;
                                })
                              }
                              aria-label={`Remove all ${dish.name}`}
                              className="ml-auto text-red-600 hover:text-red-800"
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
      {Object.keys(cart).length > 0 && (
  <div className="w-full max-w-4xl mb-6 bg-gray-100 p-4 rounded-lg shadow">
    <h3 className="text-lg font-bold mb-3">🛒 Your Cart</h3>
    <ul className="divide-y divide-gray-300">
      {Object.entries(cart).map(([id, qty]) => {
        const dish = allDishes.find((d) => d.id === parseInt(id));
        if (!dish) return null;
        return (
          <li key={id} className="py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold">{dish.name}</p>
              <p className="text-sm text-gray-600">
                ₹{dish.price} × {qty} = ₹{(dish.price * qty).toFixed(2)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateCart(dish.id, -1)}
                className="px-2 py-1 rounded bg-gray-300 hover:bg-gray-400"
              >
                <Minus size={14} />
              </button>
              <span>{qty}</span>
              <button
                onClick={() => updateCart(dish.id, 1)}
                className="px-2 py-1 rounded bg-gray-300 hover:bg-gray-400"
              >
                <Plus size={14} />
              </button>
              <button
                onClick={() =>
                  setCart((prev) => {
                    const updated = { ...prev };
                    delete updated[dish.id];
                    return updated;
                  })
                }
                className="ml-2 text-red-600 hover:text-red-800"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
    <div className="text-right font-semibold mt-3">
      Total: ₹{totalPrice.toFixed(2)}
    </div>
  </div>
)} 
  {orderSuccess && (
  <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded shadow-lg z-50">
    ✅ Order placed successfully!
  </div>
)}
      {/* Cart summary and place order */}
      <div className="fixed bottom-4 left-0 right-0 mx-auto max-w-4xl bg-white border rounded-lg p-4 flex items-center justify-between shadow-lg z-50">
        <div>
          <strong>Total:</strong> ₹{totalPrice.toFixed(2)}
        </div>
        <button
  onClick={handlePlaceOrder}
  disabled={
    Object.keys(cart).length === 0 ||
    !name.trim() ||
    (!isPackage && !table.trim()) ||
    isPlacingOrder
  }
  className="bg-blue-600 text-white px-6 py-2 rounded-md disabled:opacity-50"
>
  {isPlacingOrder ? 'Placing...' : 'Place Order'}
</button>
      </div>
    </div>
  );
}
