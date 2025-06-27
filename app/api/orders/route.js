export const runtime = "nodejs";
import { getToken } from '../../../lib/auth';
import { query } from '../../../lib/db';
import crypto from "crypto";
import { checkSubscriptionValid } from '../../../lib/checkSubscription';

console.log("✅ /api/orders route loaded!");

const getCookieValue = (cookieHeader, key) => {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${key}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
};

// 🔧 Reusable order grouping function
async function groupOrdersBySession({ outletSlug = "", search = "", today = false, isAdmin = false, cookie = "" } = {}) {
  // 🔐 Subscription check (block expired subscriptions)
  if (!isAdmin && outletSlug) {
    // ✅ Convert slug → outletId
    const outletRes = await query(`SELECT id FROM outlets WHERE slug = $1`, [outletSlug]);
    if (outletRes.rowCount === 0) {
      throw new Error("Invalid outlet slug");
    }
    const outletId = outletRes.rows[0].id;
    // 🔢 Get next outlet-specific order number
    const { rows: outletOrderRows } = await query(
      'SELECT COALESCE(MAX(outlet_order_number), 0) + 1 AS next FROM orders WHERE outlet_slug = $1',
      [outletSlug]
    );
    const outletOrderNumber = outletOrderRows[0].next;

    const isValid = await checkSubscriptionValid(outletId);
    if (!isValid) {
      throw new Error("Subscription expired");
    }
  }

  const conditions = ["status = 'pending'"];
  const values = [];

  if (!isAdmin) {
    conditions.push("session_expires_at > NOW()");
  }

  if (outletSlug && outletSlug !== "all") {
    values.push(outletSlug);
    conditions.push(`outlet_slug = $${values.length}`);
  }

  if (search) {
    values.push(`%${search.toLowerCase()}%`);
    conditions.push(`LOWER(customer_name) LIKE $${values.length}`);
  }

  if (today) {
    conditions.push(`created_at >= NOW() - INTERVAL '24 hours'`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT 
  id, outlet_order_number, customer_name, table_number, is_package, cart, 
  total_amount, status, outlet_slug, session_id, created_at 
    FROM orders 
    ${whereClause}
    ORDER BY created_at ASC
  `;

  const result = await query(sql, values);
  const grouped = {};

  for (const row of result.rows) {
    const sessionId = row.session_id || crypto.randomUUID?.() || "unknown-session";
    const sessionKey = `${sessionId}_${row.outlet_slug}`; // ✅ Unique per outlet

    if (!grouped[sessionKey]) {
      grouped[sessionKey] = {
        session_id: sessionId,
        customer_name: row.customer_name,
        table_number: row.is_package ? "Takeaway" : row.table_number || "N/A",
        outlet_slug: row.outlet_slug,
        combined_total: 0,
        total_quantity: 0,
        has_takeaway: false,
        has_dinein: false,
        orders: [],
        combined_cart: [],
        first_order_id: row.id,
        latest_order_time: row.created_at,
      };
    }

    let cart = [];
    try {
      cart = typeof row.cart === "string" ? JSON.parse(row.cart) : Array.isArray(row.cart) ? row.cart : [];
    } catch (e) {
      cart = [];
    }

    const order = {
      id: row.id,
      cart,
      created_at: row.created_at,
      total_amount: Number(row.total_amount),
      status: row.status,
      is_package: row.is_package,
     outlet_order_number: row.outlet_order_number,
    };
grouped[sessionKey].outlet_order_number = row.outlet_order_number;

if (grouped[sessionKey].orders.length > 0) {
  const addedCount = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
  order.summary = `Added ${addedCount} more item${addedCount !== 1 ? "s" : ""}`;
}

    grouped[sessionKey].orders.push(order);
    grouped[sessionKey].combined_total += Number(row.total_amount);
    grouped[sessionKey].total_quantity += cart.reduce((sum, item) => sum + (item.quantity || 0), 0);

    if (row.is_package) grouped[sessionKey].has_takeaway = true;
    else grouped[sessionKey].has_dinein = true;

    for (const item of cart) {
      const existingItemIndex = grouped[sessionKey].combined_cart.findIndex(i => i.id === item.id);
      if (existingItemIndex !== -1) {
        grouped[sessionKey].combined_cart[existingItemIndex].quantity += item.quantity || 0;
      } else {
        grouped[sessionKey].combined_cart.push({ ...item });
      }
    }

    if (new Date(row.created_at) > new Date(grouped[sessionKey].latest_order_time)) {
      grouped[sessionKey].latest_order_time = row.created_at;
    }

    if (row.id < grouped[sessionKey].first_order_id) {
      grouped[sessionKey].first_order_id = row.id;
    }
  }

  const groupedSessions = Object.values(grouped);
  // Step 1: Group sessions per outlet
const groupedByOutlet = {};
for (const session of groupedSessions) {
  const outlet = session.outlet_slug;
  if (!groupedByOutlet[outlet]) groupedByOutlet[outlet] = [];
  groupedByOutlet[outlet].push(session);
}

// Step 2: Assign outlet-specific order numbers
for (const outlet in groupedByOutlet) {
  const sessions = groupedByOutlet[outlet];

  // Sort sessions by time
  sessions.sort((a, b) => new Date(a.latest_order_time) - new Date(b.latest_order_time));

  sessions.forEach((session, index) => {
    session.order_number = index + 1;
  });
}

// Step 3: Flatten all outlet sessions into one array, sort by latest time
const finalSortedGrouped = Object.values(groupedByOutlet).flat()
  .sort((a, b) => new Date(b.latest_order_time) - new Date(a.latest_order_time));
  return finalSortedGrouped;
}

export async function GET(req) {
  try {
    console.log("📥 Incoming GET /api/orders");

    const token = getToken(req);
    const { searchParams } = new URL(req.url);
    let outlet = searchParams.get("outlet") || searchParams.get("outlet_slug") || "";

    if (!outlet || outlet === "all") {
      const cookie = req.headers.get("cookie") || "";
      const outletFromCookie = getCookieValue(cookie, "selectedOutlet");
      outlet = outletFromCookie || "";
    }

    const search = searchParams.get("search");
    const today = searchParams.get("today") === "true";
    const isAdmin = !!token;
    const cookie = req.headers.get("cookie") || "";

    const orders = await groupOrdersBySession({ outletSlug: outlet, search, today, isAdmin, cookie });

    return new Response(JSON.stringify({ orders }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("❌ GET Orders Error:", err.stack || err.message || err);
    return new Response(JSON.stringify({ message: "Internal Server Error" }), { status: 500 });
  }
}

export async function POST(req) {
  try {
const body = await req.json();
const {
  customerName,
  tableNumber,
  isPackage,
  cart,
  totalAmount,
  outletSlug,
  notes,
} = body;

if (!outletSlug) {
  return new Response(JSON.stringify({ message: "Missing outletSlug" }), { status: 400 });
}

// 🧠 Fetch outlet ID from slug
const outletRes = await query(`SELECT id FROM outlets WHERE slug = $1`, [outletSlug]);
if (outletRes.rowCount === 0) {
  return new Response(JSON.stringify({ message: "Invalid outletSlug" }), { status: 404 });
}
const outletId = outletRes.rows[0].id;

// 🛡️ Check subscription
const subscriptionRes = await query(`SELECT * FROM subscriptions WHERE outlet_id = $1`, [outletId]);
const subscription = subscriptionRes.rows[0];

if (!subscription || subscription.status !== "active") {
  return new Response(JSON.stringify({ message: "Subscription inactive or not found" }), { status: 403 });
}

if (subscription.plan === "free") {
  return new Response(JSON.stringify({ message: "Upgrade to Pro to place orders" }), { status: 403 });
}

   const notesSafe = notes || "";

    if (
      !customerName ||
      (!tableNumber && !isPackage) ||
      !Array.isArray(cart) || cart.length === 0 ||
      !totalAmount ||
      !outletSlug
    ) {
      return new Response(JSON.stringify({ message: "Missing required fields" }), { status: 400 });
    }

    const normalizedCart = cart.map(item => ({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      quantity: Number(item.quantity),
    }));

    const sessionCheckRes = await query(
      `SELECT session_id FROM sessions 
       WHERE outlet_slug = $1 
         AND customer_name = $2 
         AND table_number = $3
         AND created_at > NOW() - INTERVAL '3 hours'
       ORDER BY created_at DESC
       LIMIT 1`,
      [
        outletSlug,
        customerName,
        isPackage ? "Takeaway" : tableNumber,
      ]
    );

    let finalSessionId;
    const now = new Date();
    const sessionDurationHours = 3;

    if (sessionCheckRes.rowCount > 0) {
      finalSessionId = sessionCheckRes.rows[0].session_id;
      await query(`UPDATE sessions SET created_at = NOW() WHERE session_id = $1`, [finalSessionId]);
    } else {
      finalSessionId = crypto.randomUUID?.() || "unknown-session";
      await query(
        `INSERT INTO sessions (session_id, outlet_slug, customer_name, table_number, is_package, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          finalSessionId,
          outletSlug,
          customerName,
          isPackage ? "Takeaway" : tableNumber,
          isPackage,
        ]
      );
    }
// Get the latest order number for this outlet
console.log("Fetching last order number for outlet:", outletSlug);
const lastOrder = await query(
  `SELECT outlet_order_number 
   FROM orders 
   WHERE outlet_slug = $1 
   ORDER BY outlet_order_number DESC 
   LIMIT 1`,
  [outletSlug]
);
console.log("Last order number result:", lastOrder.rows);
const nextOrderNumber = (lastOrder.rowCount > 0 ? lastOrder.rows[0].outlet_order_number : 0) + 1;

console.log("Outlet:", outletSlug, "Next order number:", nextOrderNumber);

if (isNaN(nextOrderNumber)) {
  throw new Error("Invalid nextOrderNumber: NaN");
}

    const result = await query(
  `INSERT INTO orders 
    (customer_name, table_number, is_package, cart, total_amount, outlet_slug, status, session_id, created_at, session_expires_at, notes, outlet_order_number) 
VALUES 
  ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW() + INTERVAL '${sessionDurationHours} hours', $9, $10)
   RETURNING *`,
  [
  customerName,
  isPackage ? "Takeaway" : tableNumber,
  isPackage,
  JSON.stringify(normalizedCart),
  totalAmount,
  outletSlug,
  "pending",
  finalSessionId,
  notesSafe,
  nextOrderNumber
]
);
    const newOrder = result.rows[0];
    const parsedCart = typeof newOrder.cart === "string" ? JSON.parse(newOrder.cart) : newOrder.cart;

    const orderToEmit = {
      id: newOrder.id,
      customer_name: newOrder.customer_name,
      table_number: newOrder.is_package ? "Takeaway" : newOrder.table_number || "N/A",
      is_package: newOrder.is_package,
      cart: parsedCart,
      total_amount: Number(newOrder.total_amount),
      status: newOrder.status,
      outlet_slug: newOrder.outlet_slug,
      session_id: newOrder.session_id,
      created_at: newOrder.created_at,
      order_number: newOrder.outlet_order_number || newOrder.id,
      outlet_order_number: nextOrderNumber,
    };
   
    // ✅ EMIT updated grouped orders with order_number
    if (global.adminSockets) {
  try {
    const updatedGroupedOrders = await groupOrdersBySession({ outletSlug });
    console.log("📡 Emitting newOrder to admins:", updatedGroupedOrders);

    for (const socket of global.adminSockets) {
      if (socket.connected) {
        socket.emit("newOrder", updatedGroupedOrders);
      }
    }
      } catch (err) {
        console.error("❌ GET Orders Error:", err.stack || err.message || err);

        const status = err.message === 'Subscription expired' ? 403 : 500;

        return new Response(JSON.stringify({ message: err.message || "Internal Server Error" }), {
          status,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return new Response(
      JSON.stringify({ message: "Order saved successfully!", order: orderToEmit }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("❌ POST Order Error:", err);
    return new Response(JSON.stringify({ message: "Internal Server Error" }), { status: 500 });
  }
}
