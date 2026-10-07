import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile("supabase/migrations/039_encrypted_staff_documents.sql", "utf8");
const staffAction = await readFile("src/app/owner/staff/[id]/actions.ts", "utf8");
const applicationAction = await readFile("src/app/operator/applications/[id]/documents/actions.ts", "utf8");

test("staff document registration requires Owner MFA and tenant membership", () => {
  assert.match(migration, /private\.current_role\(\)<>'owner' or not private\.mfa_satisfied\(\)/);
  assert.match(migration, /p\.center_id=private\.current_center_id\(\)/);
  assert.match(migration, /p\.role='operator'/);
});

test("staff document metadata is immutable and limits sensitive file types", () => {
  assert.match(migration, /before update or delete on public\.staff_documents/);
  assert.match(migration, /document_type in\('nid','photo','signature'\)/);
  assert.match(migration, /p_document_type in\('photo','signature'\) and p_mime_type='application\/pdf'/);
});

test("Drive uploads are compensated when metadata registration fails", () => {
  assert.match(staffAction, /if\(error\).*deleteEncryptedDriveFile\(uploaded\.fileId\)/s);
  assert.match(applicationAction, /if \(error\).*deleteEncryptedDriveFile\(uploaded\.fileId\)/s);
});
