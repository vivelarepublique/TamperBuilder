export function deepEqual(original: unknown, reference: unknown): boolean {
    if (original === reference) return true;

    if (typeof original !== 'object' || original === null || typeof reference !== 'object' || reference === null) return false;

    const originalRecord = original as Record<string, unknown>;
    const referenceRecord = reference as Record<string, unknown>;
    const originalKeys = Object.keys(originalRecord);
    const referenceKeys = Object.keys(referenceRecord);

    if (originalKeys.length !== referenceKeys.length) return false;

    for (const key of originalKeys) {
        if (!referenceKeys.includes(key) || !deepEqual(originalRecord[key], referenceRecord[key])) return false;
    }

    return true;
}

export function deepClone(obj: Record<string, unknown> | null): Record<string, unknown> | null {
    try {
        if (obj === null || typeof obj !== 'object') throw new Error('Cannot clone non-object.');
        const clone: unknown = JSON.parse(JSON.stringify(obj));
        if (typeof clone !== 'object' || clone === null || Array.isArray(clone)) throw new Error('Serialized value is not an object.');
        return clone as Record<string, unknown>;
    } catch (error) {
        console.error('Object cannot be serialized:', error);
        return null;
    }
}
