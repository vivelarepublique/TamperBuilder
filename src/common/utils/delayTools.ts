export function debounce<TArgs extends unknown[]>(func: (...args: TArgs) => unknown, wait: number): (...args: TArgs) => void {
    let timeout: number | null = null;

    return (...args) => {
        if (timeout !== null) window.clearTimeout(timeout);
        timeout = window.setTimeout(() => {
            func(...args);
        }, wait);
    };
}

export function throttle<TArgs extends unknown[]>(func: (...args: TArgs) => unknown, limit: number): (...args: TArgs) => void {
    let timer: number | null = null;

    return (...args) => {
        if (!timer) {
            timer = window.setTimeout(() => {
                func(...args);
                timer = null;
            }, limit);
        }
    };
}
