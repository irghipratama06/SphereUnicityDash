import { db, json, methodGuard } from '../lib/server';

function validateRun(distance: number, events: unknown) {
  if (!Number.isFinite(distance) || distance < 0 || distance > 250000) return false;
  if (!Array.isArray(events) || events.length > 1500) return false;
  let previous = -Infinity;
  for (const event of events) {
    const t = Number((event as any)?.t);
    if (!Number.isFinite(t) || t < previous + 90) return false;
    previous = t;
  }
  return true;
}

export default async function handler(request: Request) {
  const blocked = methodGuard(request, 'POST');
  if (blocked) return blocked;
  try {
    const body = await request.json();
    const wallet = String(body.wallet ?? '').trim();
    const distance = Math.floor(Number(body.distance));
    const events = body.events;
    if (!wallet || wallet.length < 20 || !validateRun(distance, events)) return json({ error: 'Invalid run payload.' }, 400);

    const client = db();
    const { data: player } = await client.from('players').select('attempts,best_distance').eq('wallet', wallet).maybeSingle();
    if (!player || player.attempts <= 0) return json({ error: 'No attempts remaining.' }, 409);

    const nextAttempts = player.attempts - 1;
    const nextBest = Math.max(player.best_distance ?? 0, distance);
    const { error: scoreError } = await client.from('scores').insert({ wallet, distance, jump_count: events.length, event_log: events });
    if (scoreError) throw scoreError;
    const { error: playerError } = await client.from('players').update({ attempts: nextAttempts, best_distance: nextBest, updated_at: new Date().toISOString() }).eq('wallet', wallet);
    if (playerError) throw playerError;

    return json({ distance, bestDistance: nextBest, attempts: nextAttempts });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Score submission failed.' }, 500);
  }
}
