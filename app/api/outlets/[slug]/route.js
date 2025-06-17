import { query } from '@/lib/db';

console.log("✅ Outlet API route loaded!");

// ===============================
// GET: Fetch outlet details by slug
// ===============================
export async function GET(request, { params }) {
  const { slug } = await params;
  try {

    if (!slug) {
      console.warn("🚨 Missing slug parameter for GET");
      return new Response(
        JSON.stringify({ message: "Missing slug" }),
        { status: 400 }
      );
    }

    console.log("🔍 Fetching details for outlet:", slug);

    const result = await query(
  "SELECT id, name, slug, address, created_at, owner_id, description, logo_url FROM outlets WHERE slug = $1",
  [slug]
 );
    if (result.rows.length === 0) {
      console.warn(`🚨 Outlet not found: ${slug}`);
      return new Response(
        JSON.stringify({ message: "Outlet not found" }),
        { status: 404 }
      );
    }

    console.log(`✅ Found outlet: ${slug}`);
    return new Response(JSON.stringify(result.rows[0]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ Error fetching outlet:", err);
    return new Response(
      JSON.stringify({ message: "Internal Server Error" }),
      { status: 500 }
    );
  }
}

// ===============================
// POST: Add a new outlet
// ===============================
export async function POST(req) {
  try {
    const { name, slug, logoUrl } = await req.json();

    if (!name || !slug || !logoUrl) {
      console.warn("🚨 Missing required fields");
      return new Response(
        JSON.stringify({ message: "Missing required fields" }),
        { status: 400 }
      );
    }

    const result = await query(
      "INSERT INTO outlets (name, slug, logo_url, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *",
      [name, slug, logoUrl]
    );

    console.log(`✅ Outlet added: ${result.rows[0].slug}`);
    return new Response(
      JSON.stringify({
        message: "Outlet added successfully",
        outlet: result.rows[0],
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("❌ Error adding outlet:", err);
    return new Response(
      JSON.stringify({ message: "Internal Server Error" }),
      { status: 500 }
    );
  }
}

// ===============================
// DELETE: Delete an outlet by slug
// ===============================
export async function DELETE(_req, context) {
  try {
    const { params } = await context;
    const slug = params?.slug;

    if (!slug) {
      console.warn("🚨 Missing slug parameter for DELETE");
      return new Response(
        JSON.stringify({ message: "Missing slug" }),
        { status: 400 }
      );
    }

    const result = await query("DELETE FROM outlets WHERE slug = $1", [slug]);

    if (result.rowCount === 0) {
      console.warn(`🚨 Outlet not found for deletion: ${slug}`);
      return new Response(
        JSON.stringify({ message: "Outlet not found" }),
        { status: 404 }
      );
    }

    console.log(`✅ Outlet deleted: ${slug}`);
    return new Response(
      JSON.stringify({ message: "Outlet deleted successfully" }),
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error deleting outlet:", err);
    return new Response(
      JSON.stringify({ message: "Internal Server Error" }),
      { status: 500 }
    );
  }
}
