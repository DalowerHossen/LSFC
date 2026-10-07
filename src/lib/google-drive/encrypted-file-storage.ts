import "server-only";

import { createSign } from "node:crypto";
import { decryptAes256Gcm, encryptAes256Gcm } from "@/lib/encryption/aes-256";

type Config = { email: string; privateKey: string; rootFolderId: string; encryptionKey: string };
type UploadInput = { bytes: Buffer; encryptedName: string; centerCode: string; createdAt: Date };

function b64(value: string | Buffer) { return Buffer.from(value).toString("base64url"); }
function config(): Config {
  const email = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  const encryptionKey = process.env.FILE_ENCRYPTION_KEY;
  if (!email || !privateKey || !rootFolderId || !encryptionKey) throw new Error("Encrypted document storage is not configured");
  return { email, privateKey, rootFolderId, encryptionKey };
}
export function isEncryptedFileStorageConfigured() { return Boolean(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_DRIVE_PRIVATE_KEY && process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID && process.env.FILE_ENCRYPTION_KEY); }

async function token(c: Config) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64(JSON.stringify({ iss: c.email, scope: "https://www.googleapis.com/auth/drive.file", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const unsigned = `${header}.${claims}`;
  const signer = createSign("RSA-SHA256"); signer.update(unsigned); signer.end();
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${b64(signer.sign(c.privateKey))}` }), cache: "no-store" });
  if (!response.ok) throw new Error("Google Drive authorization failed");
  const body = await response.json() as { access_token?: string };
  if (!body.access_token) throw new Error("Google Drive token missing");
  return body.access_token;
}
function safeName(value: string) { return value.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 80) || "unknown"; }
function queryEscape(value: string) { return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'"); }
async function ensureFolder(accessToken: string, parent: string, name: string, key: string) {
  const q = `'${queryEscape(parent)}' in parents and trashed=false and mimeType='application/vnd.google-apps.folder' and appProperties has { key='lsfc_path' and value='${queryEscape(key)}' }`;
  const found = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`, { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!found.ok) throw new Error("Drive folder lookup failed");
  const files = await found.json() as { files?: { id: string }[] };
  if (files.files?.[0]?.id) return files.files[0].id;
  const made = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", { method: "POST", headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" }, body: JSON.stringify({ name: safeName(name), mimeType: "application/vnd.google-apps.folder", parents: [parent], appProperties: { lsfc_path: key } }), cache: "no-store" });
  if (!made.ok) throw new Error("Drive folder creation failed");
  const folder = await made.json() as { id?: string };
  if (!folder.id) throw new Error("Drive folder ID missing");
  return folder.id;
}
async function uploadEncryptedFile(input: UploadInput, category: string | null, leaf: string, description: string) {
  const c = config(); const accessToken = await token(c);
  const year = String(input.createdAt.getUTCFullYear());
  const month = `${year}-${String(input.createdAt.getUTCMonth() + 1).padStart(2, "0")}`;
  const centerKey = `center/${safeName(input.centerCode)}`;
  const center = await ensureFolder(accessToken, c.rootFolderId, `Center_${input.centerCode}`, centerKey);
  const yearFolder = await ensureFolder(accessToken, center, year, `${centerKey}/${year}`);
  const monthFolder = await ensureFolder(accessToken, yearFolder, month, `${centerKey}/${year}/${month}`);
  const categoryKey = category ? `${centerKey}/${year}/${month}/${safeName(category)}` : `${centerKey}/${year}/${month}`;
  const categoryFolder = category ? await ensureFolder(accessToken, monthFolder, category, categoryKey) : monthFolder;
  const leafKey = `${categoryKey}/${safeName(leaf)}`;
  const destination = await ensureFolder(accessToken, categoryFolder, leaf, leafKey);
  const encrypted = encryptAes256Gcm(input.bytes, c.encryptionKey);
  const boundary = `lsfc_${crypto.randomUUID().replaceAll("-", "")}`;
  const metadata = Buffer.from(JSON.stringify({ name: input.encryptedName, parents: [destination], description }));
  const body = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`), metadata, Buffer.from(`\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`), encrypted, Buffer.from(`\r\n--${boundary}--`)]);
  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", { method: "POST", headers: { authorization: `Bearer ${accessToken}`, "content-type": `multipart/related; boundary=${boundary}` }, body, cache: "no-store" });
  if (!response.ok) throw new Error("Encrypted document upload failed");
  const result = await response.json() as { id?: string };
  if (!result.id) throw new Error("Drive file ID missing");
  return { fileId: result.id, encryptedSize: encrypted.length, pathKey: leafKey };
}
export function uploadEncryptedApplicationFile(input: UploadInput & { serviceCode: string }) {
  return uploadEncryptedFile(input, null, input.serviceCode, "AES-256-GCM encrypted LSFC application document");
}
export function uploadEncryptedStaffFile(input: UploadInput & { profileId: string; documentType: string }) {
  return uploadEncryptedFile(input, "Staff", `${input.profileId}_${input.documentType}`, "AES-256-GCM encrypted LSFC staff document");
}
export function uploadEncryptedCenterAsset(input: UploadInput & { assetType: "logo" }) {
  return uploadEncryptedFile(input, "Branding", input.assetType, "AES-256-GCM encrypted LSFC Center branding asset");
}
export function uploadEncryptedLicenseEvidence(input: UploadInput & { documentType: string }) {
  return uploadEncryptedFile(input, "Compliance", input.documentType, "AES-256-GCM encrypted LSFC license evidence");
}
export function uploadEncryptedPdfArchive(input: UploadInput & { entityType:string;entityId:string }) {
  return uploadEncryptedFile(input, "Archives", `${input.entityType}_${input.entityId}`, "AES-256-GCM encrypted LSFC finalized PDF archive");
}
export async function deleteEncryptedDriveFile(fileId: string) {
  const c = config(); const accessToken = await token(c);
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, { method: "DELETE", headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!response.ok && response.status !== 404) throw new Error("Drive rollback failed");
}
export async function downloadDecryptedApplicationFile(fileId: string) {
  const c = config(); const accessToken = await token(c);
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!response.ok) throw new Error("Encrypted document download failed");
  return decryptAes256Gcm(Buffer.from(await response.arrayBuffer()), c.encryptionKey);
}
