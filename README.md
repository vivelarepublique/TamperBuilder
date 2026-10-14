# TamperBuilder

- Use any Javascript/Typescript framework to create Tampermonkey script example.
- No longer need to use native JavaScript or jQuery.
- Use TypeScript with any framework you like.

## Core concepts

- In most cases, we use a TamperMonkey script to modify a web page to achieve 2 functions:

 1. Modify or listen to the content of the web page is already there;
 2. Add part of the content to extend more functionality.

- If you only need implement the first function, you only need native JavaScript code to realize the function you want. Of course, if you want to refer to the current project's code, its main code is in the directory `src/common/utils`.

- But if you want to add some new functionality th the page that requires adding a lot of DOM(e.g. a little button in the corner that when you click on it opens up a new interface at the top level), it's a better choice to use a JavaScript framework to create the content.
- The above is reason why I created this code repository.

## Native JS Content

- All runtime functions are written in [TypeScript](https://github.com/microsoft/TypeScript).
- Extended some DOM manipulation methods.
- Wraps some Tampermonkey-specific APIs.
- Some common utility functions (refer to [lodash](https://github.com/lodash/lodash)).

## Supported framework

- [Vue](https://github.com/vuejs/vue) ( Include [Pinia](https://github.com/vuejs/pinia) )
- [React](https://github.com/facebook/react) ( Include [Zustand](https://github.com/pmndrs/zustand) )
  > The original version was redux, but I've currently migrated to zustand, check out the [details of why](https://github.com/vivelarepublique/TamperBuilder/blob/main/documentation/about-redux.md).
- [Preact](https://github.com/preactjs/preact) ( Include `@preact/signals`)
- [Lit](https://github.com/lit/lit) ( Include `@lit/context` )
- [Svelte](https://github.com/sveltejs/svelte)
- [Solid](https://github.com/solidjs/solid)

The default `config/global-configuration.yaml` deliberately selects all six frameworks as a showcase.

## Building Tool

- [Vite](https://github.com/vitejs/vite)
- [Webpack](https://github.com/webpack/webpack)
  > Deprecated, for more information please see [Legacy Build Support](https://github.com/vivelarepublique/TamperBuilder/blob/main/archive/Legacy%20Build%20Support.md).

## Prerequisite

- [Node.js](https://nodejs.org/en/) (>= 22.0.0)
  > Only tested under Node 22.*.0, older versions may not be compatible.

## Usage

```bash
git clone https://github.com/vivelarepublique/TamperBuilder
cd TamperBuilder
npm ci
```

for development (the server binds only to `127.0.0.1`):

```bash
npm run dev
```

for build:

```bash
npm run build
```

Run the complete local quality gate with:

```bash
npm run check
```

This audits dependencies, type-checks the project, runs unit tests, verifies framework selection with real builds, and checks all three supported build modes. A successful Vite build proves only generated-file and module-graph contracts; it does not prove behavior in a browser or Tampermonkey.

## Explicit userscript permissions

`config/banner.yaml` is the only authority for generated `@grant` and `@connect` metadata. The default sample explicitly declares exactly the APIs and host it currently uses:

```yaml
grant:
    - GM_xmlhttpRequest
    - unsafeWindow
connect:
    - dailybing.com
```

Grants must be from the project's approved list, and connect entries must be explicit hostnames. Wildcards, URL schemes, paths, ports, inferred bundle references, `window.onurlchange`, and framework documentation hosts are rejected or ignored rather than added automatically.

## Framework selection

Select one or more frameworks in `config/global-configuration.yaml`. Each record needs a supported, unique framework name, a unique DOM nickname, and an existing component directory. For example, a Vue-only build uses:

```yaml
- framework: vue
  nickname: vue
  componentsFilesPaths: src/vue/components
```

The generated virtual entry statically imports only selected application sources. Vite loads only selected framework transforms, and the build fails if an unselected framework source or runtime enters the application module graph. Lit does not require a framework Vite plugin. Do not delete unselected source directories or manually edit `src/index.ts`; selection is controlled by validated YAML.

You can verify the default six-framework showcase and the Vue-only fixture with:

```bash
npm run verify:frameworks
```

## Customization Guide

1. Modify project metadata such as name, description, version, and author in `package.json` and `config/banner.yaml`.
2. Select framework records in `config/global-configuration.yaml`.
3. Declare required userscript permissions explicitly in `config/banner.yaml`.
4. Customize selected framework components and shared utilities under `src`.
5. Run `npm run check` before using the generated userscript.

## Ongoing plans

- [ - ] Working: More frontend framework support
- [ X ] Repackaged JavaScript Functions
- [ X ] Detailed documentation
- [ X ] Performance testing and comparison

## License

MIT

## Author

[vivelarepublique](https://github.com/vivelarepublique)

<!-- ## Contributing

Contributions are welcome! Please read the [contribution guidelines](https://github.com/vivelarepublique/vue-or-react-create-tampermonkey-script-template/blob/main/CONTRIBUTING.md) first -->

## Your support

Give a ⭐️ if you like this project!
