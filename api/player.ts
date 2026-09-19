import { db, json, methodGuard } from '../lib/server';

export default async function handler(request: Request) {
  const blocked = methodGuard(request, 'GET');
  if (blocked) return blocked;
  try {
    const wallet = new URL(request.url).searchParams.get('wallet')?.trim();
    if (!wallet || wallet.length < 20) return json({ error: 'Invalid wallet.' }, 400);
    const client = db();
    const { data } = await client.from('players').select('attempts,best_distance').eq('wallet', wallet).maybeSingle();
    if (!data) return json({ attempts: 0, bestDistance: 0, rank: null });
    const { count } = await client.from('scores').select('*', { count: 'exact', head: true }).gt('distance', data.best_distance);
    return json({ attempts: data.attempts, bestDistance: data.best_distance, rank: count == null ? null : count + 1 });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Player lookup failed.' }, 500);
  }
}
