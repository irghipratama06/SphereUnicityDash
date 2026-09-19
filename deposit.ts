import { db, treasury, json, methodGuard, ATTEMPTS_PER_DEPOSIT, DEPOSIT_BASE_UNITS, UCT_COIN_ID } from '../lib/server';

function normalizedAmount(value: unknown) {
  return String(value ?? '').replace(/\.0+$/, '');
}

export default async function handler(request: Request) {
  const blocked = methodGuard(request, 'POST');
  if (blocked) return blocked;
  try {
    const body = await request.json();
    const wallet = String(body.wallet ?? '').trim();
    const transferId = body.transferId ? String(body.transferId) : undefined;
    if (!wallet || wallet.length < 20) return json({ error: 'Invalid wallet.' }, 400);

    const client = db();
    if (transferId) {
      const { data: existing } = await client.from('deposits').select('id,attempts_added').eq('transfer_id', transferId).maybeSingle();
      if (existing) {
        const { data: p } = await client.from('players').select('attempts').eq('wallet', wallet).maybeSingle();
        return json({ attempts: p?.attempts ?? 0, added: existing.attempts_added });
      }
    }

    const sphere = await treasury();
    const received = await sphere.payments.receive();
    const match = received.transfers.find((transfer: any) => {
      const sender = transfer.senderPubkey ?? transfer.senderChainPubkey ?? transfer.sender?.chainPubkey;
      const sameSender = sender === wallet;
      const sameTransfer = !transferId || transfer.transferId === transferId || transfer.id === transferId;
      const tokens = Array.isArray(transfer.tokens) ? transfer.tokens : [];
      const sameToken = tokens.some((token: any) =>
        String(token.symbol ?? '').toUpperCase() === 'UCT' &&
        normalizedAmount(token.amount) === DEPOSIT_BASE_UNITS &&
        (!token.coinId || token.coinId === UCT_COIN_ID),
      );
      return sameSender && sameTransfer && sameToken;
    });
    await sphere.destroy();

    if (!match) {
      return json({ error: 'Deposit not verified yet. Wait a few seconds and try the same claim again.' }, 409);
    }

    const actualTransferId = String(match.transferId ?? match.id ?? transferId ?? `${wallet}:${Date.now()}`);
    const { data: existing } = await client.from('deposits').select('id,attempts_added').eq('transfer_id', actualTransferId).maybeSingle();
    if (existing) {
      const { data: p } = await client.from('players').select('attempts').eq('wallet', wallet).maybeSingle();
      return json({ attempts: p?.attempts ?? 0, added: existing.attempts_added });
    }

    const { data: current } = await client.from('players').select('attempts').eq('wallet', wallet).maybeSingle();
    const nextAttempts = (current?.attempts ?? 0) + ATTEMPTS_PER_DEPOSIT;
    const { error: playerError } = await client.from('players').upsert({ wallet, attempts: nextAttempts, updated_at: new Date().toISOString() }, { onConflict: 'wallet' });
    if (playerError) throw playerError;
    const { error: depositError } = await client.from('deposits').insert({ transfer_id: actualTransferId, wallet, amount_base: DEPOSIT_BASE_UNITS, attempts_added: ATTEMPTS_PER_DEPOSIT });
    if (depositError) throw depositError;

    return json({ attempts: nextAttempts, added: ATTEMPTS_PER_DEPOSIT });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Deposit verification failed.' }, 500);
  }
}
