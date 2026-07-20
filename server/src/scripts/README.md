# Fitness Age ETL

Computes each user's Fitness Age from the fitness product's `ebdb_stage` MySQL
warehouse and saves the result into this platform's own MongoDB. This is a
**manual, one-off script** — the running server never connects to
`ebdb_stage`. You run this by hand, whenever you want fresh data, while
connected to VPN.

## Files

| File | What it is |
|---|---|
| `fitnessAgeTargets.example.ts` | Tracked in git. Template/reference only. |
| `fitnessAgeTargets.ts` | **Edit this one.** Your local copy with real user_ids/names/emails. **Gitignored** — never committed, since it holds real PII once filled in. |
| `fitnessAgeEngine.ts` | Pure math — the Gompertz/Jackson formulas. No DB code. Shouldn't need to touch this. |
| `fitnessAgeEtl.ts` | Orchestration — connects to MySQL + Mongo, runs the engine, writes results. Runnable script. |

## One-time setup

1. Copy the template to create your local, gitignored targets file:
   ```
   cp src/scripts/fitnessAgeTargets.example.ts src/scripts/fitnessAgeTargets.ts
   ```
   (only needed once — `fitnessAgeTargets.ts` already exists if you're
   reading this after it was first set up)

2. Open `server/.env` and fill in the blank DB fields (left empty on purpose):
   ```
   FITNESS_DB_HOST_STAGE=
   FITNESS_DB_HOST_UAT=
   FITNESS_DB_USER=
   FITNESS_DB_PASSWORD=
   FITNESS_DB_NAME=ebdb_stage
   FITNESS_DB_PORT=3306
   ```
   These are private-network credentials — only reachable over VPN, never
   commit real values to a shared `.env.example`.

   Users can live in either of two source databases — **stage** and **uat**
   — same username/password, different host. You only need to fill in the
   host(s) your configured targets actually reference; the script skips
   connecting to the other one entirely.

3. Run `npm install` in `server/` if you haven't already (pulls in `mysql2`
   and `ts-node`, which this script needs).

## Every time you want to refresh data

1. **Connect to VPN.** The MySQL host is on a private network.

2. **Edit `fitnessAgeTargets.ts`** — add one entry per user you want computed:

   ```ts
   export const FITNESS_AGE_TARGETS: FitnessAgeTarget[] = [
     { fitnessAppUserId: 254885, displayName: 'Jane Doe', email: 'jane@nexxbase.com', env: 'stage' },
     { fitnessAppUserId: 118220, displayName: 'Preview User', env: 'uat' },
   ];
   ```

   - `fitnessAppUserId` — the real `user_id` from that environment's `user_infos` table.
   - `displayName` — shown in the UI. Required.
   - `email` (optional) — if it matches an existing platform account
     (`users` collection in Mongo), that account gets **automatically linked**
     to this Fitness Age profile, and that tester will see their own Fitness
     Age under the "Fitness Age" tab. Leave it out for people who aren't
     onboarded on this platform at all (they'll still show up for admins).
   - `env` (optional) — `'stage'` or `'uat'`, whichever database this
     user's data actually lives in. **Defaults to `'stage'` if omitted.**
     You can freely mix both in the same list — the script connects to
     each environment referenced and routes each user to the right one.

3. **Run it** from `server/`:
   ```
   npm run etl:fitness-age
   ```

4. Watch the output — one line per user:
   ```
   ✅ Jane Doe (user_id 254885, stage) — 60d: 32.4y — 🔗 linked to jane@nexxbase.com
   ✅ Preview User (user_id 118220, uat) — 60d: Not enough data. Found 9/20 required days.
   ❌ Failed for Someone (user_id 999999, uat): <error>
   ```

That's it — the results are now in Mongo (`fitnessageprofiles` collection),
and the app reads them from there. No live connection to `ebdb_stage` is
needed until you want to refresh again.

## Where results get written: dev vs production Mongo

This is a **separate switch from everything above** — it controls where the
*results* land, not where the source data comes from. Unlike `ebdb_stage`,
your MongoDB Atlas cluster is already reachable from anywhere (no VPN
needed) — the only question is which database on that cluster to write to.

Controlled by `FITNESS_ETL_MONGO_TARGET` in `server/.env`:

- **`dev`** (default, and used if the variable is missing or misspelled) —
  writes to `MONGODB_URI_DEV` (the test database). Safe to run anytime.
- **`production`** — writes to `MONGODB_URI`, the real database your
  deployed Cloud Run app reads from. Because this also **auto-links real
  Users documents** (setting `metadata.fitnessAppUserId` when a target's
  `email` matches an existing account), the script will pause and require
  you to type the exact database name shown before it connects:

  ```
  🗄️  Mongo target: PRODUCTION (database "Performance_testing")

  ⚠️  This will write to PRODUCTION Mongo — database "Performance_testing" — including auto-linking
     real Users documents. Type the database name ("Performance_testing") to confirm, anything else aborts:
  ```

  Typing anything else (or just hitting enter) aborts before any connection
  is made — no MySQL or Mongo connection happens until you confirm.

This is deliberately **not** the same flag as the server's general `ENV`
variable, so a leftover `ENV=production` from some other local testing can
never accidentally cause this script to write to prod — you have to opt in
explicitly, every time.

**Before using `production`:** double-check that `MONGODB_URI` in your local
`.env` is actually the same connection string configured on the real Cloud
Run deployment (e.g. in its Cloud Run environment variables / Secret
Manager) — if they've drifted, "production" here might not mean what you
think it means.

## Troubleshooting

- **`FITNESS_DB_HOST_STAGE is not set...` / `FITNESS_DB_HOST_UAT is not set...`**
  — a target references that environment (or defaults to `'stage'`) but its
  host isn't filled in in `server/.env`, or `.env` didn't load. Make sure
  you're running from `server/`.
- **Connection timeout / `ETIMEDOUT`** — you're not on VPN, or the VPN
  doesn't route to that private IP.
- **`Not enough data. Found X/20 required days.`** — not an error. The
  60-day window needs 20+ days with any wear data, the 7-day window needs 3+.
  The profile still saves; the UI just shows a "still calibrating" state for
  that window.
- **A user never shows up for a tester** — check that the `email` in
  `fitnessAgeTargets.ts` exactly matches their platform account's email
  (case-insensitive, but must otherwise match).
- **`MONGODB_URI is not set — required to target production Mongo...`** —
  `FITNESS_ETL_MONGO_TARGET=production` but `MONGODB_URI` is blank in `.env`.
- **Script exits right after the confirmation prompt with "Aborted"** —
  that's expected if you didn't type the database name exactly. Re-run and
  type it precisely (it's echoed back to you in the prompt) to proceed.
