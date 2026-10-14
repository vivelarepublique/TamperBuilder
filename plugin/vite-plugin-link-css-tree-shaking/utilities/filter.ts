import { simplifySelector } from './replace.ts';
import { splitKeyAndValueToArray } from './split.ts';
import type { KeyAndValueObject, CssRuleObjectArrayBasic, CssRuleObjectArray, FiltrationCondition } from '../interfaces/index.ts';

function classSelectorFilter(selectors: string[], target: string, classes: string[], tags: string[]): boolean {
    return selectors
        .filter(i => i.includes('.'))
        .some(j =>
            j.split(' ').every(
                k =>
                    k === `.${target}` ||
                    tags.includes(k) ||
                    k
                        .split('.')
                        .filter(l => l)
                        .every(m => classes.includes(m)),
            ),
        );
}

export function filterCssUsed(cssContent: CssRuleObjectArray[], option: FiltrationCondition): string[] {
    const { tags, classes } = option;

    const filtered = cssContent.filter(({ selectors, contents }) => {
        if (selectors.length === 0 || contents.length === 0) return false;

        const [firstSelector] = selectors;
        if (selectors.includes('body') || selectors.includes('html') || selectors.includes('*') || selectors.includes(':root') || firstSelector.includes('@keyframes')) {
            return true;
        } else {
            const simplifiedSelectors = selectors.map(s => simplifySelector(s));
            if (firstSelector.includes('@media') || firstSelector.includes('@container')) {
                const cs = contents as CssRuleObjectArrayBasic[];
                return cs.some(i => {
                    const { selectors: _selectors } = i;
                    const _sSelectors = _selectors.map(s => simplifySelector(s));
                    return !!classes.find(name => {
                        return classSelectorFilter(_sSelectors, name, classes, tags);
                    });
                });
            } else {
                return (
                    !!tags.find(tag => {
                        return simplifiedSelectors.some(s => {
                            return !s.includes('.') && s.split(' ').includes(tag);
                        });
                    }) ||
                    !!classes.find(name => {
                        return simplifiedSelectors.some(s => s.includes('.')) && classSelectorFilter(simplifiedSelectors, name, classes, tags);
                    })
                );
            }
        }
    });

    return filtered.map(({ selectors, contents }) => {
        const s = selectors.join(',');
        if (s.includes('@media') || s.includes('@container')) {
            const cs = contents as CssRuleObjectArrayBasic[];
            const c = cs.reduce((previous, current) => {
                const { selectors: _selectors, contents: _contents } = current;
                return previous + _selectors.join(',') + '{' + _contents.join(';') + '}';
            }, '');
            return s + '{' + c + '}';
        } else {
            const cs = contents as string[];
            const c = cs.join(';');
            return s + '{' + c;
        }
    });
}

export function pickupRootFromFiltered(filteredCss: string[]): KeyAndValueObject[] {
    const roots = filteredCss.filter(i => i.startsWith(':root'));
    return roots.reduce((previous, current) => {
        return previous.concat(splitKeyAndValueToArray(current));
    }, [] as KeyAndValueObject[]);
}

export function filterRegularCss(filteredCss: string[]): string[] {
    return filteredCss.filter(i => !i.startsWith(':root'));
}
