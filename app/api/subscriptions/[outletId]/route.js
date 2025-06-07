import { query } from '../../../../lib/server/db';

const VALID_PLANS = ['free', 'pro'];
const VALID_STATUSES = ['active', 'expired'];

export async function GET(req, context) {
  const outletIdOrSlug = context.params.outletId;

  if (!outletIdOrSlug) {
    return new Response(JSON.stringify({ error: 'Missing outletId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    let result;

    if (isNaN(outletIdOrSlug)) {
      // Use slug
      result = await query(
        'SELECT * FROM subscriptions WHERE outlet_slug = $1 ORDER BY created_at DESC LIMIT 1',
        [outletIdOrSlug]
      );
    } else {
      // Use numeric outlet ID
      result = await query(
        'SELECT * FROM subscriptions WHERE outlet_id = $1 ORDER BY created_at DESC LIMIT 1',
        [Number(outletIdOrSlug)]
      );
    }

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ message: 'No subscription found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const subscription = result.rows[0];
    const today = new Date();
    const renewalDate = new Date(subscription.renewal_date);

    // Auto-mark as expired if past renewal date
    if (renewalDate < today && subscription.status !== 'expired') {
      await query(`UPDATE subscriptions SET status = 'expired' WHERE outlet_id = $1`, [
        subscription.outlet_id,
      ]);
      subscription.status = 'expired'; // Reflect in response
    }

    return new Response(JSON.stringify(subscription), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('GET subscription error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(req, context) {
  // Await params before using
 const { outletId: outletSlug } = await context.params;

  if (!outletSlug) {
    return new Response(JSON.stringify({ error: 'Missing outletSlug' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
 // ✅ 2. Convert slug to outlet_id here (ADD THIS PART)
  const outletRes = await query('SELECT id FROM outlets WHERE slug = $1', [outletSlug]);

  if (outletRes.rows.length === 0) {
    return new Response(JSON.stringify({ error: 'Outlet not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const outlet_id = outletRes.rows[0].id;

  // ✅ 3. Parse the request body
  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { plan, status, renewal_date } = body;
 // ✅ 4. Validate inputs
  if (!VALID_PLANS.includes(plan)) {
    return new Response(JSON.stringify({ error: 'Invalid plan' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!VALID_STATUSES.includes(status)) {
    return new Response(JSON.stringify({ error: 'Invalid status' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!renewal_date || isNaN(new Date(renewal_date).getTime())) {
    return new Response(JSON.stringify({ error: 'Invalid or missing renewal_date' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
 // ✅ 5. Insert or update subscription using outlet_id and outletSlug
  try {
    const result = await query(
      `
      INSERT INTO subscriptions (outlet_id, outlet_slug, plan, status, renewal_date, start_date)
      VALUES [$1, $2, $3, $4, $5, NOW()]
      ON CONFLICT (outlet_id)
      DO UPDATE SET
  plan = EXCLUDED.plan,
  status = EXCLUDED.status,
  renewal_date = EXCLUDED.renewal_date,
  outlet_slug = EXCLUDED.outlet_slug
      RETURNING *;
      `,
      [outlet_id, outletSlug, plan, status, renewal_date]
    );

    return new Response(JSON.stringify(result.rows[0]), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('POST subscription error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
