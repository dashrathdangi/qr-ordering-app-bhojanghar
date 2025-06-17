import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// PUT: Update a category name
export async function PUT(req, { params }) {
  const { categoryId } = params;

  try {
    const { name } = await req.json();
    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const updateRes = await query(
      'UPDATE menu_categories SET name = $1 WHERE id = $2 RETURNING *',
      [name, categoryId]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(updateRes.rows[0]);
  } catch (err) {
    console.error('PUT /api/categories/[categoryId] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete a category (items will keep NULL category_id if ON DELETE SET NULL is used)
export async function DELETE(req, { params }) {
  const { categoryId } = params;

  try {
    const deleteRes = await query('DELETE FROM menu_categories WHERE id = $1', [categoryId]);

    if (deleteRes.rowCount === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/categories/[categoryId] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
