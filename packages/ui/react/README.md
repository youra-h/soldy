# @soldy-ui/react

**The React adapter: Soldy UI components rendered on the headless models of the core.**

Part of [Soldy UI](https://github.com/youra-h/soldy) — UI components with the logic written once: a
framework-agnostic core and thin adapters that render it in Vue, React, Angular, Svelte, Solid and
Web Components.

The adapter is wiring, not behavior: it connects a core model to React's render cycle and renders
the markup — BEM classes `so-*` and `data-*` state attributes. Props, events and slots come from the
component descriptor, so they match the other five adapters; only the spelling is React's: events
arrive as callback props (`element:ready` → `onElementReady`), and the default slot is `children`.

> **Status:** the React adapter is in progress — Button, Icon, Label, Frame, Skeleton,
> ProgressSpinner, ProgressLinear, Input, NumberInput (a number in the locale's format with − and +
> step buttons; the form gets the number), Textarea (multi-line, growing with its text, with a
> character counter), CheckBox, Switch, Slider, Rating, the form field `Field` (label, helper and
> error linked to the control inside it), the collections ListBox, Tabs, Accordion and RadioGroup
> (`<ListBox.Item>`, `<Tabs.Item>` with `<Tabs.Content>`, `<Accordion.Item>`, `<RadioGroup.Item>`
> or `items`), the tag set Tags (`<Tags.Item>` or `items`, with close buttons and optional
> selection), Select (a select field with a list in a panel: single selection, multiple selection
> with tags in the field, typing with search or filtering, groups — `<Select.Item>`,
> `<Select.Group>` or `items`; the options stand in the panel, so the server renders the field, and
> options written as markup join the select on the client), Pagination, the `Scroller` strip, the
> overlays Popover and Tooltip (the trigger in the `trigger` slot,
> `trigger={({ triggerAria }) => <Button {...triggerAria} />}`), Menu (an
> action menu at a button or a context menu on right click — `openOn="contextmenu"` — with
> `<Menu.Item>`, `<Menu.CheckboxItem>`, `<Menu.RadioGroup>` with `<Menu.RadioItem>`,
> `<Menu.Submenu>`, `<Menu.PopoverItem>`, `<Menu.Group>` and `<Menu.Separator>` or `items`, where
> an item with nested `items` is a submenu; the items stand in its panel, so the server renders the
> root with the trigger, and the items join the menu on the client), Dialog and
> Drawer (open state in `visible`, user closing reported by `onChangeVisible`), Toasts
> (notifications shown from code with `useToasts()`; the region is teleported into `target`, and
> `ref` is the region), Table (columns and rows as data — `columns`, `items` — with sorting, row
> selection, column resizing and reordering), the `Virtual` window for long lists
> (`<Virtual><ListBox items={…} /></Virtual>`, the same with `Select` and `Table`) and the
> `DragAndDrop` wrapper that lets users reorder the items of Tabs, ListBox and Accordion by dragging
> (`<DragAndDrop onMove={…}><ListBox items={…} /></DragAndDrop>`, `onMoveBefore` can cancel) are
> ported, the rest of the set is on its way. Icon renders the `tag` it is given; `roleIcon(role)`
> makes that tag from the registered icon pack. See
> [the adapter table](https://github.com/youra-h/soldy#components).

## Install

```bash
npm install @soldy-ui/react @soldy-ui/theme-oren @soldy-ui/icons-material
```

React and React DOM `^19.2` are peer dependencies. A theme and an icon pack are separate packages —
pick the ones you want.

## Usage

```tsx
import { Button } from '@soldy-ui/react'

export function Toolbar() {
  return <Button text="Save" onActionPress={() => console.log('pressed')} />
}
```

The same component can be driven from code — pass a core instance as `ctrl`, and both sides see the
same state and events:

```tsx
import { TButton } from '@soldy-ui/core'
import { Button } from '@soldy-ui/react'

const btn = new TButton({ text: 'Save' })

export function Toolbar() {
  return <Button ctrl={btn} onActionPress={() => (btn.disabled = true)} />
}
```

A menu takes its trigger in the `trigger` slot, like Popover: the link to the panel comes in the
slot scope — `triggerAria` and `triggerDataset`. Choosing an action closes the menu and calls
`onChoose`; a checkbox item and a radio item are checked in place, and the menu stays open:

```tsx
import { Button, Menu } from '@soldy-ui/react'

export function Actions() {
  return (
    <Menu
      trigger={({ triggerAria, triggerDataset }) => (
        <Button text="Actions" {...triggerAria} {...triggerDataset} />
      )}
      onChoose={(item) => console.log(item.value)}
    >
      <Menu.Item value="edit" text="Edit" />
      <Menu.Submenu value="share" text="Share">
        <Menu.Item value="link" text="Copy link" />
        <Menu.Item value="mail" text="Email" />
      </Menu.Submenu>
      <Menu.Separator />
      <Menu.Item value="remove" text="Delete" />
    </Menu>
  )
}
```

Toasts are shown from code. The manager wraps the application, and any component under it takes
the API with the `useToasts()` hook — a component in a dialog under the manager too; your own
content of a toast is a React component with a `toast` prop (`memo` and `forwardRef` components as
well):

```tsx
import { Button, Toasts, useToasts, type TToastRender } from '@soldy-ui/react'

const Undo: TToastRender = ({ toast }) => <Button text="Undo" onClick={() => toast.close()} />

function Page() {
  const { show } = useToasts()

  return <Button text="Delete" onClick={() => show({ text: 'Deleted', render: Undo })} />
}

export function App() {
  return (
    <Toasts>
      <Page />
    </Toasts>
  )
}
```

The API belongs to the manager's assembly: a manager that React sets up again (StrictMode,
`<Activity>`) without an `engine` of yours gives a new one, so an effect that shows a toast keeps
`show` in its dependencies — `useEffect(() => { show('Saved') }, [show])`.

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
