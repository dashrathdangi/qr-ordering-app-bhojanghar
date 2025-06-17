import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// PUT: Update a menu title
export async function PUT(req, { params }) {
  const { slug, menuId } = params;

  try {
    const { title } = await req.json();
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const outletRes = await query('SELECT id FROM outlets WHERE slug = $1', [slug]);
    if (outletRes.rows.length === 0) {
      return NextResponse.json({ error: 'Outlet not found' }, { status: 404 });
    }

    const outletId = outletRes.rows[0].id;

    const updateRes = await query(
      'UPDATE menus SET title = $1 WHERE id = $2 AND outlet_id = $3 RETURNING *',
      [title, menuId, outletId]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ error: 'Menu not found or not owned by outlet' }, { status: 404 });
    }

    return NextResponse.json(updateRes.rows[0]);
  } catch (err) {
    console.error('PUT /api/outlets/[slug]/menu/[menuId] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete a menu and its items
export async function DELETE(req, { params }) {
  const { slug, menuId } = params;

  try {
    const outletRes = await query('SELECT id FROM outlets WHERE slug = $1', [slug]);
    if (outletRes.rows.length === 0) {
      return NextResponse.json({ error: 'Outlet not found' }, { status: 404 });
    }

    const outletId = outletRes.rows[0].id;

    const deleteRes = await query(
      'DELETE FROM menus WHERE id = $1 AND outlet_id = $2',
      [menuId, outletId]
    );

    if (deleteRes.rowCount === 0) {
      return NextResponse.json({ error: 'Menu not found or not owned by outlet' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Menu deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/outlets/[slug]/menu/[menuId] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
