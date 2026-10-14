import { uniq } from '../public/index.ts';

export function extractFileContentTagName(filesData: string[], excludeTags: string[] = []): string[] {
    const tags = filesData.reduce((previous: string[], current: string) => {
        return previous.concat(current.match(/(?<=<)[a-z0-9]+(?=\s|(?=>))/g) || []);
    }, []);
    return uniq(tags).filter(t => !excludeTags.includes(t));
}

export function extractFileContentClassName(filesData: string[], excludeClassNameKeywords: string = 'exclude-class-keywords'): string[] {
    const nativeClasses = filesData.reduce((previous: string[], current: string) => {
        return previous.concat((current.match(/(?<=\sclassN?a?m?e?=['"])[a-z0-9\-\s]+?(?=['"])/g) || []).map(c => c.split(' ')).flat());
    }, []);

    const vueClasses = filesData.reduce((previous: string[], current: string) => {
        const vueClassContent = current.match(/(?<=:classN?a?m?e?="\{).*?(?=\}")/g) || [];
        if (vueClassContent.length === 0) return previous;

        return previous.concat(uniq(vueClassContent.map(v => v.match(/(?<=')[a-z0-9-]+(?=')/g) || []).flat()));
    }, []);

    const jsxClasses = filesData.reduce((previous: string[], current: string) => {
        const jsxClassContent = current.match(/(?<=classN?a?m?e?=\$?\{).*?(?=\})/g) || [];
        if (jsxClassContent.length === 0) return previous;

        return previous.concat(
            uniq(
                jsxClassContent
                    .map(j => j.match(/(?<=')[a-z0-9-\s]+(?=')/g) || [])
                    .flat()
                    .map(k => k.split(' '))
                    .flat(),
            ),
        );
    }, []);

    const AllClasses = [...nativeClasses, ...vueClasses, ...jsxClasses];

    return uniq(AllClasses).filter(c => c && c.length > 1 && !c.includes(excludeClassNameKeywords));
}
