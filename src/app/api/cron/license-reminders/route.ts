import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || expected.length < 32 || !supplied) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && timingSafeEqual(left, right);
}

function reminderDays() {
  const raw = process.env.LICENSE_REMINDER_DAYS;
  if (!raw) return null;
  const values = [...new Set(raw.split(",").map((item) => Number(item.trim())))];
  if (!values.length || values.length > 12 || values.some((day) => !Number.isInteger(day) || day < 1 || day > 365)) return null;
  return values;
}

function dhakaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const days = reminderDays();
  if (!days) return NextResponse.json({ error: "Approved reminder schedule is not configured" }, { status: 503 });
  if (!isSupabaseAdminConfigured()) return NextResponse.json({ error: "Scheduler database access is not configured" }, { status: 503 });
  const asOf = dhakaDate();
  const { data, error } = await createAdminClient().rpc("schedule_license_reminders", {
    p_as_of: asOf,
    p_days_before: days,
  });
  if (error) return NextResponse.json({ error: "Reminder scheduling failed" }, { status: 503 });
  return NextResponse.json({ scheduled: Number(data ?? 0), asOf, approvedOffsets: days }, { headers: { "cache-control": "no-store" } });
}
