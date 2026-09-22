# @soldy-ui/icons-material

**Material icons implementing the Soldy UI icon-role contract.**

Part of [Soldy UI](https://github.com/youra-h/soldy) — UI components with the logic written once: a
framework-agnostic core and thin adapters that render it in Vue, React, Angular, Svelte, Solid and
Web Components.

An icon pack is an implementation of a contract, not a bag of SVG files: the library asks for a
fixed set of roles (`check`, `checkIndeterminate`, `close`, `arrowDown`, `arrowRight`,
`moreHoriz`), and a pack provides them as plain data — a `viewBox` and the body of the `<svg>`. The
root element is built by the adapter, so it can set the size, the classes and `aria-hidden`; there
is no bundler-specific import and no runtime template compiler.

## Install

```bash
npm install @soldy-ui/icons-material
```

## Usage

The application registers the pack once, in its entry point:

```ts
import { setIcons } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'

setIcons(material)
setIcons({ close: myCloseIcon }) // a single role, on top of the pack
```

Without a registered pack the components render an empty placeholder and report the missing role
once — a missing icon must not bring the whole application down.

## Documentation

- [Soldy UI README](https://github.com/youra-h/soldy#readme) — what the library is and how it is
  put together.
- [Architecture overview](https://github.com/youra-h/soldy/blob/main/docs/architecture.md) —
  layers, descriptors, plugins, collections, adapters.

## License

[MIT](https://github.com/youra-h/soldy/blob/main/LICENSE)
