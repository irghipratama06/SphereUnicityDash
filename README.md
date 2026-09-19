# UCT DASH — Sphere Testnet Game

Mobile-first Geometry Dash-style runner using the supplied character image, Sphere Connect, real UCT testnet payments, and a database-backed leaderboard.

The source request asked for:
- mandatory Sphere wallet connection before playing;
- **5 UCT = 20 attempts**;
- wallet confirmation for every 5 UCT deposit;
- an attempt is consumed on game over;
- a real activity leaderboard based on recorded run distance;
- GitHub + Vercel deployment without using a terminal on the phone.

The supplied image is bundled as `public/character.jpeg` and is rendered as the playable character.

## Important payment configuration

The game needs a **treasury Sphere testnet2 wallet**. The player sends exactly 5 UCT to that wallet through a Sphere Connect `send` intent. The Vercel backend then reads the treasury wallet's incoming mailbox and only credits the 20 attempts after it finds the matching incoming transfer from the player's connected chain public key.

Do not put the treasury mnemonic in a `VITE_*` variable. It is server-only.

UCT on the current testnet2 registry is the fungible UCT asset with 18 decimals and coin id:

`f581d30f593e4b369d684a4563b5246f07b1d265f7178a2c0a82b81f39c24dc0`

5 UCT therefore equals `5000000000000000000` base units.

## Deploy from a phone — no terminal

### 1. Create the Supabase database

1. Open Supabase in your browser and create a project.
2. Open **SQL Editor**.
3. Paste all of `supabase.sql` and run it.
4. Open Project Settings → API and copy:
   - Project URL
   - `service_role` key

The service-role key is server-only. Never put it into frontend code.

### 2. Create the game treasury wallet

Create/import a dedicated Sphere **testnet2** wallet. Put its recovery phrase into Vercel as `TREASURY_MNEMONIC`.

The backend derives the treasury address from that wallet, so the frontend does not need a hard-coded treasury address.

### 3. Put the project on GitHub

On GitHub in your browser:

1. Create a new empty repository.
2. Upload the project files/folders from this package.
3. Make sure these are present at the repository root:
   - `package.json`
   - `index.html`
   - `src/`
   - `api/`
   - `lib/`
   - `public/`
   - `supabase.sql`
   - `vercel.json`

Do **not** upload a real `.env` file or treasury mnemonic.

### 4. Deploy on Vercel

1. Open Vercel and choose **Add New → Project**.
2. Import the GitHub repository.
3. Framework preset: Vite.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Add these Environment Variables for Production:

`SUPABASE_URL`

`SUPABASE_SERVICE_ROLE_KEY`

`TREASURY_MNEMONIC`

7. Deploy.

No terminal is required.

## Sphere Connect behavior

The frontend uses `autoConnect` with the current testnet2 network descriptor and requests only the scopes it needs. Deposits call a wallet `send` intent, so Sphere shows the confirmation UI before moving tokens. The game never receives a private key.

The current Connect reference specifies testnet2 as network id 4, and `send` intents require the amount in base units and the canonical 64-hex coin id. The current testnet2 registry lists UCT at 18 decimals. See the official Sphere documentation before changing SDK versions.

## Leaderboard integrity

The leaderboard is **not hard-coded**. Each completed run is inserted into the `scores` table and each player's best distance is stored in `players`. The leaderboard API sorts real database records by `best_distance`.

The server also validates:
- wallet identifier shape;
- non-negative, bounded distance;
- bounded jump-event count;
- monotonically increasing jump timestamps with a minimum interval;
- available attempts before accepting a score.

This prevents the leaderboard from being a static/fake list, but it is not a cryptographic anti-cheat system: a browser game cannot make a client-controlled physics simulation impossible to tamper with. For a hardened competitive version, move the physics/replay validation to a server-authoritative run service.

## Testnet note

The official SDK repository has documented recent testnet2 certification issues affecting some transfers. If a deposit is confirmed by the wallet but the backend cannot verify it immediately, use the same **claim deposit** action again rather than sending a second payment. The SDK documentation explicitly warns not to blindly resend an indeterminate transfer.

## File map

- `src/App.tsx` — UI, wallet state, payment flow, game flow.
- `src/game.ts` — canvas runner and collision physics.
- `src/sphere.ts` — Sphere Connect constants and deposit intent.
- `src/api.ts` — frontend API calls.
- `api/config.ts` — exposes the treasury's public address only.
- `api/deposit.ts` — verifies an incoming 5 UCT transfer through the treasury wallet before adding attempts.
- `api/score.ts` — consumes one attempt and records a run.
- `api/leaderboard.ts` — returns live database rankings.
- `api/player.ts` — returns the connected player's attempts/best.
- `lib/server.ts` — server-side Sphere + Supabase setup.
- `public/character.jpeg` — supplied image used as the character.
- `supabase.sql` — database schema.

## Official references

Sphere SDK: https://github.com/unicity-sphere/sphere-sdk

Sphere Connect reference: https://github.com/unicity-sphere/sphere-sdk/blob/main/docs/CONNECT.md

Sphere Connect examples: https://github.com/unicity-sphere/sphere-sdk-connect-example

Sphere wallet: https://sphere.unicity.network/
