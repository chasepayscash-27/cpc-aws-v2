#!/usr/bin/env node
/**
 * seed-cognito-users.js
 *
 * Creates (or updates) one Cognito user per employee listed in
 * public/data/cpc_job_titles.csv.
 *
 * Each account is created with:
 *   - username  : employee_email (column B)
 *   - temp pwd  : default_password (column E, currently "cpc2026")
 *   - status    : FORCE_CHANGE_PASSWORD  (user must set a new password on first login)
 *
 * Usage:
 *   AWS_PROFILE=<your-profile> node scripts/seed-cognito-users.js
 *
 * Environment variables (override defaults):
 *   USER_POOL_ID   – Cognito User Pool ID (defaults to the value in amplify/amplify_outputs.json)
 *   AWS_REGION     – AWS region            (defaults to us-east-1)
 *   CSV_PATH       – path to employee CSV  (defaults to public/data/cpc_job_titles.csv)
 *   DRY_RUN        – set to "true" to print actions without calling AWS
 */

const fs   = require("fs");
const path = require("path");
const {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  UsernameExistsException,
} = require("@aws-sdk/client-cognito-identity-provider");

// ── Config ────────────────────────────────────────────────────────────────────
const repoRoot   = path.resolve(__dirname, "..");
const csvPath    = process.env.CSV_PATH    || path.join(repoRoot, "public/data/cpc_job_titles.csv");
const outputsPath = path.join(repoRoot, "amplify/amplify_outputs.json");
const outputs    = JSON.parse(fs.readFileSync(outputsPath, "utf8"));
const userPoolId = process.env.USER_POOL_ID || outputs.auth.user_pool_id;
const region     = process.env.AWS_REGION   || outputs.auth.aws_region || "us-east-1";
const dryRun     = process.env.DRY_RUN === "true";

// ── Parse CSV ─────────────────────────────────────────────────────────────────
function parseCsv(filePath) {
  const lines = fs.readFileSync(filePath, "utf8")
    .replace(/^\uFEFF/, "")   // strip BOM if present
    .split(/\r?\n/)
    .filter(Boolean);
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    return headers.reduce((obj, h, i) => {
      obj[h] = (cols[i] || "").trim();
      return obj;
    }, {});
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const employees = parseCsv(csvPath);
  console.log(`User Pool : ${userPoolId} (${region})`);
  console.log(`Employees : ${employees.length}`);
  if (dryRun) console.log("DRY RUN – no AWS calls will be made\n");

  const client = new CognitoIdentityProviderClient({ region });

  for (const emp of employees) {
    const email    = emp["employee_email"];
    const password = emp["default_password"];
    const name     = emp["employee_name"];

    if (!email || !password) {
      console.warn(`  SKIP  missing email or password for row: ${JSON.stringify(emp)}`);
      continue;
    }

    process.stdout.write(`  ${name} <${email}> … `);

    if (dryRun) {
      console.log("(dry-run) would create/reset");
      continue;
    }

    try {
      // Create the user (suppresses welcome email, sets temp password)
      await client.send(new AdminCreateUserCommand({
        UserPoolId       : userPoolId,
        Username         : email,
        TemporaryPassword: password,
        MessageAction    : "SUPPRESS",   // no auto-email; we control the creds
        UserAttributes   : [
          { Name: "email",          Value: email },
          { Name: "email_verified", Value: "true" },
          { Name: "name",           Value: name  },
        ],
      }));
      console.log("created (FORCE_CHANGE_PASSWORD)");
    } catch (err) {
      if (err.name === "UsernameExistsException") {
        // User already exists – reset their temporary password instead
        try {
          await client.send(new AdminSetUserPasswordCommand({
            UserPoolId: userPoolId,
            Username  : email,
            Password  : password,
            Permanent : false,   // keeps FORCE_CHANGE_PASSWORD status
          }));
          console.log("already exists – temp password reset");
        } catch (resetErr) {
          console.error(`FAILED to reset password: ${resetErr.message}`);
        }
      } else {
        console.error(`FAILED: ${err.message}`);
      }
    }
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
