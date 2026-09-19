import { treasury, json, methodGuard } from '../lib/server';

export default async function handler(request: Request) {
  const blocked = methodGuard(request, 'GET');
  if (blocked) return blocked;
  try {
    const sphere = await treasury();
    const address = sphere.identity?.directAddress;
    await sphere.destroy();
    if (!address) return json({ error: 'Treasury address unavailable.' }, 500);
    return json({ address });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Treasury unavailable.' }, 500);
  }
}
