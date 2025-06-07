import { query } from '../../../../../lib/server/db';
import { verifyToken } from '../../../../../utils/jwt';

const io = global.io;
console.log("✅ Orders Status Update API route loaded!");

// 🔐 Extract token from Authorization header or cookie
const getToken = (req) => {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }

  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(/token=([^;]+)/);
    return match?.[1] || null;
  }

  return null;
};

export async function PATCH(request, context) {
  const id = context.params?.id;
    if (!id) {
    console.error("❌ Order ID is missing in route params");
    return new Response(JSON.stringify({ message: "Order ID missing in URL" }), { status: 400 });
  }

  try {
    const token = getToken(request); // ✅
    if (!token) {
      console.warn("❌ No token provided.");
      return new Response(JSON.stringify({ message: "Unauthorized: No token" }), { status: 403 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      console.warn("❌ Invalid token.");
      return new Response(JSON.stringify({ message: "Unauthorized: Invalid token" }), { status: 403 });
    }

    const body = await request.json();
    let status = body.status;

    if (!id || !status) {
      return new Response(JSON.stringify({ message: "Order ID and status are required" }), { status: 400 });
    }

    status = status.trim().toLowerCase();

    const validStatuses = ["pending", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return new Response(JSON.stringify({ message: "Invalid status value" }), { status: 400 });
    }

    // Update order status in DB
    const result = await query(
      `UPDATE orders SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rowCount === 0) {
      return new Response(JSON.stringify({ message: "Order not found" }), { status: 404 });
    }

    const updatedOrder = result.rows[0];

    // Parse cart, ensure numbers for price and quantity
    let parsedCart = [];
    try {
      parsedCart = typeof updatedOrder.cart === "string" ? JSON.parse(updatedOrder.cart) : updatedOrder.cart;
      parsedCart = parsedCart.map(item => ({
        ...item,
        price: Number(item.price),
        quantity: Number(item.quantity),
      }));
    } catch (err) {
      parsedCart = [];
      console.warn("⚠️ Failed to parse cart:", err);
    }

    // Calculate total_amount (fallback to stored amount if needed)
    const total_amount = parsedCart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);

    const orderToEmit = {
      id: updatedOrder.id,
      customer_name: updatedOrder.customer_name || "Guest",
      table_number: updatedOrder.is_package ? "Package" : updatedOrder.table_number || "N/A",
      is_package: updatedOrder.is_package,
      cart: parsedCart,
      total_amount,
      status: updatedOrder.status,
      outlet_slug: updatedOrder.outlet_slug,
      session_id: updatedOrder.session_id,
      created_at: updatedOrder.created_at,
    };

    // Emit socket event if socket server is running
    if (io) {
      io.emit("orderStatusUpdate", orderToEmit);
      console.log("📢 Emitted 'orderStatusUpdate':", orderToEmit);
    } else {
      console.warn("⚠️ global.io not initialized. Did you call /api/socket?");
    }

    return new Response(
      JSON.stringify({ message: "Order status updated", order: orderToEmit }),
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Server Error:", err);
    return new Response(JSON.stringify({ message: "Internal Server Error" }), { status: 500 });
  }
}
