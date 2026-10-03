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

The code of the package is [MIT](https://github.com/youra-h/soldy/blob/main/LICENSE).

The first day of the week by region, which the calendar uses when a locale does not name it, is
[Unicode CLDR](https://cldr.unicode.org/) data — CLDR 48, `weekData.firstDay` of
[cldr-json](https://github.com/unicode-org/cldr-json) 48.2.0, © Unicode, Inc., licensed under the
[Unicode License v3](https://www.unicode.org/license.txt); its text ships with the package as
`LICENSE-Unicode-3.0`. The package keeps only the regions whose week does not start on Monday.

The placeholders of empty date parts in the date input (`дд.мм.гггг`, `mm/dd/yyyy`) by language
are [React Spectrum](https://github.com/adobe/react-spectrum) data —
`packages/react-stately/src/datepicker/placeholders.ts` at commit `d0110f7`, based on the strings
of `<input type="date">` in Chrome and Firefox, © 2020 Adobe, licensed under the
[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0); its text ships with the
package as `LICENSE-Apache-2.0`. The package keeps only the table of the year, month and day
placeholders.
