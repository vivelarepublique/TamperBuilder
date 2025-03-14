import { uniq } from '../public';
import { hash } from './crypto';
import { generalParameter, optionalParameter, parameterArray } from './parameter';
import { countAllUniqueHostnames, countAllUniqueGrants } from './count';
import { generateNewVersionId } from './id';
import type { ScriptInformationParameters, GlobalConfig } from '../interfaces';

export { splitCssToArray } from './split';

export async function cssTemplate(code: string, name: string): Promise<string> {
    const cssCode = '/*css*/`\n' + code + '`';
    const hashSub = (await hash(code)).substring(0, 8);
    return /*javascript*/ `const ${name}_${hashSub} = document.createElement('style');
const ${name}_${hashSub}_Code = document.createTextNode(${cssCode});
${name}_${hashSub}.appendChild(${name}_${hashSub}_Code);
document.head.appendChild(${name}_${hashSub});`;
}

export function bannerTemplate(code: string, details: ScriptInformationParameters, globalImport?: GlobalConfig[]) {
    const { name, namespace, version, description, author, match, require, runAt, runIn, sandbox, tag, noframes, grant, connect } = details;

    const requires = require ? (Array.isArray(require) ? uniq(require) : [require]) : [];
    const grants = grant ? uniq(countAllUniqueGrants(code).concat(grant)) : countAllUniqueGrants(code);
    const connects = connect ? (connect === '*' ? ['*'] : uniq(countAllUniqueHostnames(code).concat(connect))) : countAllUniqueHostnames(code);

    const global = globalImport
        ? globalImport.reduce((acc: string[], cur) => {
              const urls = [] as string[];
              const { cdnURL, subLibraries } = cur;
              urls.push(cdnURL);
              if (subLibraries && subLibraries.length > 0) {
                  urls.push(...subLibraries.map(sub => sub.cdnURL));
              }
              return acc.concat(urls);
          }, [])
        : [];
    return (
        '// ==UserScript==\n' +
        generalParameter('name', name) +
        generalParameter('namespace', namespace) +
        generalParameter('version', version || generateNewVersionId({ format: 'x.y.z', generateWay: 'manual' })) +
        generalParameter('description', description) +
        generalParameter('author', author) +
        parameterArray(match, 'match') +
        parameterArray(requires.concat(global), 'require') +
        optionalParameter('run-at', runAt) +
        optionalParameter('run-in', runIn) +
        optionalParameter('sandbox', sandbox) +
        (noframes ? generalParameter('noframes') : '') +
        (tag ? parameterArray(tag, 'tag') : '') +
        parameterArray(grants, 'grant') +
        parameterArray(connects, 'connect') +
        '// ==/UserScript==\n'
    );
}

export function jsTemplate(banner: string, css: string, code: string) {
    const codeWithoutComments = code.replace(/(\/\*[\s\S]*?\*\/)/g, '');
    return /*javascript*/ `${banner}
(function () {
'use strict';
${css}
${codeWithoutComments}
})();`;
}
