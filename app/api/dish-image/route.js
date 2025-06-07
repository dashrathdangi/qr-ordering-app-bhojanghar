// /app/api/dish-images/route.js
import { query } from '../../../lib/server/db';

export async function POST(req) {
  try {
    // Assuming you get JSON with dishId and imageUrl (after upload)
    const { dishId, imageUrl } = await req.json();

    if (!dishId || !imageUrl) {
      return new Response("Missing dishId or imageUrl", { status: 400 });
    }

    const result = await query(
      "INSERT INTO dish_images (dish_id, image_url) VALUES ($1, $2) RETURNING *",
      [dishId, imageUrl]
    );

    return new Response(JSON.stringify(result.rows[0]), { status: 201 });
  } catch (err) {
    console.error(err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
