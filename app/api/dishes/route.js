import { query } from '../../../lib/server/db';

// POST: Add a new dish
export async function POST(req) {
  try {
    const { menu_id, name, price, image_url } = await req.json();

    if (!menu_id || !name || !price) {
      return new Response("Missing menu_id, name or price", { status: 400 });
    }

    const result = await query(
      "INSERT INTO dishes (menu_id, name, price, image_url) VALUES ($1, $2, $3, $4) RETURNING *",
      [menu_id, name, price, image_url || null]
    );

    return new Response(JSON.stringify(result.rows[0]), { status: 201 });
  } catch (err) {
    console.error("❌ Error adding dish:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// GET: Fetch dishes (optionally filter by menu_id)
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const menu_id = searchParams.get("menu_id");

    let result;
    if (menu_id) {
      result = await query("SELECT * FROM dishes WHERE menu_id = $1", [menu_id]);
    } else {
      result = await query("SELECT * FROM dishes");
    }

    return new Response(JSON.stringify(result.rows), { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching dishes:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
