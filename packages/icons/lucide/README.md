# @soldy-ui/icons-lucide

**Lucide icons implementing the Soldy UI icon-role contract.**

Part of [Soldy UI](https://github.com/youra-h/soldy) — UI components with the logic written once: a
framework-agnostic core and thin adapters that render it in Vue, React, Angular, Svelte, Solid and
Web Components.

An icon pack is an implementation of a contract, not a bag of SVG files: the library asks for a
fixed set of roles (`check`, `checkIndeterminate`, `close`, `arrowDown`, `arrowRight`,
`arrowsOutward`, `arrowsInward`, `calendar`, `arrowUpward`, `star`, `minus`, `plus`, `error`,
`notification`, `info`, `success`, `warning`), and a pack provides them as plain data — a `viewBox` and the body
of the `<svg>`. The root element is built by the adapter, so it can set the size, the classes and
`aria-hidden`; there is no bundler-specific import and no runtime template compiler.

The pack ships only these roles, not the whole Lucide set. Lucide draws with a stroke; here the
stroke, 1.5 units wide, is turned into a filled outline, so a theme colors a Lucide icon the same
way it colors any other pack — with `fill`.

## Install

```bash
npm install @soldy-ui/icons-lucide
```

## Usage

The application registers the pack once, in its entry point:

```ts
import { useIcons } from '@soldy-ui/setup'
import * as lucide from '@soldy-ui/icons-lucide'

useIcons(lucide)
useIcons({ close: myCloseIcon }) // a single role, on top of the pack
```

Without a registered pack the components render an empty placeholder and report the missing role
once — a missing icon must not bring the whole application down.

## Documentation

- [Soldy UI README](https://github.com/youra-h/soldy#readme) — what the library is and how it is
  put together.
- [Architecture overview](https://github.com/youra-h/soldy/blob/main/docs/architecture.md) —
  layers, descriptors, plugins, collections, adapters.

## License

The code of the package is [MIT](https://github.com/youra-h/soldy/blob/main/LICENSE).

The icons are [Lucide](https://lucide.dev), © Lucide Icons and Contributors, licensed under the
ISC License; the icons Lucide derives from [Feather](https://feathericons.com) are © Cole Bemis,
licensed under the MIT License. Both texts ship with the package as `LICENSE-ISC`. The icons are
changed from the source SVG files: the stroke is 1.5 units wide instead of 2 and is converted to a
filled outline, and the star is filled.
