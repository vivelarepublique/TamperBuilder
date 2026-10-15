import { uniq } from '../public/index.ts';
import { hash } from './crypto.ts';
import { generalParameter, optionalParameter, parameterArray } from './parameter.ts';
import { generateNewVersionId } from './id.ts';
import type { ScriptInformationParameters } from '../interfaces/index.ts';

export { splitCssToArray } from './split.ts';

export function cssTemplate(code: string, name: string): Promise<string> {
    const cssCode = JSON.stringify(code).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    const hashSub = hash(code).substring(0, 16);
    return Promise.resolve(/*javascript*/ `const ${name}_${hashSub} = document.createElement('style');
const ${name}_${hashSub}_Code = document.createTextNode(${cssCode});
${name}_${hashSub}.appendChild(${name}_${hashSub}_Code);
document.head.appendChild(${name}_${hashSub});`);
}

export function bannerTemplate(details: ScriptInformationParameters) {
    const { name, namespace, version, description, author, match, require, runAt, runIn, sandbox, tag, noframes, grant, connect } = details;

    const requires = require ? (Array.isArray(require) ? uniq(require) : [require]) : [];
    const grants = grant ? uniq(grant) : [];
    const connects = connect ? uniq(Array.isArray(connect) ? connect : [connect]) : [];

    return (
        '// ==UserScript==\n' +
        generalParameter('name', name) +
        generalParameter('namespace', namespace) +
        generalParameter('version', version || generateNewVersionId({ format: 'x.y.z', generateWay: 'manual' })) +
        generalParameter('description', description) +
        generalParameter('author', author) +
        parameterArray(match, 'match') +
        parameterArray(requires, 'require') +
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
    return /*javascript*/ `${banner}
(function () {
'use strict';
${css}
${code}
})();`;
}
