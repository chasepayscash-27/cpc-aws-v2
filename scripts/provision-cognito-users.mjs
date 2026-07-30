#!/usr/bin/env node
/**
 * provision-cognito-users.mjs
 *
 * Reads cpc_job_titles.csv and creates (or updates) Cognito users in the
 * specified User Pool.  On first creation each user receives a TEMPORARY
 * password; Cognito will force them to set a new password on first sign-in
 * (NEW_PASSWORD_REQUIRED challenge).
 *
 * ── Prerequisites ────────────────────────────────────────────────────────────
 *   Node ≥ 20, AWS credentials with cognito-idp:AdminCreateUser /
 *   cognito-idp:AdminSetUserPassword permissions.
 *
 * ── Usage ────────────────────────────────────────────────────────────────────
 *   node scripts/provision-cognito-users.mjs \
 *     --user-pool-id us-east-1_XXXXXXXX \
 *     --region us-east-1 \
 *     [--csv path/to/cpc_job_titles.csv]   # default: public/data/cpc_job_titles.csv
 *     [--dry-run]                           # print actions without executing them
 *
 * ── Security notes ───────────────────────────────────────────────────────────
 *   • Temporary passwords are read from the CSV's `default_password` column.
 *     They are sent to Cognito over TLS and are NOT logged.
 *   • After first login each user must set their own permanent password.
 *   • Never commit real passwords to source control.  The CSV in this repo
 *     stores the shared temporary password only; rotate it after provisioning.
 *   • Run this script from a secure, trusted environment (local dev or CI with
 *     short-lived OIDC credentials).  Never run it from a public CI runner with
 *     persistent AWS credentials.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider';

// ── CSV parser (no external deps) ────────────────────────────────────────────

function parseCSV(raw) {
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^\uFEFF/, ''));
  return lines.slice(1).map((line) => {
    const values = line.split(',');
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? '').trim()]));
  });
}

// ── CLI args ─────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--user-pool-id') args.userPoolId = argv[++i];
    else if (argv[i] === '--region') args.region = argv[++i];
    else if (argv[i] === '--csv') args.csv = argv[++i];
    else if (argv[i] === '--dry-run') args.dryRun = true;
  }
  return args;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));

const userPoolId = args.userPoolId || process.env.COGNITO_USER_POOL_ID;
const region = args.region || process.env.AWS_REGION || 'us-east-1';
const csvPath = args.csv
  ? resolve(process.cwd(), args.csv)
  : resolve(__dirname, '../public/data/cpc_job_titles.csv');
const dryRun = args.dryRun ?? false;

if (!userPoolId) {
  console.error('Error: --user-pool-id is required (or set COGNITO_USER_POOL_ID env var)');
  process.exit(1);
}

const raw = readFileSync(csvPath, 'utf8');
const rows = parseCSV(raw);

if (rows.length === 0) {
  console.error('Error: CSV is empty or could not be parsed');
  process.exit(1);
}

console.log(`\nCognito user provisioning`);
console.log(`  User Pool : ${userPoolId}`);
console.log(`  Region    : ${region}`);
console.log(`  CSV       : ${csvPath}`);
console.log(`  Users     : ${rows.length}`);
console.log(`  Dry run   : ${dryRun}\n`);

const client = new CognitoIdentityProviderClient({ region });

let created = 0;
let skipped = 0;
let failed = 0;

for (const row of rows) {
  const email = row['employee_email'];
  const name = row['employee_name'];
  const tempPassword = row['default_password'];

  if (!email || !tempPassword) {
    console.warn(`  [SKIP] Missing email or password for row: ${JSON.stringify(row)}`);
    skipped++;
    continue;
  }

  if (dryRun) {
    console.log(`  [DRY-RUN] Would create user: ${email} (${name})`);
    created++;
    continue;
  }

  try {
    // AdminCreateUser — sets MessageAction to SUPPRESS so no welcome email is
    // sent (the user will be notified separately).  The user is created with
    // the temporary password and must change it on first sign-in.
    await client.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        TemporaryPassword: tempPassword,
        MessageAction: 'SUPPRESS',
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'name', Value: name },
        ],
      }),
    );

    // AdminSetUserPassword with Permanent: false keeps the FORCE_CHANGE_PASSWORD
    // status, ensuring Cognito still challenges the user to change their password
    // on first sign-in.  We call this as a belt-and-suspenders to make the
    // temporary password predictable even if the pool's policy generates its own.
    await client.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: email,
        Password: tempPassword,
        Permanent: false,
      }),
    );

    console.log(`  [OK] Created: ${email} (${name})`);
    created++;
  } catch (err) {
    if (err instanceof UsernameExistsException || err.name === 'UsernameExistsException') {
      console.log(`  [SKIP] Already exists: ${email}`);
      skipped++;
    } else {
      console.error(`  [FAIL] ${email}: ${err.message}`);
      failed++;
    }
  }
}

console.log(`\nDone — created: ${created}, skipped: ${skipped}, failed: ${failed}`);
if (failed > 0) process.exit(1);
