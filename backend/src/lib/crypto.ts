import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;
const KEY_LENGTH_BYTES = 32;

function getEncryptionKey() {
    const encodedKey = process.env.EMAIL_TOKEN_ENCRYPTION_KEY;

    if (!encodedKey) {
        throw new Error("EMAIL_TOKEN_ENCRYPTION_KEY is not set");
    }

    const key = Buffer.from(encodedKey, "base64");

    if (key.length !== KEY_LENGTH_BYTES) {
        throw new Error(
            "EMAIL_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key"
        );
    }

    return key;
}

export function encryptString(value: string): string {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH_BYTES);
    const cipher = createCipheriv(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH_BYTES,
    });

    const ciphertext = Buffer.concat([
        cipher.update(value, "utf8"),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
        iv.toString("base64"),
        authTag.toString("base64"),
        ciphertext.toString("base64"),
    ].join(":");
}

export function decryptString(encryptedValue: string): string {
    const key = getEncryptionKey();
    const [ivBase64, authTagBase64, ciphertextBase64] = encryptedValue.split(":");

    if (!ivBase64 || !authTagBase64 || !ciphertextBase64) {
        throw new Error("Encrypted value has invalid format");
    }

    const iv = Buffer.from(ivBase64, "base64");
    const authTag = Buffer.from(authTagBase64, "base64");
    const ciphertext = Buffer.from(ciphertextBase64, "base64");

    if (iv.length !== IV_LENGTH_BYTES || authTag.length !== AUTH_TAG_LENGTH_BYTES) {
        throw new Error("Encrypted value has invalid format");
    }

    const decipher = createDecipheriv(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH_BYTES,
    });
    decipher.setAuthTag(authTag);

    return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
    ]).toString("utf8");
}
