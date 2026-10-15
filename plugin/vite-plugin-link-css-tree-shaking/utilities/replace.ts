import type { KeyAndValueObject } from '../interfaces/index.ts';

export function removeCommentsAndCharset(content: string): string {
    return content.replaceAll(/(@charset "UTF-8";)|(\/\*[\s\S]*?\*\/)/g, '');
}

export function simplifySelector(selector: string): string {
    return selector.replaceAll(/[\+\>\*]|\[.*?\]|:{1,2}[a-z-]+(\(.*?\))?/g, '');
}

function replaceVariable(value: string, variables: Map<string, string>): string {
    return value.replaceAll(/var\(.+?\)/g, substring => {
        const variableName = substring.match(/(?<=var\().+?(?=\))/)?.[0];
        return variableName !== undefined && variables.has(variableName) ? variables.get(variableName)! : substring;
    });
}

export function replaceValueUsed(sentencesArray: KeyAndValueObject[], filteredCssRules: string[]): string[] {
    const array = sentencesArray.filter(i => i.key && i.value);
    const map = new Map<string, string>();

    const secondArray: KeyAndValueObject[] = [];
    const thirdArray: KeyAndValueObject[] = [];

    for (const obj of array) {
        const { key, value } = obj;
        if (!key.includes('--')) continue;

        if (value.includes('var(')) {
            secondArray.push(obj);
        } else {
            map.set(key, value);
        }
    }

    for (const obj of secondArray) {
        const { key, value } = obj;
        const replaced = replaceVariable(value, map);
        if (replaced.includes('var(')) {
            thirdArray.push(obj);
        } else {
            map.set(key, replaced);
        }
    }

    for (const obj of thirdArray) {
        const { key, value } = obj;
        map.set(key, replaceVariable(value, map));
    }

    return filteredCssRules.map(value => replaceVariable(value, map));
}
