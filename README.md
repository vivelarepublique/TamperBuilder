# TamperBuilder

- Use any Javascript/Typescript framework to create Tampermonkey script example.
- No longer need to use native JavaScript or jQuery.
- Use TypeScript with any framework you like.

## Native JS Content

- All runtime functions are written in [TypeScript](https://github.com/microsoft/TypeScript).
- Extended some DOM manipulation methods.
- Wraps some Tampermonkey-specific APIs.
- Some common utility functions (refer to [lodash](https://github.com/lodash/lodash)).

## Supported framework

- [Vue](https://github.com/vuejs/vue) ( Include [Pinia](https://github.com/vuejs/pinia) )
- [React](https://github.com/facebook/react) ( Include [Redux](https://github.com/reduxjs/redux) )
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
npm run build
```

## Ongoing plans

- [ - ] Framework support
  - [Vue](https://github.com/vuejs/vue)✅
  - [React](https://github.com/facebook/react)✅
  - [Preact](https://github.com/preactjs/preact)✅
  - [Lit](https://github.com/lit/lit)✅
  - [Svelte](https://github.com/sveltejs/svelte)✅
  - [Solid](https://github.com/solidjs/solid)✅
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
