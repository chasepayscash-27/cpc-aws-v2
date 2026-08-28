# Scripts

## seed-cognito-users.js

Creates a Cognito user account for every employee listed in
`public/data/cpc_job_titles.csv`.

| Field used | CSV column | Value |
|---|---|---|
| Username / email | `employee_email` (B) | e.g. `chase@chasepayscash.com` |
| Temporary password | `default_password` (E) | `cpc2026` |

Each user is created in **FORCE_CHANGE_PASSWORD** status — they must set a
personal password on their very first login.

If a user already exists their temporary password is reset (useful for
re-running the script after a password policy change).

### Prerequisites

- AWS credentials configured for the target environment  
  (`AWS_PROFILE`, `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`, or IAM role)
- `cognito-idp:AdminCreateUser` and `cognito-idp:AdminSetUserPassword`
  permissions on the User Pool

### Run

```bash
# Install dependencies first (if not already done)
npm install

# Production environment
AWS_PROFILE=your-profile npm run seed:users

# Dry run – lists actions without calling AWS
DRY_RUN=true npm run seed:users

# Override the User Pool ID (e.g. for a different environment)
USER_POOL_ID=us-east-1_XXXXXXXX AWS_PROFILE=your-profile npm run seed:users
```

### Default User Pool

The script reads `amplify/amplify_outputs.json` automatically.  
Current User Pool: **us-east-1_8UfpHKlca**
