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
npm install
```

for development:

```bash
npm run dev
```

for build:

```bash
npm run build
```

## Ongoing plans

- [ - ] Framework support
  - [Angular](https://github.com/angular/angular)
    > Compiling Angular projects can only be done with Angular's own compiler, not with Vite or Webpack, so combining Angular code with code from other projects can be a pain.
  - [Astro](https://github.com/withastro/astro)
    > Astro is using a self-contained build tool based on Vite, so combining Astro with code from other projects isn't simple.
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
