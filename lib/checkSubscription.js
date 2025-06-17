import { query } from './db';

export async function checkSubscriptionValid(outletId) {
  if (!outletId) return false;

  try {
    const result = await query(
      `SELECT status, renewal_date FROM subscriptions WHERE outlet_id = $1`,
      [outletId]
    );

    if (result.rows.length === 0) return false;

    const { status, renewal_date } = result.rows[0];

    if (
      status !== 'active' ||
      new Date(renewal_date) < new Date()
    ) {
      return false;
    }

    return true;
  } catch (err) {
    console.error('Subscription check error:', err);
    return false;
  }
}
