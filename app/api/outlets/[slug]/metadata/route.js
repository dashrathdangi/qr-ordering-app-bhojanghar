import { NextResponse } from 'next/server';
import { query } from '@/lib/db'; // Adjust path if needed

export async function GET(request, { params }) {
  const { slug } = await params;

  // SQL query to get outlet info by slug
  const sql = `
  SELECT name, slug, description, logo_url, contact_phone
  FROM outlets
  WHERE slug = $1
  LIMIT 1
`;
  try {
    const result = await query(sql, [slug]);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Outlet not found' }, { status: 404 });
    }

    const outlet = result.rows[0];

    const metadata = {
      name: outlet.name,
      slug: outlet.slug,
      description: outlet.description,
      logo: outlet.logo,  // Make sure this is a valid public URL or path
      contact: {
        phone: outlet.contact_phone,
        email: outlet.contact_email,
      },
    };

    return NextResponse.json(metadata);

  } catch (error) {
    console.error('Error fetching outlet metadata:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
