# @soldy-ui/svelte

**The Svelte adapter: Soldy UI components rendered on the headless models of the core.**

Part of [Soldy UI](https://github.com/youra-h/soldy) — UI components with the logic written once: a
framework-agnostic core and thin adapters that render it in Vue, React, Angular, Svelte, Solid and
Web Components.

The adapter is wiring, not behavior: it connects a core model to Svelte's runes and renders the
markup — BEM classes `so-*` and `data-*` state attributes. Props, events and slots come from the
component descriptor, so they match the other five adapters; only the spelling is Svelte's: slots
are snippets, events arrive as callback props (`element:ready` → `onElementReady`), and the default
slot is `children`.

> **Status:** the Svelte adapter is in progress — Button, Icon, Label, Frame, ProgressSpinner,
> Skeleton, the fields Input, CheckBox and Switch, the form field `Field` (label, helper and
> error linked to the control inside it), the collections ListBox, Tabs, Accordion and
> RadioGroup (`<ListBox.Item>`, `<Tabs.Item>` with `<Tabs.Content>`, `<Accordion.Item>`,
> `<RadioGroup.Item>` or `items`), Table (columns and rows as data — `columns`, `items` — with
> sorting, row selection, column resizing and reordering) and the `Virtual` window for long lists
> (`<Virtual><ListBox items={…} /></Virtual>`, the same with `Table`) are ported, the rest of the
> set is on its way. Icon renders the `tag` it is given: an element name, a Svelte component, or
> `roleIcon(role)` — the icon of that role from the registered icon pack. Frame teleports its
> panel into `target` (`body` by default) on the client; with `contained` it stays in place, on
> the server too. A field gives its class and style to the root and every other attribute to its
> `<input>`; an item of a collection gives them to its row; a list box and tabs give them to the
> list itself, `[role=listbox]` or `[role=tablist]`; a table gives them to the `<table>` itself,
> and its class, style and `ref` to the scroll viewport around it. `Label` names the control it
> wraps; `LocaleProvider` gives a subtree its language and library strings, such as the name of the
> clear button of `Input`. See [the adapter table](https://github.com/youra-h/soldy#components).

## Install

```bash
npm install @soldy-ui/svelte @soldy-ui/theme-oren @soldy-ui/icons-material
```

Svelte `^5.29` is a peer dependency. The package ships its `.svelte` components uncompiled, so
your app's bundler compiles them with its Svelte plugin (for Vite, `@sveltejs/vite-plugin-svelte`).
A theme and an icon pack are separate packages — pick the ones you want.

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

An icon from the registered pack — the root of `Icon` is an `<svg>` of that role:

```svelte
<script lang="ts">
  import { Icon, roleIcon } from '@soldy-ui/svelte'
</script>

<Icon tag={roleIcon('close')} aria_label="Close" />
```

A check box has no text of its own — its visible name is the `Label` around it:

```svelte
<script lang="ts">
  import { CheckBox, Label } from '@soldy-ui/svelte'
</script>

<Label text="I agree">
  <CheckBox onChangeValue={({ newValue }) => console.log(newValue)} />
</Label>
```

A collection takes its items as markup parts or as data (`items`). Tabs keep their panels in the
`content` snippet, next to the list of tabs rather than inside it:

```svelte
<script lang="ts">
  import { Tabs } from '@soldy-ui/svelte'
</script>

<Tabs aria_label="Settings">
  <Tabs.Item value="general" text="General" active />
  <Tabs.Item value="privacy" text="Privacy" />
  {#snippet content()}
    <Tabs.Content value="general">General settings</Tabs.Content>
    <Tabs.Content value="privacy">Privacy settings</Tabs.Content>
  {/snippet}
</Tabs>
```

Items given as data are drawn by the owner, and their slots are the owner's `item-<slot>` snippets,
with the item in the scope. A snippet is opaque: an item cannot tell that it drew nothing, so a
snippet given to the owner replaces the item's own content for every item — draw the default
yourself where you need it.

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
