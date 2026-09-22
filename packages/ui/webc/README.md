# @soldy-ui/webc

**The Web Components adapter: Soldy UI as Custom Elements on the headless models of the core.**

Part of [Soldy UI](https://github.com/youra-h/soldy) — UI components with the logic written once: a
framework-agnostic core and thin adapters that render it in Vue, React, Angular, Svelte, Solid and
Web Components.

The adapter is wiring, not behavior: it defines a Custom Element per component and renders the
markup — BEM classes `s-*` and `data-*` state attributes. Props, events and slots come from the
component descriptor, so they match the other five adapters; only the spelling is the platform's:
tags are prefixed (`<soldy-button>`), props are attributes or element properties, and events are
DOM events with the core names (`action:press`).

Shadow DOM is not used — a theme styles global BEM classes, so light DOM is distributed by the
`slot` attribute by hand.

> **Status:** the Web Components adapter is in progress — Button is ported, the rest of the set is
> on its way. See [the adapter table](https://github.com/youra-h/soldy#components).

## Install

```bash
npm install @soldy-ui/webc @soldy-ui/theme-oren @soldy-ui/icons-material
```

A theme and an icon pack are separate packages — pick the ones you want.

## Usage

Importing the package defines the elements:

```ts
import '@soldy-ui/webc'
```

```html
<soldy-button text="Save"><i slot="leading">★</i></soldy-button>
```

From JavaScript the element is the component: props are its properties, events are DOM events, and
a core instance can be handed over as `ctrl`:

```ts
import { TButton } from '@soldy-ui/core'

const el = document.querySelector('soldy-button')

el.ctrl = new TButton({ text: 'Save' })
el.disabled = false
el.addEventListener('action:press', () => console.log('pressed'))
```

The application plugs in a theme and an icon pack once, in its entry point:

```ts
import { setIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import oren from '@soldy-ui/theme-oren/setup'

import '@soldy-ui/theme-oren'

setIcons(material)
useTheme(oren)
```

## Documentation

- [Soldy UI README](https://github.com/youra-h/soldy#readme) — the component set and what each
  adapter implements so far.
- [Architecture overview](https://github.com/youra-h/soldy/blob/main/docs/architecture.md) —
  layers, descriptors, plugins, collections, adapters.

## License

[MIT](https://github.com/youra-h/soldy/blob/main/LICENSE)
