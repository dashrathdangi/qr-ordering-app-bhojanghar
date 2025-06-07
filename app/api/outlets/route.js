import { query } from '../../../lib/server/db';
import { hash } from "bcrypt";
import { getAdminIdFromRequest } from '../../../lib/auth';
import fs from 'fs';
import path from 'path';

// Helper: Convert outlet name to slug
function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/--+/g, "-");
}

const createOutletFolder = (slug) => {
  const uploadPath = path.join(process.cwd(), 'public', 'uploads', 'outlets', slug);
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
};

// ✅ GET: Return outlets based on admin access
export async function GET(req) {
  try {
    const adminId = await getAdminIdFromRequest(req);
    if (!adminId) {
      return new Response("Unauthorized", { status: 401 });
    }

    let result;
    if (adminId === "superadmin") {
      // Superadmin can see all outlets
      result = await query(
        "SELECT id, name, slug, created_at FROM outlets ORDER BY created_at DESC"
      );
    } else {
      // Regular admin sees only their outlets
      result = await query(
        "SELECT id, name, slug, created_at FROM outlets WHERE owner_id = $1 ORDER BY created_at DESC",
        [adminId]
      );
    }

    return new Response(JSON.stringify(result.rows), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Error fetching outlets:", error);
    return new Response("Error fetching outlets", { status: 500 });
  }
}

// ✅ POST: Create a new outlet
export async function POST(req) {
  try {
    const adminId = await getAdminIdFromRequest(req);
    if (!adminId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    let { name, slug, password, owner_id } = body;

    if (!name || !password) {
      return new Response("Missing name or password", { status: 400 });
    }

    const ownerId = adminId === "superadmin" ? owner_id?.trim() : adminId;

    if (!ownerId) {
      return new Response("Missing owner ID", { status: 400 });
    }

    if (!slug || slug.trim() === "") {
      slug = generateSlug(name);
    }

    const hashedPassword = await hash(password, 10);

    await query(
      "INSERT INTO outlets (name, slug, password, owner_id) VALUES ($1, $2, $3, $4)",
      [name.trim(), slug, hashedPassword, ownerId]
    );
   
    createOutletFolder(slug);
    return new Response("Outlet created successfully", { status: 201 });
  } catch (error) {
    console.error("❌ Error creating outlet:", error);
    return new Response("Error creating outlet", { status: 500 });
  }
}
