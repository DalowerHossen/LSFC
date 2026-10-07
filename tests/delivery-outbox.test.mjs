import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sql = await readFile("supabase/migrations/049_delivery_outbox_and_reconciliation.sql", "utf8");
const cron = await readFile("src/app/api/cron/license-reminders/route.ts", "utf8");
const page = await readFile("src/app/superadmin/message-delivery/page.tsx", "utf8");
const ownerPage = await readFile("src/app/owner/message-delivery/page.tsx", "utf8");

test("application notifications are idempotently queued as template facts", () => {
  assert.match(sql, /applications_notification_outbox after insert or update of status/);
  assert.match(sql, /on conflict\(idempotency_key\) do nothing/);
  assert.match(sql, /jsonb_build_object\('tracking_id',new\.tracking_id,'status',new\.status\)/);
  assert.doesNotMatch(sql, /message_body|rendered_message/);
});

test("delivery claims use locking and immutable attempt history", () => {
  assert.match(sql, /for update skip locked limit p_limit/i);
  assert.match(sql, /message_attempts_immutable before update or delete/);
  assert.match(sql, /'dead_letter'::public\.message_delivery_status/);
  assert.match(sql, /make_interval\(mins=>least\(360,power\(2,n\)::integer\*5\)\)/);
});

test("license reminders require service role and externally configured offsets", () => {
  assert.match(sql, /auth\.role\(\).*service_role/);
  assert.match(sql, /p_days_before integer\[\]/);
  assert.match(cron, /LICENSE_REMINDER_DAYS/);
  assert.match(cron, /timingSafeEqual/);
  assert.doesNotMatch(cron, /LICENSE_REMINDER_DAYS\s*\?\?/);
});

test("delivery UI distinguishes queued events from proof of delivery", () => {
  assert.match(page, /কোনো বার্তা পাঠানোর প্রমাণ নয়/);
  assert.match(page, /dead_letter/);
  assert.match(page, /maskedPhone/);
});

test("Owners receive tenant-RLS delivery visibility without resend authority", () => {
  assert.match(ownerPage, /requireRole\(\["owner"\]\)/);
  assert.match(ownerPage, /from\("message_outbox"\)/);
  assert.match(ownerPage, /tenant-scoped/);
  assert.doesNotMatch(ownerPage, /retry_dead_letter_message|MessageRetryButton/);
});
