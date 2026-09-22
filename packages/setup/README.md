# @soldy-ui/setup

**What all six adapters share: component descriptors, the assembly that runs on mount, and the
exchange of values with a framework.**

Part of [Soldy UI](https://github.com/youra-h/soldy) — UI components with the logic written once: a
framework-agnostic core and thin adapters that render it in Vue, React, Angular, Svelte, Solid and
Web Components.

A component contract — props, events and slots — is declared once, in a descriptor, and every
adapter derives its API from it. Naming follows each framework's conventions, but the names, the
defaults and the write rules are the same everywhere, because they live here.

## Install

```bash
npm install @soldy-ui/setup
```

It comes with every adapter package, so an application installs it directly only to register
plugins, extensions, a theme or an icon pack.

## Usage

Registering what the application adds to the library — the entry point:

```ts
import { setIcons, useTheme, usePlugins, useExtensions } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import oren from '@soldy-ui/theme-oren/setup'

setIcons(material) // icon roles: check, close, arrowDown, …
useTheme(oren) // plugins and extensions the theme's CSS reads
usePlugins(TButton, [TTimerPlugin]) // your plugin on every Button
useExtensions(TTags, [(owner) => new TTagsHistoryExtension({ owner })])
```

Describing a component — a descriptor is the single record of its public surface:

```ts
import { defineComponent, defineDescriptor } from '@soldy-ui/setup'

export const ButtonDescriptor = defineDescriptor(() =>
  defineComponent({
    ctor: TButton,
    extends: TextableDescriptor(),
    contribution: {
      props: { view: { type: String, triggers: ['change:view'] } },
      slots: { leading: {}, default: {}, trailing: {} },
    },
  }),
)
```

## Documentation

- [Soldy UI README](https://github.com/youra-h/soldy#readme) — what the library is and how it is
  put together.
- [Architecture overview](https://github.com/youra-h/soldy/blob/main/docs/architecture.md) —
  layers, descriptors, plugins, collections, adapters.

## License

[MIT](https://github.com/youra-h/soldy/blob/main/LICENSE)
