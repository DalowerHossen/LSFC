import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sql=await readFile("supabase/migrations/040_dashboard_application_trends.sql","utf8");
const pages=await Promise.all(["owner","operator","superadmin"].map(role=>readFile(`src/app/${role}/dashboard/page.tsx`,"utf8")));

test("dashboard trends require MFA and an authorized operational role",()=>{
 assert.match(sql,/actor_role not in\('super_admin','owner','operator'\) or not private\.mfa_satisfied\(\)/);
 assert.match(sql,/p_days not between 7 and 31/);
});
test("dashboard trend scope separates national, Center, and Operator data",()=>{
 assert.match(sql,/actor_role='super_admin'or\(a\.center_id=cid and\(actor_role='owner'or a\.created_by=actor_id\)\)/);
 assert.match(sql,/now\(\)at time zone'Asia\/Dhaka'/);
});
test("all operational dashboards render the live trend RPC",()=>{
 for(const page of pages){assert.match(page,/dashboard_application_trend/);assert.match(page,/DashboardTrendChart/)}
});
