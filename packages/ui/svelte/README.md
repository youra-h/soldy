# @soldy-ui/svelte

**The Svelte adapter: Soldy UI components rendered on the headless models of the core.**

Part of [Soldy UI](https://github.com/youra-h/soldy) — UI components with the logic written once: a
framework-agnostic core and thin adapters that render it in Vue, React, Angular, Svelte, Solid and
Web Components.

The adapter is wiring, not behavior: it connects a core model to Svelte's runes and renders the
markup — BEM classes `s-*` and `data-*` state attributes. Props, events and slots come from the
component descriptor, so they match the other five adapters; only the spelling is Svelte's: slots
are snippets, events arrive as callback props (`element:ready` → `onElementReady`), and the default
slot is `children`.

> **Status:** the Svelte adapter is in progress — Button is ported, the rest of the set is on its
> way. See [the adapter table](https://github.com/youra-h/soldy#components).

## Install

```bash
npm install @soldy-ui/svelte @soldy-ui/theme-oren @soldy-ui/icons-material
```

Svelte `^5` is a peer dependency. A theme and an icon pack are separate packages — pick the ones
you want.

## Usage

```svelte
<script lang="ts">
  import { Button } from '@soldy-ui/svelte'
</script>

<Button text="Save" onActionPress={() => console.log('pressed')} />
```

The same component can be driven from code — pass a core instance as `ctrl`, and both sides see the
same state and events:

```svelte
<script lang="ts">
  import { TButton } from '@soldy-ui/core'
  import { Button } from '@soldy-ui/svelte'

  const btn = new TButton({ text: 'Save' })
</script>

<Button ctrl={btn} onActionPress={() => (btn.disabled = true)} />
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
