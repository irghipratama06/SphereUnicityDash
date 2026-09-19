import { createClient } from '@supabase/supabase-js';
import { Sphere } from '@unicitylabs/sphere-sdk';
import { createNodeProviders } from '@unicitylabs/sphere-sdk/impl/nodejs';
import { createWalletApiProviders } from '@unicitylabs/sphere-sdk/impl/shared/wallet-api';

export const ATTEMPTS_PER_DEPOSIT = 20;
export const DEPOSIT_BASE_UNITS = '5000000000000000000';
export const UCT_COIN_ID = 'f581d30f593e4b369d684a4563b5246f07b1d265f7178a2c0a82b81f39c24dc0';

export function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase environment variables are missing.');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function treasury() {
  const mnemonic = process.env.TREASURY_MNEMONIC;
  if (!mnemonic) throw new Error('TREASURY_MNEMONIC is missing.');
  const base = createNodeProviders({
    network: 'testnet',
    dataDir: '/tmp/uct-dash-treasury',
    oracle: { apiKey: 'sk_ddc3cfcc001e4a28ac3fad7407f99590' },
  });
  const providers = createWalletApiProviders(base, {
    baseUrl: 'https://wallet-api.unicity.network',
    network: 'testnet2',
    deviceId: 'uct-dash-vercel-treasury',
  });
  const { sphere } = await Sphere.init({
    ...providers,
    network: 'testnet2',
    mnemonic,
  });
  return sphere;
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export function methodGuard(request: Request, expected: string) {
  if (request.method !== expected) return json({ error: 'Method not allowed' }, 405);
  return null;
}
