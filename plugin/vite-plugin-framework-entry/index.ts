import fs from 'node:fs';
import type { Plugin } from 'vite';
import type { FrameworkConfiguration, SupportedFramework } from '../../config/getParameters.ts';

export const FRAMEWORK_ENTRY_ID = 'virtual:tamper-builder-framework-entry';
const resolvedFrameworkEntryId = `\0${FRAMEWORK_ENTRY_ID}`;

interface FrameworkDefinition {
    importPath: string;
    factory: string;
    target: 'div' | 'custom-element';
    modulePatterns: string[];
}

export const FRAMEWORK_DEFINITIONS: Record<SupportedFramework, FrameworkDefinition> = {
    vue: {
        importPath: '/src/vue',
        factory: 'createVue',
        target: 'div',
        modulePatterns: ['/src/vue/', '/node_modules/vue/', '/node_modules/@vue/', '/node_modules/pinia/'],
    },
    react: {
        importPath: '/src/react',
        factory: 'createReact',
        target: 'div',
        modulePatterns: ['/src/react/', '/node_modules/react/', '/node_modules/react-dom/', '/node_modules/zustand/'],
    },
    preact: {
        importPath: '/src/preact',
        factory: 'createPreact',
        target: 'div',
        modulePatterns: ['/src/preact/', '/node_modules/preact/', '/node_modules/@preact/'],
    },
    lit: {
        importPath: '/src/lit',
        factory: 'createLit',
        target: 'div',
        modulePatterns: ['/src/lit/', '/node_modules/lit/', '/node_modules/@lit/', '/node_modules/lit-element/', '/node_modules/lit-html/'],
    },
    svelte: {
        importPath: '/src/svelte',
        factory: 'createSvelte',
        target: 'div',
        modulePatterns: ['/src/svelte/', '/node_modules/svelte/'],
    },
    'solid-js': {
        importPath: '/src/solid',
        factory: 'createSolid',
        target: 'div',
        modulePatterns: ['/src/solid/', '/node_modules/solid-js/'],
    },
};

interface FrameworkEntryOptions {
    frameworks: FrameworkConfiguration[];
    moduleGraphReportPath?: string;
}

export function createFrameworkEntryCode(frameworks: FrameworkConfiguration[]): string {
    const imports = frameworks.map(({ framework }, index) => {
        const definition = FRAMEWORK_DEFINITIONS[framework];
        return `import { ${definition.factory} as mountFramework${index} } from ${JSON.stringify(definition.importPath)};`;
    });
    const divFrameworks = frameworks
        .map((configuration, index) => ({ configuration, definition: FRAMEWORK_DEFINITIONS[configuration.framework], index }))
        .filter(({ definition }) => definition.target === 'div');
    const customElementFrameworks = frameworks.filter(configuration => FRAMEWORK_DEFINITIONS[configuration.framework].target === 'custom-element');
    const divNicknames = divFrameworks.map(({ configuration }) => configuration.nickname);
    const targetDeclaration = divFrameworks.length === 0 ? '' : `const frameworkTargets = getMultiDivAppElement(${JSON.stringify(divNicknames)});`;
    const mounts = frameworks.map((configuration, index) => {
        const definition = FRAMEWORK_DEFINITIONS[configuration.framework];
        if (definition.target === 'custom-element') return `() => void mountFramework${index}()`;
        const targetIndex = divFrameworks.findIndex(item => item.index === index);
        return `() => void mountFramework${index}(frameworkTargets[${targetIndex}])`;
    });

    return `${imports.join('\n')}
import '/src/assets/css/global.css';
import '/src/assets/css/index.less';
import '/src/assets/css/index.sass';
import '/src/assets/css/index.stylus';
import { beforeMountEvent, afterMountEvent } from '/src/lifecycle/mountEvent';
import { createDivAppElement, createAppElement, getMultiDivAppElement } from '/src/common/utils/elementAdvanced';
import { startMain } from '/src/main';

const divFrameworkNicknames = ${JSON.stringify(divNicknames)};
const customElementFrameworkNicknames = ${JSON.stringify(customElementFrameworks.map(configuration => configuration.nickname))};
if (divFrameworkNicknames.length > 0) createDivAppElement(divFrameworkNicknames);
if (customElementFrameworkNicknames.length > 0) createAppElement(customElementFrameworkNicknames);
${targetDeclaration}
void startMain(
    {
        beforeMount: beforeMountEvent,
        mounts: [${mounts.join(', ')}],
        afterMount: afterMountEvent,
    },
    error => console.error('TamperBuilder failed to initialize.', error),
);
`;
}

export function validateFrameworkModuleGraph(frameworks: FrameworkConfiguration[], moduleIds: Iterable<string>): string[] {
    const selectedFrameworks = new Set(frameworks.map(configuration => configuration.framework));
    const normalizedModuleIds = Array.from(moduleIds, moduleId => moduleId.replaceAll('\\', '/').split('?')[0]);
    const forbiddenModules: string[] = [];

    for (const [framework, definition] of Object.entries(FRAMEWORK_DEFINITIONS) as [SupportedFramework, FrameworkDefinition][]) {
        if (selectedFrameworks.has(framework)) continue;
        forbiddenModules.push(...normalizedModuleIds.filter(moduleId => definition.modulePatterns.some(pattern => moduleId.includes(pattern))));
    }
    return Array.from(new Set(forbiddenModules)).sort();
}

export default function frameworkEntryPlugin(options: FrameworkEntryOptions): Plugin {
    return {
        name: 'vite-plugin-tamper-framework-entry',
        resolveId(id) {
            if (id === FRAMEWORK_ENTRY_ID) return resolvedFrameworkEntryId;
        },
        load(id) {
            if (id === resolvedFrameworkEntryId) return createFrameworkEntryCode(options.frameworks);
        },
        generateBundle() {
            const moduleIds = Array.from(this.getModuleIds());
            const forbiddenModules = validateFrameworkModuleGraph(options.frameworks, moduleIds);
            if (forbiddenModules.length > 0) {
                this.error(`Unselected framework modules entered the build graph:\n${forbiddenModules.join('\n')}`);
            }
            if (options.moduleGraphReportPath) {
                fs.writeFileSync(
                    options.moduleGraphReportPath,
                    `${JSON.stringify({ selected: options.frameworks.map(configuration => configuration.framework), modules: moduleIds }, null, 2)}\n`,
                    'utf8',
                );
            }
        },
    };
}
