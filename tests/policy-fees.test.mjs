import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const seed = (await readFile("supabase/migrations/002_seed_government_fees.sql", "utf8")).toLowerCase();
const upazila = (await readFile("supabase/migrations/027_seed_upazila_fees.sql", "utf8")).toLowerCase();
const reprints = (await readFile("supabase/migrations/033_receipt_print_ledger.sql", "utf8")).toLowerCase();

const serviceRows = [...seed.matchAll(/\('([a-z0-9-]+)',\s*'[^']+',\s*'[^']+',\s*(\d+)\)/g)];
const feeRows = [...seed.matchAll(/\('([a-z0-9-]+)',\s*'(union_upazila|pourashava|city_corporation_savar)',\s*(null|\d+),\s*(\d+)\)/g)];

test("Appendix-7 has exactly 14 ordered services and 42 initial tier rows", () => {
  assert.equal(new Set(serviceRows.map((row) => row[1])).size, 14);
  assert.deepEqual(serviceRows.map((row) => Number(row[2])), Array.from({ length: 14 }, (_, index) => index + 1));
  assert.equal(feeRows.length, 42);
});

test("critical Appendix-7 amounts match the recorded policy baseline", () => {
  const matrix = new Map(feeRows.map((row) => [`${row[1]}:${row[2]}`, row[3] === "null" ? null : Number(row[3])]));
  assert.equal(matrix.get("land-tax-registration:union_upazila"), 50);
  assert.equal(matrix.get("e-mutation-application:union_upazila"), 200);
  assert.equal(matrix.get("e-mutation-application:pourashava"), 250);
  assert.equal(matrix.get("e-mutation-application:city_corporation_savar"), 300);
  assert.equal(matrix.get("khas-land-settlement:city_corporation_savar"), 120);
  assert.equal(matrix.get("other-approved-service:union_upazila"), null);
  assert.match(seed, /'e-mutation-application',\s*'union_upazila',\s*200,\s*3/);
});

test("Appendix-6 license tiers distinguish Union and Upazila Sadar", () => {
  assert.match(seed, /\('union_upazila',\s*3000\)/);
  assert.match(seed, /\('pourashava',\s*5000\)/);
  assert.match(seed, /\('city_corporation_savar',\s*8000\)/);
  assert.match(upazila, /'upazila_sadar'/);
  assert.match(upazila, /5000/);
});

test("first receipt copy is free and later copies cost BDT 20", () => {
  assert.match(reprints, /case\s+when\s+v_copy=1\s+then\s+0\s+else\s+20\s+end/);
  assert.match(reprints, /unique\(receipt_id,copy_number\)/);
});
