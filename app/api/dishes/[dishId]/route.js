import { NextResponse } from 'next/server';
import { query } from '@/lib/server/db';

// PUT: Update a dish
export async function PUT(req, { params }) {
  const { dishId } = params;

  try {
    const { name, price, image_url, category_id } = await req.json();

    if (!name || !price) {
      return NextResponse.json({ error: 'Name and price are required' }, { status: 400 });
    }

    const updateRes = await query(
      `UPDATE menu_items 
       SET name = $1, price = $2, image_url = $3, category_id = $4 
       WHERE id = $5 
       RETURNING *`,
      [name, price, image_url || null, category_id || null, dishId]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ error: 'Dish not found' }, { status: 404 });
    }

    return NextResponse.json(updateRes.rows[0]);
  } catch (err) {
    console.error('PUT /api/dishes/[dishId] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete a dish
export async function DELETE(req, { params }) {
  const { dishId } = params;

  try {
    const deleteRes = await query('DELETE FROM menu_items WHERE id = $1', [dishId]);

    if (deleteRes.rowCount === 0) {
      return NextResponse.json({ error: 'Dish not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Dish deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/dishes/[dishId] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
