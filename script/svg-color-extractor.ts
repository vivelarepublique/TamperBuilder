import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { argv } from 'node:process';

// Types
interface RGB {
    r: number;
    g: number;
    b: number;
}

interface ThemeEntry {
    name: string;
    value: string;
}

// CLI arguments
const targetDir = argv[2] ? resolve(argv[2]) : resolve('src/assets/svg');
const outputPath = argv[3] ? resolve(argv[3]) : resolve('temp/root.css');

export function extractColors(path: string): void {
    const files = readdirSync(path);
    const result: ThemeEntry[] = files.map(file => {
        const content = readFileSync(join(path, file), 'utf-8');
        const colors = (content.match(/#[a-fA-F0-9]{6}/g) || []).map((c: string) => c.toLowerCase());
        const name = file.replace(/\.svg$/i, '');

        if (colors.length === 0) return { name, value: '#000000' };
        if (colors.length === 1) return { name, value: softenColorExtremes(colors[0]) };
        if (colors.length <= 4) {
            const dominant = findMostFrequent(colors);
            return { name, value: softenColorExtremes(dominant || averageColors(colors)) };
        }
        return { name, value: softenColorExtremes(weightedColorMix(colors)) };
    });

    const cssVars = generateCssVars(result);
    writeFileSync(outputPath, `:root {\n${cssVars}\n}\n`, 'utf-8');
    console.log(`✅ CSS file written to ${outputPath}`);
}

// Color utilities
function hexToRgb(hex: string): RGB {
    const h = hex.replace('#', '');
    return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
    };
}

function rgbToHex({ r, g, b }: RGB): string {
    return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function softenExtreme(value: number, delta = 21): number {
    return value === 255 ? value - delta : value === 0 ? value + delta : value;
}

function softenColorExtremes(hex: string): string {
    const rgb = hexToRgb(hex);
    return rgbToHex({
        r: softenExtreme(rgb.r),
        g: softenExtreme(rgb.g),
        b: softenExtreme(rgb.b),
    });
}

function averageColors(colors: string[]): string {
    const sum = colors.reduce(
        (acc, hex) => {
            const rgb = hexToRgb(hex);
            acc.r += rgb.r;
            acc.g += rgb.g;
            acc.b += rgb.b;
            return acc;
        },
        { r: 0, g: 0, b: 0 },
    );
    const n = colors.length;
    return rgbToHex({ r: Math.round(sum.r / n), g: Math.round(sum.g / n), b: Math.round(sum.b / n) });
}

function weightedColorMix(colors: string[]): string {
    const freq = countFrequencies(colors);
    let total = 0;
    let sum = { r: 0, g: 0, b: 0 };
    for (const [hex, count] of freq.entries()) {
        const rgb = hexToRgb(hex);
        sum.r += rgb.r * count;
        sum.g += rgb.g * count;
        sum.b += rgb.b * count;
        total += count;
    }
    return rgbToHex({ r: Math.round(sum.r / total), g: Math.round(sum.g / total), b: Math.round(sum.b / total) });
}

function countFrequencies(arr: string[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const color of arr) {
        map.set(color, (map.get(color) || 0) + 1);
    }
    return map;
}

function findMostFrequent(colors: string[]): string | null {
    const freq = countFrequencies(colors);
    let max = 0;
    let dominant: string | null = null;
    for (const [color, count] of freq.entries()) {
        if (count > max) {
            max = count;
            dominant = color;
        }
    }
    return max > 1 ? dominant : null;
}

function generateCssVars(entries: ThemeEntry[]): string {
    return entries
        .map(({ name, value }) => {
            const bg = darken(value, 21);
            const border = darken(value, 42);
            const shadow = lighten(value, 21) + '84';
            return [`    --ft-color-${name}: ${value};`, `    --ft-background-color-${name}: ${bg};`, `    --ft-border-color-${name}: ${border};`, `    --ft-shadow-color-${name}: ${shadow};`].join('\n');
        })
        .join('\n');
}

function darken(hex: string, amount: number, limit = 21): string {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHex({
        r: Math.max(limit, r - amount),
        g: Math.max(limit, g - amount),
        b: Math.max(limit, b - amount),
    });
}

function lighten(hex: string, amount: number, limit = 210): string {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHex({
        r: Math.min(limit, r + amount),
        g: Math.min(limit, g + amount),
        b: Math.min(limit, b + amount),
    });
}

// Run
extractColors(targetDir);
