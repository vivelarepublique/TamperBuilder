import crypto from 'node:crypto';
import type { SecureHashAlgorithm } from '../interfaces/index.ts';

export function hash(message: string, algorithm: SecureHashAlgorithm = 'sha256'): string {
    return crypto.createHash(algorithm).update(message).digest('hex');
}
