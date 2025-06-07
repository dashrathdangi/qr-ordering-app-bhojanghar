export const runtime = "nodejs";

import { query } from '../../../lib/db';

console.log("✅ /api/sessions route loaded!");

// ===========================
// GET - Fetch all sessions
// ===========================
export async function GET() {
  try {
    const result = await query(`
      SELECT id, outlet, customer_name, table_number, status, created_at, last_order_at, expires_at
      FROM sessions
      ORDER BY created_at DESC
    `);

    return new Response(JSON.stringify(result.rows), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ Error fetching sessions:", err);
    return new Response(
      JSON.stringify({ message: "Internal Server Error" }),
      { status: 500 }
    );
  }
}

// ===========================
// PATCH - Expire a session
// ===========================
export async function PATCH(req) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return new Response(
        JSON.stringify({ message: "Missing session ID" }),
        { status: 400 }
      );
    }

    console.log("🔒 Attempting to expire session:", id);

    // Update session status
    const sessionUpdate = await query(
      `UPDATE sessions SET status = 'expired' WHERE id = $1`,
      [id]
    );

    // Close all pending orders for this session
    const orderUpdate = await query(
      `UPDATE orders SET status = 'closed' WHERE session_id = $1 AND status = 'pending'`,
      [id]
    );

    console.log(
      `✅ Session expired. Orders closed: ${orderUpdate.rowCount}`
    );

    return new Response(
      JSON.stringify({
        message: "Session closed",
        updatedOrders: orderUpdate.rowCount,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("❌ Error closing session:", err);
    return new Response(
      JSON.stringify({ message: "Internal Server Error" }),
      { status: 500 }
    );
  }
}
