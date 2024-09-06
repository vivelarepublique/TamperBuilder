import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function cssSplitAndReorganize(cssContent: string, sortByOrder: boolean = false): string[] {
    const cssArray = cssContent.split('}');
    const cssResult: string[] = [];

    const tempArray: string[] = [];
    let finishFlag = true;
    for (let i = 0; i < cssArray.length; i++) {
        if (cssArray[i].includes('@')) {
            finishFlag = false;
            tempArray.push(cssArray[i] + '}');
        } else if (cssArray[i].trim() === '') {
            finishFlag = true;
            cssResult.push(tempArray.join('') + '}');
            tempArray.length = 0;
        } else {
            finishFlag ? cssResult.push(cssArray[i] + '}') : tempArray.push(cssArray[i] + '}');
        }
    }
    return sortByOrder ? cssResult.sort() : cssResult;
}

function externalCssTransformation(cssPath: string): string[] {
    try {
        const file = readFileSync(cssPath, 'utf-8');
        const css = file.replaceAll(/(@charset "UTF-8";)|(\/\*[\s\S]*?\*\/)/g, '');
        return cssSplitAndReorganize(css);
    } catch (error) {
        console.log(error);
        return [];
    }
}

export function extractCssOnDemand(path: string, tagArray: string[], classArray: string[]): string[] {
    const minResult: string[] = [];
    const allCss = externalCssTransformation(path);

    const mediaQueryTemp: string[] = [];
    const keyFramesTemp: string[] = [];

    allCss.forEach(rule => {
        const css = rule.split('{');
        const selector = css[0].trim();
        if (selector === 'html' || selector === 'body' || selector.includes(':root')) {
            minResult.push(rule);
        } else {
            if (selector.includes('@keyframes') || selector.includes('@media')) {
                if (selector.includes('@keyframes')) {
                    keyFramesTemp.push(rule);
                }
                if (selector.includes('@media')) {
                    mediaQueryTemp.push(rule);
                }
            } else {
                tagArray.forEach(tag => {
                    if (selector.includes(',')) {
                        const selectors = selector.split(',').map(s => s.trim());
                        if (selectors.includes(tag)) {
                            minResult.push(rule);
                        }
                    } else {
                        const selectors = selector
                            .split(' ')
                            .filter(s => s)
                            .map(s => s.trim());
                        if (selectors.includes(tag)) {
                            minResult.push(rule);
                        }
                    }
                });
                classArray.forEach(className => {
                    if (selector.includes('.')) {
                        const selectors = selector
                            .replaceAll(/[\+\>\*]|\[.*?\]|:{1,2}[a-z]+((\(.*?\)))?/g, ' ')
                            .split(',')
                            .filter(s => s)
                            .map(s => s.trim());
                        if (selectors.some(s => className === s.substring(1))) {
                            minResult.push(rule);
                        }
                    }
                });
            }
        }
    });

    if (keyFramesTemp.length > 0) {
        const tempResult = minResult.join('');
        keyFramesTemp.forEach(rule => {
            const css = rule.split('{');
            const name = css[1].split(' ')[1];
            if (tempResult.includes(name)) {
                minResult.push(rule);
            }
        });
    }

    if (mediaQueryTemp.length > 0) {
        mediaQueryTemp.forEach(rule => {
            const css = rule.split('{');
            const content = css[1];
            classArray.forEach(className => {
                if (content.includes(className)) {
                    minResult.push(rule);
                }
            });
        });
    }

    return [...new Set(minResult)];
}

export function componentsAnalysis(paths: string[]): string[] {
    const result: string[] = [];
    try {
        paths
            .map(framework => `src/${framework}/components`)
            .forEach(path => {
                const files = readdirSync(path);
                files.forEach(file => {
                    if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.vue') || file.endsWith('.svelte')) {
                        const filePath = join(path, file);
                        const data = readFileSync(filePath, 'utf-8');
                        result.push(data);
                    }
                });
            });
    } catch (error) {
        console.log(error);
    } finally {
        return result;
    }
}

export function extractFileContentTagName(filesData: string[], excludeTags: string[] = []): string[] {
    return [
        ...new Set(
            filesData.reduce((accumulator: string[], current: string) => {
                return accumulator.concat(current.match(/(?<=<)[a-z0-9]+(?=\s|(?=>))/g) || []);
            }, []),
        ),
    ].filter(t => !excludeTags.includes(t));
}

export function extractFileContentClassName(filesData: string[], excludeClassNameKeywords: string = 'framework-test'): string[] {
    return [
        ...new Set(
            filesData.reduce((accumulator: string[], current: string) => {
                return accumulator.concat((current.match(/(?<=\sclassN?a?m?e?=['"])[a-z0-9\-\s]+?(?=['"])/g) || []).map(c => c.split(' ')).flat());
            }, []),
        ),
    ].filter(c => c && c.length > 1 && !c.includes(excludeClassNameKeywords));
}