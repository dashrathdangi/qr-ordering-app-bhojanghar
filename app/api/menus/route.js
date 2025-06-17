import { query } from '@/lib/db'
;

// ===============================
// ✅ POST: Add new menu to an outlet
// ===============================
export async function POST(req) {
  try {
    const { outlet_id, title } = await req.json();

    // Correct condition: check title instead of menu_name
    if (!outlet_id || !title) {
      return new Response("Missing outlet_id or title", { status: 400 });
    }

    const result = await query(
      "INSERT INTO menus (outlet_id, title) VALUES ($1, $2) RETURNING *",
      [outlet_id, title]
    );

    return new Response(JSON.stringify(result.rows[0]), { status: 201 });
  } catch (err) {
    console.error("❌ Error adding menu:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// ===============================
// ✅ GET: Fetch all menus (optional: filter by outlet_id)
// ===============================
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const outlet_id = searchParams.get("outlet_id");

    let result;
    if (outlet_id) {
      result = await query("SELECT * FROM menus WHERE outlet_id = $1", [outlet_id]);
    } else {
      result = await query("SELECT * FROM menus");
    }

    return new Response(JSON.stringify(result.rows), { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching menus:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
