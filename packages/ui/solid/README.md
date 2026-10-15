# @soldy-ui/solid

**The Solid adapter: Soldy UI components rendered on the headless models of the core.**

Part of [Soldy UI](https://github.com/youra-h/soldy) — UI components with the logic written once: a
framework-agnostic core and thin adapters that render it in Vue, React, Angular, Svelte, Solid and
Web Components.

The adapter is wiring, not behavior: it connects a core model to Solid's signals and renders the
markup — BEM classes `so-*` and `data-*` state attributes. Props, events and slots come from the
component descriptor, so they match the other five adapters; only the spelling is Solid's: events
arrive as callback props (`element:ready` → `onElementReady`), and the default slot is `children`.

> **Status:** the Solid adapter is in progress — Button, Icon, Label, Frame, ProgressSpinner,
> Skeleton and the fields Input, CheckBox and Switch are ported, the rest of the set is on its way.
> Icon renders the `tag` it is given: an element name, a Solid component, or `roleIcon(role)` — the
> icon of that role from the registered icon pack. Frame teleports its panel into `target` (`body`
> by default) on the client; with `contained` it stays in place. A field gives its class and style
> to the root and every other attribute, `ref` included, to its `<input>`. `Label` names the
> control it wraps; `LocaleProvider` gives a subtree its language and library strings, such as the
> name of the clear button of `Input`. See
> [the adapter table](https://github.com/youra-h/soldy#components).

## Install

```bash
npm install @soldy-ui/solid @soldy-ui/theme-oren @soldy-ui/icons-material
```

Solid `^1.9` is a peer dependency. The package ships its components as source with JSX under the
`solid` export condition, so your app's bundler compiles them with its Solid plugin (for Vite,
`vite-plugin-solid`). A theme and an icon pack are separate packages — pick the ones you want.

## Usage

```tsx
import { Button } from '@soldy-ui/solid'

export function Toolbar() {
  return <Button text="Save" onActionPress={() => console.log('pressed')} />
}
```

The same component can be driven from code — pass a core instance as `ctrl`, and both sides see the
same state and events:

```tsx
import { TButton } from '@soldy-ui/core'
import { Button } from '@soldy-ui/solid'

const btn = new TButton({ text: 'Save' })

export function Toolbar() {
  return <Button ctrl={btn} onActionPress={() => (btn.disabled = true)} />
}
```

An icon from the registered pack — the root of `Icon` is an `<svg>` of that role:

```tsx
import { Icon, roleIcon } from '@soldy-ui/solid'

export function CloseIcon() {
  return <Icon tag={roleIcon('close')} aria_label="Close" />
}
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

## Server rendering

Server rendering and hydration — SolidStart, or Vite SSR with `vite-plugin-solid({ ssr: true })` —
need nothing extra: the Solid plugin finds the package by its `solid` export condition and compiles
its components together with your app, for the server and for the browser. A bundler without the
Solid plugin gets the `default` export instead — a build for the browser, which does not render on
the server.

## Documentation

- [Soldy UI README](https://github.com/youra-h/soldy#readme) — the component set and what each
  adapter implements so far.
- [Architecture overview](https://github.com/youra-h/soldy/blob/main/docs/architecture.md) —
  layers, descriptors, plugins, collections, adapters.

## License

[MIT](https://github.com/youra-h/soldy/blob/main/LICENSE)
