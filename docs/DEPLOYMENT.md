# LSFC production deployment runbook

## 1. Required infrastructure

- Node.js 22 runtime with HTTPS
- Supabase project with Auth, PostgreSQL, and email delivery configured
- Production origin assigned to `NEXT_PUBLIC_SITE_URL`
- A secret manager for every server-only credential
- A private Google Drive folder shared only with the configured service account

Never commit `.env.local`, service-role keys, provider tokens, private keys, or encryption keys.

## 2. Preflight

```bash
npm ci
npm run validate:release
npm run lint
npm run build
npm audit --audit-level=high
```

Run `npm run validate:release -- --strict-env` only inside the deployment environment. It confirms required core variables are present without printing their values.

## 3. Database migrations

Link the Supabase CLI to the intended project using the deployment platform's secure authentication, review the target project identifier, and then run:

```bash
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
npx supabase migration list
```

Migrations `001` through `049` must appear in order. Do not edit an already-applied migration; add a new migration instead. Take a database backup before the first production migration.

## 4. Authentication bootstrap

Create the initial Super Admin Auth user through a trusted administrative process. Bind its `profiles` row to role `super_admin` with no center, then enroll TOTP before using privileged routes. Never expose service-role credentials to browser code.

Configure the invitation redirect allowlist for:

- `${NEXT_PUBLIC_SITE_URL}/auth/callback`
- `${NEXT_PUBLIC_SITE_URL}/set-password`

## 5. Secrets and external services

Set all values documented in `.env.example` using the deployment secret manager. WhatsApp, SMS, and Google Drive tests are deliberately disabled until complete credentials exist. Use `/superadmin/integrations` after deployment to perform non-destructive connection checks.

The subscription overdue RPC requires a trusted daily scheduler. Invoke it with a short-lived AAL2-authorized administrative workflow; do not expose it as an unauthenticated cron URL.

License-reminder scheduling is deliberately separate from delivery:

- Set a random `CRON_SECRET` of at least 32 bytes.
- Set `LICENSE_REMINDER_DAYS` only after the policy owner approves the comma-separated offsets; the application assumes no default.
- Configure a trusted daily scheduler to `POST /api/cron/license-reminders` with `Authorization: Bearer <CRON_SECRET>`.
- Confirm idempotent events in `/superadmin/message-delivery`.
- Deploy and approve a separate worker that claims `claim_message_deliveries`, renders only provider-approved templates, sends WhatsApp first/SMS only under the approved fallback policy, and records every outcome with `record_message_delivery`.

The outbox alone does not send messages and must never be reported as delivery evidence.

## 6. Release checks

- `GET /api/health` returns HTTP 200.
- `GET /api/readiness` returns HTTP 200 only after core configuration and database connectivity succeed.
- Unauthenticated dashboard requests redirect to `/login`.
- Super Admin, Owner, and Operator test accounts reach only their assigned routes.
- TOTP enrollment and AAL2 verification work.
- Center suspension blocks operational APIs and pages.
- Audit-chain verification passes from `/superadmin/security`.
- Generate one test receipt, subscription voucher, cash closing, and monthly report.
- Verify encrypted signature upload/download using the real private Drive folder.
- Upload and download test application documents and confirm the Center → Year → Month → Service hierarchy, hashed names, AES-256-GCM decryption, and tenant isolation.

## 7. Rollback

Database migrations are intentionally forward-only because audit and financial records are immutable. For application rollback, deploy the previous application artifact while keeping the migrated schema. For schema defects, create a corrective forward migration; never delete audit, receipt, payment, report, or history records.
