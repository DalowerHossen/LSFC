import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const layout = await readFile("src/app/layout.tsx", "utf8");
const css = await readFile("src/app/globals.css", "utf8");
const publicHeader = await readFile("src/components/common/PublicHeader.tsx", "utf8");
const dashboard = await readFile("src/components/layouts/DashboardShell.tsx", "utf8");

test("document language and keyboard skip target are defined", () => {
  assert.match(layout, /<html lang="bn"/);
  assert.match(layout, /href="#main-content"/);
  assert.match(layout, /id="main-content" tabIndex=\{-1\}/);
});

test("global keyboard focus and reduced-motion preferences are visible", () => {
  assert.match(css, /:focus-visible/);
  assert.match(css, /\.skip-link:focus/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test("primary public and dashboard navigation expose accessible state", () => {
  assert.match(publicHeader, /aria-label="প্রধান নেভিগেশন"/);
  assert.match(publicHeader, /aria-expanded=\{menuOpen\}/);
  assert.match(dashboard, /aria-label="ড্যাশবোর্ড নেভিগেশন"/);
  assert.match(dashboard, /aria-label="মেনু খুলুন"/);
});
