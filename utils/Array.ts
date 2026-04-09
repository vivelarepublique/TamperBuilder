export function uniq<T extends string | number | boolean>(arr: T[]): T[] {
    return Array.from(new Set(arr));
}
