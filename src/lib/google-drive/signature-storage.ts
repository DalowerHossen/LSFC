import "server-only";

import { createSign } from "node:crypto";
import { encryptAes256Gcm, decryptAes256Gcm } from "@/lib/encryption/aes-256";

type StorageConfig = {
  email: string;
  privateKey: string;
  folderId: string;
  encryptionKey: string;
};

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function getConfig(): StorageConfig {
  const email = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const folderId = process.env.GOOGLE_DRIVE_SIGNATURE_FOLDER_ID;
  const encryptionKey = process.env.SIGNATURE_ENCRYPTION_KEY;

  if (!email || !privateKey || !folderId || !encryptionKey) {
    throw new Error("Encrypted Google Drive signature storage is not configured");
  }

  return { email, privateKey, folderId, encryptionKey };
}

export function isSignatureStorageConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_DRIVE_PRIVATE_KEY &&
      process.env.GOOGLE_DRIVE_SIGNATURE_FOLDER_ID &&
      process.env.SIGNATURE_ENCRYPTION_KEY,
  );
}

async function getAccessToken(config: StorageConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(
    JSON.stringify({
      iss: config.email,
      scope: "https://www.googleapis.com/auth/drive.file",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsignedToken = `${header}.${claims}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const assertion = `${unsignedToken}.${base64Url(signer.sign(config.privateKey))}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error("Google Drive authorization failed");
  const body = (await response.json()) as { access_token?: string };
  if (!body.access_token) throw new Error("Google Drive access token is missing");
  return body.access_token;
}

export async function testSignatureStorageConnection(): Promise<void> {
  const config = getConfig();
  const accessToken = await getAccessToken(config);
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(config.folderId)}?fields=id,name,mimeType`,
    {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok) throw new Error("Google Drive folder verification failed");
  const result = (await response.json()) as { id?: string; mimeType?: string };
  if (!result.id || result.mimeType !== "application/vnd.google-apps.folder") {
    throw new Error("Configured Google Drive target is not a folder");
  }
}

export async function uploadEncryptedSignature(
  plainBytes: Buffer,
  encryptedFileName: string,
): Promise<{ fileId: string; encryptedSize: number }> {
  const config = getConfig();
  const encrypted = encryptAes256Gcm(plainBytes, config.encryptionKey);
  const accessToken = await getAccessToken(config);
  const boundary = `lsfc_${crypto.randomUUID().replaceAll("-", "")}`;
  const metadata = Buffer.from(
    JSON.stringify({
      name: encryptedFileName,
      parents: [config.folderId],
      description: "AES-256-GCM encrypted LSFC digital signature",
    }),
  );
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`),
    metadata,
    Buffer.from(`\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`),
    encrypted,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": `multipart/related; boundary=${boundary}`,
      },
      body,
      cache: "no-store",
    },
  );

  if (!response.ok) throw new Error("Encrypted signature upload failed");
  const result = (await response.json()) as { id?: string };
  if (!result.id) throw new Error("Google Drive file ID is missing");
  return { fileId: result.id, encryptedSize: encrypted.length };
}

export async function downloadDecryptedSignature(fileId: string): Promise<Buffer> {
  const config = getConfig();
  const accessToken = await getAccessToken(config);
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );

  if (!response.ok) throw new Error("Encrypted signature download failed");
  const encrypted = Buffer.from(await response.arrayBuffer());
  return decryptAes256Gcm(encrypted, config.encryptionKey);
}
