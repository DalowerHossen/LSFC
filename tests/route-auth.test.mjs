import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? walk(path.join(directory, entry.name)) : path.join(directory, entry.name)))).flat();
}
const files = await walk("src/app");

test("every protected role page invokes requireRole", async () => {
  const pages = files.filter((file) => /src\/app\/(owner|operator|superadmin)\/.+page\.tsx$/.test(file));
  assert.ok(pages.length >= 35);
  for (const file of pages) assert.match(await readFile(file, "utf8"), /requireRole\(/, file);
});

test("non-public server action modules enforce identity or role", async () => {
  const actions = files.filter((file) => file.endsWith("actions.ts") && !file.includes("/(public)/") && !file.includes("/(auth)/"));
  for (const file of actions) {
    const source = await readFile(file, "utf8");
    assert.match(source, /requireRole\(|getAuthContext\(|supabase\.auth\./, file);
  }
});

test("sensitive download APIs require validated auth and block caching", async () => {
  for (const file of ["src/app/api/documents/[id]/route.ts", "src/app/api/signatures/[id]/route.ts", "src/app/api/staff-documents/[id]/route.ts", "src/app/api/center-assets/[id]/route.ts", "src/app/api/license-evidence/[id]/route.ts", "src/app/api/pdf-archives/[id]/route.ts"]) {
    const source = await readFile(file, "utf8");
    assert.match(source, /getAuthContext\(\)/);
    assert.match(source, /getMfaStep\(context\)/);
    assert.match(source, /private, no-store/);
    assert.match(source, /centerStatus/);
  }
});

test("browser-facing source does not call localhost services", async () => {
  const browserFiles = (await walk("src")).filter((file) => /\.(ts|tsx)$/.test(file));
  for (const file of browserFiles) assert.doesNotMatch(await readFile(file, "utf8"), /https?:\/\/(localhost|127\.0\.0\.1)/, file);
});
