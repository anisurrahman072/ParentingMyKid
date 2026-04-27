import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const KDF_SALT = 'pmk-child-pin-v1';
const KEY_LEN = 32;

/**
 * Reversible encryption for child PINs so parents can see digits after reinstall.
 * Login still uses bcrypt (`pinHash`) only — this field is for parent UI recovery.
 */
@Injectable()
export class ChildPinCryptoService {
  constructor(private readonly config: ConfigService) {}

  private deriveKey(): Buffer {
    const secret = this.config.get<string>('CHILD_PIN_ENCRYPTION_KEY');
    if (!secret || secret.length < 16) {
      throw new InternalServerErrorException(
        'CHILD_PIN_ENCRYPTION_KEY must be set (use a long random string; see .env.example)',
      );
    }
    return scryptSync(secret, KDF_SALT, KEY_LEN);
  }

  encryptPin(pin: string): string {
    if (!/^\d{4}$/.test(pin)) {
      throw new InternalServerErrorException('Invalid PIN');
    }
    const iv = randomBytes(12);
    const key = this.deriveKey();
    const cipher = createCipheriv(ALGO, key, iv);
    const enc = Buffer.concat([cipher.update(pin, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString('base64');
  }

  /** Returns null if missing, corrupt, or wrong key. */
  tryDecryptPin(pinEnc: string | null | undefined): string | null {
    if (!pinEnc) return null;
    try {
      const buf = Buffer.from(pinEnc, 'base64');
      if (buf.length < 12 + 16 + 1) return null;
      const iv = buf.subarray(0, 12);
      const tag = buf.subarray(12, 28);
      const data = buf.subarray(28);
      const decipher = createDecipheriv(ALGO, this.deriveKey(), iv);
      decipher.setAuthTag(tag);
      const plain = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
      return /^\d{4}$/.test(plain) ? plain : null;
    } catch {
      return null;
    }
  }
}
