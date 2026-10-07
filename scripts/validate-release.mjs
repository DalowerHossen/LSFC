import { readdir, readFile, access } from "node:fs/promises";
import process from "node:process";

const failures=[];const warnings=[];
const requiredFiles=["package-lock.json","next.config.ts","netlify.toml","supabase/config.toml","public/sw.js"];
for(const file of requiredFiles){try{await access(file)}catch{failures.push(`Missing required file: ${file}`)}}
const files=(await readdir("supabase/migrations")).filter(x=>x.endsWith(".sql")).sort();
const migrationSql=[];
const numbers=files.map(x=>Number(x.slice(0,3)));
for(let i=0;i<numbers.length;i++)if(numbers[i]!==i+1)failures.push(`Migration sequence gap at ${i+1}`);
for(const file of files){const sql=(await readFile(`supabase/migrations/${file}`,"utf8")).toLowerCase();migrationSql.push(sql);if(/\bdrop\s+(table|schema|database)\b/.test(sql))failures.push(`${file}: destructive DROP detected`);if(/\btruncate\b/.test(sql))failures.push(`${file}: TRUNCATE detected`);if(/\bdelete\s+from\b/.test(sql))failures.push(`${file}: direct DELETE detected`);if(!sql.trim().endsWith(";")&&!sql.trim().endsWith("$$;"))warnings.push(`${file}: unusual SQL terminator`)}
const allSql=migrationSql.join("\n");
const tables=[...allSql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z_]+)/g)].map(match=>match[1]);
for(const table of new Set(tables)){
  const escaped=table.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  if(!new RegExp(`alter\\s+table\\s+public\\.${escaped}\\s+enable\\s+row\\s+level\\s+security`).test(allSql))failures.push(`${table}: RLS is not enabled`);
  if(!new RegExp(`alter\\s+table\\s+public\\.${escaped}\\s+force\\s+row\\s+level\\s+security`).test(allSql))failures.push(`${table}: RLS is not forced`);
}
const appendixSeed=migrationSql[1]??"";
const serviceCodes=[...appendixSeed.matchAll(/\('([a-z0-9-]+)',\s*'[^']+',\s*'[^']+',\s*\d+\)/g)].map(match=>match[1]);
if(new Set(serviceCodes).size!==14)failures.push(`Appendix-7 catalogue must contain exactly 14 unique services; found ${new Set(serviceCodes).size}`);
const requiredFeeEvidence=[
  "('union_upazila', 3000)","('pourashava', 5000)","('city_corporation_savar', 8000)",
  "('e-mutation-application', 'union_upazila', 200, 3)","('e-mutation-application', 'pourashava', 250, 3)","('e-mutation-application', 'city_corporation_savar', 300, 3)",
  "('khas-land-settlement', 'city_corporation_savar', 120, 0)","('other-approved-service', 'union_upazila', null, 0)",
];
for(const evidence of requiredFeeEvidence)if(!appendixSeed.includes(evidence))failures.push(`Appendix fee evidence missing: ${evidence}`);
const requiredRoutes=[
  "src/app/(public)/services/page.tsx","src/app/(public)/track/page.tsx","src/app/(public)/verify/[qr]/page.tsx","src/app/(auth)/forgot-password/page.tsx",
  "src/app/operator/consent-form/[id]/page.tsx","src/app/operator/print-receipt/[id]/page.tsx","src/app/operator/applications/[id]/documents/page.tsx","src/app/api/documents/[id]/route.ts",
  "src/app/(public)/register-center/page.tsx","src/app/(public)/account-recovery/page.tsx","src/app/superadmin/registration-requests/page.tsx","src/app/superadmin/recovery-requests/page.tsx",
  "src/app/owner/compliance/rate-chart/page.tsx","src/app/owner/compliance/signboard/page.tsx","src/app/owner/audit-logs/page.tsx","src/app/owner/message-delivery/page.tsx","src/app/owner/print-settings/page.tsx","src/app/owner/staff/[id]/page.tsx","src/app/api/staff-documents/[id]/route.ts","src/app/api/center-assets/[id]/route.ts","src/app/api/license-evidence/[id]/route.ts","src/app/api/pdf-archives/[id]/route.ts","src/app/api/cron/license-reminders/route.ts","src/app/superadmin/storage-cleanup/page.tsx","src/app/superadmin/message-delivery/page.tsx",
];
for(const route of requiredRoutes){try{await access(route)}catch{failures.push(`Required policy route missing: ${route}`)}}
const runtime=["NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_ANON_KEY","SUPABASE_SERVICE_ROLE_KEY","NEXT_PUBLIC_SITE_URL"];
const missing=runtime.filter(key=>!process.env[key]);if(missing.length)warnings.push(`Runtime environment missing: ${missing.join(", ")}`);
const strict=process.argv.includes("--strict-env");if(strict&&missing.length)failures.push("Strict environment validation failed");
const result={ok:failures.length===0,migrations:files.length,failures,warnings};console.log(JSON.stringify(result,null,2));if(failures.length)process.exit(1);
