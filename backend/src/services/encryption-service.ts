import { env } from "@/config/env";
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits
const TAG_LENGTH = 16; // 128 bits

export class EncryptionService {
  private key: Buffer;

  constructor() {
    const keyString = env.ENCRYPTION_KEY;
    if (!keyString || keyString.length !== 64) {
      // 32 bytes = 64 hex chars
      throw new Error(
        "ENCRYPTION_KEY must be a 64-character hex string (32 bytes)"
      );
    }
    this.key = Buffer.from(keyString, "hex");
  }

  encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
      cipher.setAAD(Buffer.from("mindease-chatbot", "utf8"));

      let encrypted = cipher.update(text, "utf8", "hex");
      encrypted += cipher.final("hex");

      const tag = cipher.getAuthTag();

      // Combine iv + tag + encrypted data
      return iv.toString("hex") + tag.toString("hex") + encrypted;
    } catch (error) {
      throw new Error("Encryption failed");
    }
  }

  decrypt(encryptedData: string): string {
    try {
      const ivHex = encryptedData.slice(0, IV_LENGTH * 2);
      const tagHex = encryptedData.slice(
        IV_LENGTH * 2,
        (IV_LENGTH + TAG_LENGTH) * 2
      );
      const encrypted = encryptedData.slice((IV_LENGTH + TAG_LENGTH) * 2);

      const iv = Buffer.from(ivHex, "hex");
      const tag = Buffer.from(tagHex, "hex");

      const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAAD(Buffer.from("mindease-chatbot", "utf8"));
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      throw new Error("Decryption failed");
    }
  }

  // Generate a secure random key
  static generateKey(): string {
    return crypto.randomBytes(KEY_LENGTH).toString("hex");
  }

  // Hash sensitive data (one-way)
  static hash(data: string): string {
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  // Generate session tokens
  static generateToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }
}

export const encryptionService = new EncryptionService();
