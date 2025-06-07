import { NextResponse } from "next/server";
import { query } from "../../../../../lib/db";

export async function PATCH(req, context) {
  const params = await context.params;  // await here
  const slug = params.slug;
  
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  try {
    const result = await query(
      `UPDATE outlets
       SET status = CASE
         WHEN status = 'active' THEN 'inactive'
         ELSE 'active'
       END,
       updated_at = NOW()
       WHERE slug = $1
       RETURNING status`,
      [slug]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Outlet not found" }, { status: 404 });
    }

    return NextResponse.json({ status: result.rows[0].status });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
