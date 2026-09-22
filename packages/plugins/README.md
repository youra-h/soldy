# @soldy-ui/plugins

**Runtime behavior installed into a plugin bundle: DOM, focus, keyboard, overlay.**

Part of [Soldy UI](https://github.com/youra-h/soldy) — UI components with the logic written once: a
framework-agnostic core and thin adapters that render it in Vue, React, Angular, Svelte, Solid and
Web Components.

Models in `@soldy-ui/core` have no access to the DOM. Everything that needs a live node — listening
for events, moving focus, measuring and positioning an overlay, normalizing keyboard activation —
is a plugin here, written once for all six adapters.

## Install

```bash
npm install @soldy-ui/plugins
```

An adapter assembles the bundle for you, so you rarely install this package on its own — it comes
with `@soldy-ui/setup`.

## Usage

Reach a plugin of a mounted component from its instance — the bundle announces itself on the same
event bus the template uses:

```ts
import { TButton } from '@soldy-ui/core'
import { TActionPlugin, TPluginBundle } from '@soldy-ui/plugins'

const button = new TButton({ text: 'Save' })

button.events.on('bundle:create', (bundle: unknown) => {
  if (bundle instanceof TPluginBundle) {
    // press is a normalized activation: a click, or Enter/Space on any tag
    bundle.get(TActionPlugin)?.events.on('press', () => console.log('pressed'))
  }
})
```

Add a plugin of your own to every component of a type — see
[Plugins and extensions from outside](https://github.com/youra-h/soldy/blob/main/AGENTS.md):

```ts
import { usePlugins } from '@soldy-ui/setup'
import { TButton } from '@soldy-ui/core'

usePlugins(TButton, [TRipplePlugin])
```

## Documentation

- [Soldy UI README](https://github.com/youra-h/soldy#readme) — what the library is and how it is
  put together.
- [Architecture overview](https://github.com/youra-h/soldy/blob/main/docs/architecture.md) —
  layers, descriptors, plugins, collections, adapters.

## License

[MIT](https://github.com/youra-h/soldy/blob/main/LICENSE)
