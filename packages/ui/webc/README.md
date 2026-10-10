# @soldy-ui/webc

**The Web Components adapter: Soldy UI as Custom Elements on the headless models of the core.**

Part of [Soldy UI](https://github.com/youra-h/soldy) — UI components with the logic written once: a
framework-agnostic core and thin adapters that render it in Vue, React, Angular, Svelte, Solid and
Web Components.

The adapter is wiring, not behavior: it defines a Custom Element per component and renders the
markup — BEM classes `s-*` and `data-*` state attributes. Props, events and slots come from the
component descriptor, so they match the other five adapters; only the spelling is the platform's:
tags are prefixed (`<so-button>`), props are attributes or element properties, and events are
DOM events with the core names (`action:press`).

There is no wrapper: `<so-button>` is the button itself and the root of the component. `class`,
`style`, attributes and listeners on it take effect directly, and an attribute you set
(`tabindex="-1"`, `role="link"`) wins over what the component writes. There is no `tag` prop —
the root is always the element you wrote.

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
<so-button text="Save" class="toolbar-action"><i slot="leading">★</i></so-button>
```

`<so-button>` takes part in forms like `<button>`: inside a form, or tied to one with
`form="id"`, it submits it when pressed; `type="reset"` resets the form and `type="button"` does
nothing. `disabled` turns it off natively — no focus, no clicks.

```html
<form>
  <input name="q" />
  <so-button text="Search"></so-button>
  <so-button type="reset" text="Clear"></so-button>
</form>
```

From JavaScript the element is the component: props are its properties, events are DOM events, and
a core instance can be handed over as `ctrl` before the element is connected:

```ts
import { TButton } from '@soldy-ui/core'

const el = document.createElement('so-button')

el.ctrl = new TButton({ text: 'Save' })
el.addEventListener('action:press', () => console.log('pressed'))
document.body.append(el)

el.disabled = true
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
