# @soldy-ui/core

**Headless component models with no framework in them: components, the collection engine, facades
and extensions.**

Part of [Soldy UI](https://github.com/youra-h/soldy) — UI components with the logic written once: a
framework-agnostic core and thin adapters that render it in Vue, React, Angular, Svelte, Solid and
Web Components.

A core component owns its state, events, ARIA and collection membership, and knows nothing about
the DOM. Rendering it is the job of an adapter (`@soldy-ui/vue` and its siblings); behavior that
needs the DOM comes from `@soldy-ui/plugins`.

## Install

```bash
npm install @soldy-ui/core
```

## Usage

A component works on its own — this is the same instance an adapter renders when it is passed as
the `ctrl` prop:

```ts
import { TButton } from '@soldy-ui/core'

const button = new TButton({ text: 'Save' })

button.events.on('change:text', ({ value }) => console.log(value))
button.text = 'Saved'
button.disabled = true
```

A collection is an engine with extensions, not an array:

```ts
import { TTabs, createEngineTabs } from '@soldy-ui/core'

const tabs = new TTabs()
const engine = createEngineTabs({ owner: tabs, items: [{ value: 'a' }, { value: 'b' }] })

// the item list, its length and lookups come from the batch extension
engine.extensions.batch.items.length // 2

// every write is announced before the storage changes, and can be cancelled
engine.extensions.plain.events.on('item:remove:before', (e) => e.preventDefault())
```

## Documentation

- [Soldy UI README](https://github.com/youra-h/soldy#readme) — what the library is and how it is
  put together.
- [Architecture overview](https://github.com/youra-h/soldy/blob/main/docs/architecture.md) —
  layers, descriptors, plugins, collections, adapters.

## License

[MIT](https://github.com/youra-h/soldy/blob/main/LICENSE)
