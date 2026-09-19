import { db, json, methodGuard } from '../lib/server';

export default async function handler(request: Request) {
  const blocked = methodGuard(request, 'GET');
  if (blocked) return blocked;
  try {
    const client = db();
    const { data, error } = await client
      .from('players')
      .select('wallet,best_distance,updated_at')
      .gt('best_distance', 0)
      .order('best_distance', { ascending: false })
      .limit(50);
    if (error) throw error;
    return json({ rows: (data ?? []).map((row, i) => ({
      rank: i + 1,
      wallet: row.wallet,
      distance: row.best_distance,
      updatedAt: row.updated_at,
    })) });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Leaderboard lookup failed.' }, 500);
  }
}
