import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const dir = "supabase/migrations";
const files = (await readdir(dir)).filter((name) => name.endsWith(".sql")).sort();
const sources = await Promise.all(files.map(async (name) => ({ name, sql: (await readFile(`${dir}/${name}`, "utf8")).toLowerCase() })));
const allSql = sources.map(({ sql }) => sql).join("\n");

test("migration sequence is continuous", () => {
  files.forEach((name, index) => assert.equal(Number(name.slice(0, 3)), index + 1, `gap before ${name}`));
});

test("every public table has forced RLS", () => {
  const tables = new Set([...allSql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z_]+)/g)].map((match) => match[1]));
  assert.ok(tables.size >= 48, "unexpected schema shrink");
  for (const table of tables) {
    assert.match(allSql, new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`), `${table} must enable RLS`);
    assert.match(allSql, new RegExp(`alter\\s+table\\s+public\\.${table}\\s+force\\s+row\\s+level\\s+security`), `${table} must force RLS`);
  }
});

test("all security-definer functions pin search_path", () => {
  const starts = [...allSql.matchAll(/create\s+or\s+replace\s+function\s+/g)].map((match) => match.index);
  starts.forEach((start, index) => {
    const block = allSql.slice(start, starts[index + 1] ?? allSql.length);
    if (/security\s+definer/.test(block)) assert.match(block, /set\s+search_path\s*=/, block.slice(0, 120));
  });
});

test("destructive table operations and direct row deletion are absent", () => {
  for (const { name, sql } of sources) {
    assert.doesNotMatch(sql, /\bdrop\s+(table|schema|database)\b/, name);
    assert.doesNotMatch(sql, /\btruncate\b/, name);
    assert.doesNotMatch(sql, /\bdelete\s+from\b/, name);
  }
});

test("legacy direct profile and center writes are revoked", () => {
  assert.match(allSql, /revoke\s+insert\s+on\s+public\.centers\s+from\s+authenticated/);
  assert.match(allSql, /revoke\s+update\(full_name,phone\)on\s+public\.profiles\s+from\s+authenticated/);
});
