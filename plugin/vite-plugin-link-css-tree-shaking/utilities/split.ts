import type { KeyAndValueObject, CssRuleObject, CssRuleObjectArrayBasic, CssRuleObjectArray } from '../interfaces/index.ts';

function splitKeyAndValue(sentence: string): KeyAndValueObject {
    const [key, value] = sentence.split(':');
    return { key: key.trim(), value: value?.replace('}', '').trim() || '' };
}

export function splitKeyAndValueToArray(sentences: string): KeyAndValueObject[] {
    const { contents } = splitRuleBasic(sentences);
    return contents.map(c => splitKeyAndValue(c));
}

function splitRule(rule: string): CssRuleObject {
    const ruleArray = rule.split('{');
    const s = ruleArray.shift();
    const c = ruleArray.join('{');

    const selector = s?.trim() || '';
    const content = c?.trim() || '';
    return { selector, content };
}

export function splitRuleBasic(rule: string): CssRuleObjectArrayBasic {
    const { selector, content } = splitRule(rule);
    const selectors = (selector?.trim() || '').split(',').filter(s => s.trim() && s.length > 0);
    const contents = (content?.trim() || '').split(';').filter(c => c.trim() && c.length > 1);
    return { selectors, contents };
}

function splitRuleToArray(rule: string): CssRuleObjectArray {
    const { selector, content } = splitRule(rule);

    if (selector.includes('@media') || selector.includes('@container')) {
        const sub = content.split('}').filter(c => c.trim() && c.length > 1);
        return { selectors: [selector], contents: sub.map(s => splitRuleBasic(s)) };
    } else {
        return splitRuleBasic(rule);
    }
}

export function splitCssFile(cssContent: string): CssRuleObjectArray[] {
    const array = splitCssToArray(cssContent);
    return array.map(rule => splitRuleToArray(rule));
}

export function splitCssToArray(cssContent: string, sortByOrder: boolean = false): string[] {
    if (!cssContent.trim()) return [];

    const cssArray = cssContent.split('}');
    const cssResult: string[] = [];

    const tempArray: string[] = [];
    let finishFlag = true;

    for (let r = 0; r < cssArray.length; r++) {
        const rule = cssArray[r].trim();
        if (rule.includes('@')) {
            finishFlag = false;
            tempArray.push(`${rule}}`);
        } else if (!rule && tempArray.length > 0) {
            finishFlag = true;
            cssResult.push(`${tempArray.join('')}}`);
            tempArray.length = 0;
        } else {
            finishFlag ? cssResult.push(`${rule}}`) : tempArray.push(`${rule}}`);
        }
    }
    return sortByOrder ? cssResult.sort() : cssResult;
}
