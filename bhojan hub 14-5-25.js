import { query } from '@/lib/server/db';
import { verifyToken } from "../../../utils/jwt";

console.log("✅ Orders API route loaded!");

// Utility to extract token from headers
const getTokenFromHeader = (req) => {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.split(" ")[1];
};

// ✅ GET: Admin-protected route
export async function GET(req) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      console.error("❌ No token found in request headers.");
      return new Response(
        JSON.stringify({ message: "Unauthorized: No token" }),
        { status: 403 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      console.error("❌ Invalid or expired token.");
      return new Response(
        JSON.stringify({ message: "Unauthorized: Invalid token" }),
        { status: 403 }
      );
    }

    const result = await query(
      `SELECT 
        id, customer_name, table_number, is_package, cart, 
        total_amount, status, outlet_slug, created_at 
       FROM orders 
       ORDER BY created_at DESC`
    );

    const ordersWithParsedCart = result.rows.map((order) => ({
      ...order,
      cart: typeof order.cart === 'string' ? JSON.parse(order.cart) : order.cart,
    }));

    return new Response(JSON.stringify({ orders: ordersWithParsedCart }), { status: 200 });
  } catch (err) {
    console.error("❌ GET Orders Error:", err);
    return new Response(
      JSON.stringify({ message: "Internal Server Error" }),
      { status: 500 }
    );
  }
}

// ✅ POST: Public - Customer places an order
export async function POST(req) {
  try {
    const {
      customerName,
      tableNumber,
      isPackage,
      cart,
      totalAmount,
      outletSlug,
    } = await req.json();

    if (
      !customerName ||
      (!tableNumber && !isPackage) ||
      !Array.isArray(cart) ||
      cart.length === 0 ||
      !totalAmount ||
      !outletSlug
    ) {
      console.error("❌ Missing required fields:", {
        customerName,
        tableNumber,
        isPackage,
        cart,
        totalAmount,
        outletSlug,
      });
      return new Response(
        JSON.stringify({ message: "Missing required fields" }),
        { status: 400 }
      );
    }

    const status = "pending";

    const result = await query(
      `INSERT INTO orders 
        (customer_name, table_number, is_package, cart, total_amount, outlet_slug, status, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
       RETURNING *`,
      [
        customerName,
        isPackage ? "Package" : tableNumber,
        isPackage,
        JSON.stringify(cart),
        totalAmount,
        outletSlug,
        status,
      ]
    );

    const newOrder = result.rows[0];
    const parsedCart = typeof newOrder.cart === 'string' ? JSON.parse(newOrder.cart) : newOrder.cart;
    const orderToEmit = { ...newOrder, cart: parsedCart };

    // ✅ Emit new order to WebSocket
    if (global.io) {
      global.io.emit('newOrder', orderToEmit);
    }

    return new Response(
      JSON.stringify({ message: "Order saved successfully!", order: orderToEmit }),
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ POST Order Error:", err);
    return new Response(
      JSON.stringify({ message: "Internal Server Error" }),
      { status: 500 }
    );
  }
}
