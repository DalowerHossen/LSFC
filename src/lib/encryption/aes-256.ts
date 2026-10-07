import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const MAGIC = Buffer.from("LSFC1", "ascii");
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function readKey(base64Key: string): Buffer {
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== 32) {
    throw new Error("Encryption key must be exactly 32 bytes in base64 form");
  }
  return key;
}

export function encryptAes256Gcm(plain: Buffer, base64Key: string): Buffer {
  const key = readKey(base64Key);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([MAGIC, iv, tag, encrypted]);
}

export function decryptAes256Gcm(payload: Buffer, base64Key: string): Buffer {
  const minimumLength = MAGIC.length + IV_LENGTH + TAG_LENGTH + 1;
  if (payload.length < minimumLength || !payload.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error("Encrypted signature payload is invalid");
  }

  const key = readKey(base64Key);
  const ivStart = MAGIC.length;
  const tagStart = ivStart + IV_LENGTH;
  const encryptedStart = tagStart + TAG_LENGTH;
  const iv = payload.subarray(ivStart, tagStart);
  const tag = payload.subarray(tagStart, encryptedStart);
  const encrypted = payload.subarray(encryptedStart);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
