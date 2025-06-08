import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/server/db';

// Helper to get outlet ID from slug
async function getOutletId(slug) {
  const outletRes = await query('SELECT id FROM outlets WHERE slug = $1', [slug]);
  if (outletRes.rows.length === 0) throw new Error('Outlet not found');
  return outletRes.rows[0].id;
}

export async function GET(request, { params }) {
  const { slug } = params;

try {
  const outletId = await getOutletId(slug);
    console.log('✅ Outlet ID:', outletId);

    // Get menus
    const menusRes = await query(
      'SELECT id, title FROM menus WHERE outlet_id = $1 ORDER BY id ASC',
      [outletId]
    );
    const menus = menusRes.rows;
    console.log('📋 Menus:', menus);

    const menusWithCategories = await Promise.all(
      menus.map(async (menu) => {
        // Get categories for this menu
        const categoriesRes = await query(
          'SELECT id, name FROM categories WHERE menu_id = $1 ORDER BY id ASC',
          [menu.id]
        );
        const categories = categoriesRes.rows;
        console.log(`📂 Categories for menu ${menu.id}:`, categories);

        const categoriesWithDishes = await Promise.all(
          categories.map(async (category) => {
            const dishesRes = await query(
              'SELECT id, menu_id, name, price, image_url, prep_time FROM dishes WHERE menu_id = $1 AND category_id = $2',
              [menu.id, category.id]
            );
            const dishes = dishesRes.rows;
            console.log(`🍽️ Dishes for menu ${menu.id}, category ${category.id}:`, dishes);

            return {
              id: category.id,
              name: category.name,
              dishes,
            };
          })
        );

        return {
          id: menu.id,
          title: menu.title,
          categories: categoriesWithDishes,
        };
      })
    );

    return NextResponse.json(menusWithCategories);
  } catch (err) {
  console.error('❌ GET /api/outlets/[slug]/menu error:', err.message, err.stack);
  if (err.message === 'Outlet not found') {
    return NextResponse.json({ error: 'Outlet not found' }, { status: 404 });
  }
  return NextResponse.json({ error: 'Internal server error', detail: err.message }, { status: 500 });
}
}

export async function POST(req, context) {
  const { slug } = await context.params;

  try {
    const menus = await req.json();

    if (!Array.isArray(menus)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    const outletId = await getOutletId(slug);

    await query('BEGIN');

    // Delete existing dishes, categories, and menus for this outlet
    await query(
      `DELETE FROM dishes WHERE category_id IN (
         SELECT id FROM categories WHERE menu_id IN (
           SELECT id FROM menus WHERE outlet_id = $1
         )
       )`,
      [outletId]
    );
    await query(
      `DELETE FROM categories WHERE menu_id IN (
         SELECT id FROM menus WHERE outlet_id = $1
       )`,
      [outletId]
    );
    await query('DELETE FROM menus WHERE outlet_id = $1', [outletId]);

    for (const menu of menus) {
      if (!menu.title) {
        await query('ROLLBACK');
        return NextResponse.json({ error: 'Menu title is required' }, { status: 400 });
      }
     console.log('Inserting menu:', menu.title); // 👈 ADD HERE
      const menuInsertRes = await query(
        'INSERT INTO menus (outlet_id, title) VALUES ($1, $2) RETURNING id',
        [outletId, menu.title]
      );
      const menuId = menuInsertRes.rows[0].id;

      if (Array.isArray(menu.categories)) {
        for (const category of menu.categories) {
          if (!category.name) {
            await query('ROLLBACK');
            return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
          }
          console.log('Inserting category:', category.name); // 👈 ADD HERE
          const categoryInsertRes = await query(
            'INSERT INTO categories (menu_id, name) VALUES ($1, $2) RETURNING id',
            [menuId, category.name]
          );
          const categoryId = categoryInsertRes.rows[0].id;

          if (Array.isArray(category.dishes)) {
            for (const dish of category.dishes) {
              if (!dish.name || dish.price == null) {
                await query('ROLLBACK');
                return NextResponse.json({ error: 'Dish name and price are required' }, { status: 400 });
              }
               console.log('Inserting dish:', dish.name, dish.price); // 👈 ADD HERE
              await query(
                'INSERT INTO dishes (menu_id, category_id, name, price, image_url, prep_time) VALUES ($1, $2, $3, $4, $5, $6)',
                [menuId, categoryId, dish.name, dish.price, dish.image_url || null, dish.prep_time || null]
              );
            }
          }
        }
      }
    }

    await query('COMMIT');

    return NextResponse.json({ message: 'Menus saved successfully' });
  } catch (err) {
    await query('ROLLBACK').catch(() => {});
    console.error('POST /api/outlets/[slug]/menu error:', err);
    if (err.message === 'Outlet not found') {
      return NextResponse.json({ error: 'Outlet not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
