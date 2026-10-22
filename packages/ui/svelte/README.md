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
> Skeleton, the fields Input, NumberInput (a number in the locale's format with − and + step
> buttons; the form gets the number), Textarea (multi-line, growing with its text, with a character
> counter), CheckBox and Switch, the form field `Field` (label, helper and error linked to the
> control inside it), the collections ListBox, Tabs, Accordion, RadioGroup and Tags
> (`<ListBox.Item>`, `<Tabs.Item>` with `<Tabs.Content>`, `<Accordion.Item>`,
> `<RadioGroup.Item>`, `<Tags.Item>` or `items`; tags close, select by mode and either wrap or
> scroll), Select (a combobox: `<Select.Item>` and `<Select.Group>` or `items`, `editable` with
> search or filter, tags in the field in `multiple`), Table (columns and rows as data — `columns`,
> `items` — with sorting, row selection, column resizing and reordering), the `Virtual` window for
> long lists (`<Virtual><ListBox items={…} /></Virtual>`, the same with `Select` and `Table`), the
> `DragAndDrop` wrapper that lets users reorder the items of Tabs, ListBox and Accordion by
> dragging (`<DragAndDrop onMove={…}><ListBox items={…} /></DragAndDrop>`, `onMoveBefore` can
> cancel),
> Slider, Rating, ProgressLinear, Scroller, Pagination, the dates — DateInput (a date or a date
> and time typed in parts in the locale's format, selected and copied as a whole), Calendar (month
> grids with a month and year picker; a day is `Calendar.Item`, its content — the `item` snippet)
> and DatePicker (a date field and a calendar in a panel: a single date or a range, with an optional
> confirmation) — and the overlays — Popover (a panel at a trigger with any content), Tooltip,
> Menu (an action menu at a button or on right click:
> `<Menu.Item>`, `<Menu.CheckboxItem>`, `<Menu.RadioGroup>` with `<Menu.RadioItem>`,
> `<Menu.Group>`, `<Menu.Separator>`, submenus `<Menu.Submenu>` and an item with its own panel
> `<Menu.PopoverItem>`, or `items` — an item with nested `items` is a submenu), Dialog (a modal
> window), Drawer (a panel that slides in at an edge) and Toasts (notifications shown from code
> with `useToasts()`) — are ported, the rest of the set is on its way. Icon renders the `tag` it is
> given: an element name, a Svelte component, or `roleIcon(role)` — the icon of that role from the
> registered icon pack. Frame teleports its panel into `target` (`body` by default) on the client;
> with `contained` it stays in place, on the server too. Dialog, Drawer, the region of Toasts, the
> list panel of Select and the panels of Menu are teleported the same way, and `ref` of Dialog and
> Drawer is the panel, of Toasts — the region. The server renders a Select from `items` with the
> text of the selected option (with tags in `multiple`); options given as markup live in the panel
> and join the collection on the client. The server renders a Menu as its trigger: the panel and
> its items appear on the client. The server renders a DatePicker as its field with the calendar
> button: the panel with the calendar appears on the client; a Calendar on its own the server
> renders in full, its month and year picker in place and hidden. The date field, the calendar and
> the DatePicker take their language from `LocaleProvider`: the order of parts, the first day of
> the week, the month names. A field — and Select — gives its class and style to the root and
> every other attribute to its `<input>` (a textarea — to its `<textarea>`); an item of a
> collection — a menu item too — gives them to its row; a list box and tabs give them to the list
> itself, `[role=listbox]` or `[role=tablist]`; a table gives them to the `<table>` itself, and its
> class, style and `ref` to the scroll viewport around it; a menu, like a popover, gives them to
> its root around the trigger. `Label` names the control it wraps; `LocaleProvider` gives a subtree
> its language and library strings, such as the name of the clear button of `Input`. See
> [the adapter table](https://github.com/youra-h/soldy#components).

## Install

```bash
npm install @soldy-ui/svelte @soldy-ui/theme-oren @soldy-ui/icons-material
```

Svelte `^5.55.10` is a peer dependency. The package ships its `.svelte` components uncompiled, so
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

A popover and a tooltip take their trigger as the `trigger` snippet: the trigger is the element of
the application, so the link to the panel (`aria-expanded`, `aria-controls`) and the pressed look
come to it in the scope:

```svelte
<script lang="ts">
  import { Button, Popover } from '@soldy-ui/svelte'
</script>

<Popover aria_label="Filters">
  {#snippet trigger({ triggerAria, triggerDataset })}
    <Button text="Filters" {...triggerAria} {...triggerDataset} />
  {/snippet}
  Any content: text, fields, buttons
</Popover>
```

Toasts are shown from code. The manager wraps the application, and any component under it takes
the API while it initializes; your own content of a toast is a Svelte component with a `toast`
prop:

```svelte
<!-- App.svelte -->
<Toasts>
  <Page />
</Toasts>

<!-- Page.svelte -->
<script lang="ts">
  import { Button, useToasts } from '@soldy-ui/svelte'
  import Undo from './Undo.svelte'

  const { show } = useToasts()
</script>

<Button text="Delete" onclick={() => show({ text: 'Deleted', render: Undo })} />
```

The application plugs in a theme and an icon pack once, in its entry point:

```ts
import { useIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import oren from '@soldy-ui/theme-oren/setup'

import '@soldy-ui/theme-oren'

useIcons(material)
useTheme(oren)
```

## Documentation

- [Soldy UI README](https://github.com/youra-h/soldy#readme) — the component set and what each
  adapter implements so far.
- [Architecture overview](https://github.com/youra-h/soldy/blob/main/docs/architecture.md) —
  layers, descriptors, plugins, collections, adapters.

## License

[MIT](https://github.com/youra-h/soldy/blob/main/LICENSE)
