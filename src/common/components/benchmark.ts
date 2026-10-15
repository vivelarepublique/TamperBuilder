export interface RandomColor {
    backgroundColor: string;
    color: string;
    id: number;
}

export function measureRenderTime(renderFunction: (renderCount: number) => void, renderCount: number, recordFunction: (time: number) => void): void {
    const startTime = performance.now();
    requestAnimationFrame(() => {
        renderFunction(renderCount);
        requestAnimationFrame(() => {
            const endTime = performance.now();
            recordFunction(endTime - startTime);
        });
    });
}

export function generateRandomColor(id: number): RandomColor {
    const color = Math.floor(Math.random() * 16777215);
    const backgroundColor = Math.floor(Math.random() * 16777215);

    return {
        id,
        color: `#${color.toString(16).padStart(6, '0')}}`,
        backgroundColor: `#${backgroundColor.toString(16).padStart(6, '0')}`,
    };
}
