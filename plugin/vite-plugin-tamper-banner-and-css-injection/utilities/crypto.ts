import crypto from 'node:crypto';
import { SecureHashAlgorithm } from '../interfaces';

export function hash(message: string, algorithm: SecureHashAlgorithm = 'sha256'): string {
    return crypto.createHash(algorithm).update(message).digest('hex');
}
