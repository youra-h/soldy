# @soldy-ui/solid

**The Solid adapter: Soldy UI components rendered on the headless models of the core.**

Part of [Soldy UI](https://github.com/youra-h/soldy) — UI components with the logic written once: a
framework-agnostic core and thin adapters that render it in Vue, React, Angular, Svelte, Solid and
Web Components.

The adapter is wiring, not behavior: it connects a core model to Solid's signals and renders the
markup — BEM classes `so-*` and `data-*` state attributes. Props, events and slots come from the
component descriptor, so they match the other five adapters; only the spelling is Solid's: events
arrive as callback props (`element:ready` → `onElementReady`), and the default slot is `children`.

> **Status:** the Solid adapter is in progress — Button, Icon, Label, Frame, Popover (a non-modal
> panel with any content at its trigger), Tooltip (a hint shown on hover and on keyboard focus),
> Dialog (a modal window), Drawer (a panel that slides in at an edge and can be swiped away),
> Toasts (notifications shown from code with `useToasts()`),
> Menu (an action menu at a button or a context menu on right click — `openOn="contextmenu"` —
> with `<Menu.Item>`, `<Menu.CheckboxItem>`, `<Menu.RadioGroup>` with `<Menu.RadioItem>`,
> `<Menu.Submenu>`, `<Menu.PopoverItem>`, `<Menu.Group>` and `<Menu.Separator>` or `items`, where
> an item with nested `items` is a submenu), ProgressSpinner, ProgressLinear, Skeleton, the fields
> Input, NumberInput (a number in the locale's format with − and + step buttons; the form gets the
> number), Textarea (multi-line, growing with its text, with a character counter), CheckBox and
> Switch, Slider (a number or a range) and Rating, the form field `Field` (label, helper and error
> linked to the control inside it), the collections ListBox, Tabs, Accordion and RadioGroup
> (`<ListBox.Item>`, `<Tabs.Item>` with `<Tabs.Content>`, `<Accordion.Item>`, `<RadioGroup.Item>`
> or `items`), Pagination, Table (columns and rows as data — `columns`, `items` — with sorting,
> row selection, column resizing and reordering), the `Scroller` strip, the `Virtual` window for
> long lists (`<Virtual><ListBox items={…} /></Virtual>`, the same with `Table`) and the
> `DragAndDrop` wrapper that lets users reorder the items of Tabs, ListBox and Accordion by
> dragging (`<DragAndDrop onMove={…}><ListBox items={…} /></DragAndDrop>`, `onMoveBefore` can
> cancel) are ported, the rest of the set is on its way. Icon renders the `tag` it is given: an
> element name, a Solid component, or `roleIcon(role)` — the icon of that role from the registered
> icon pack.
> Frame teleports its panel into `target` (`body` by default) on the client; with `contained` it
> stays in place. Dialog and Drawer are teleported the same way, with their backdrop next to the
> panel, and so is the region of Toasts; `ref` of Dialog and Drawer is the panel, of Toasts — the
> region. A change of `contained` or `target` moves the same nodes, and a field in the panel keeps
> what was typed. Popover, Tooltip and Menu keep the trigger in their root and anchor their panel,
> a Frame, to that root; your attributes and `ref` go to the root, not to the panel. The items of a
> menu stand in its panel, so they are drawn on the client, not on the server. A field gives its
> class and style to the root and every other attribute to its `<input>` (a textarea — to its
> `<textarea>`), except Slider and Rating: they keep every attribute on the root — a slider has a
> field per thumb, and the pointer never reaches the field. An item of a collection, a menu item
> too, gives them to its row; a list box and tabs give them to the list itself, `[role=listbox]` or
> `[role=tablist]`; a table gives them to the `<table>` itself, and its class, style and `ref` to
> the scroll viewport around it; otherwise `ref` gets the root. `Label` names the control it
> wraps; `LocaleProvider` gives a subtree its language and library strings, such as the name of
> the clear button of `Input` or the arrows of `Pagination`. See
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

A collection takes its items as markup parts or as data (`items`). Tabs keep their panels in the
`content` slot, next to the list of tabs rather than inside it:

```tsx
import { Tabs } from '@soldy-ui/solid'

export function Settings() {
  return (
    <Tabs
      aria_label="Settings"
      content={
        <>
          <Tabs.Content value="general">General settings</Tabs.Content>
          <Tabs.Content value="privacy">Privacy settings</Tabs.Content>
        </>
      }
    >
      <Tabs.Item value="general" text="General" active />
      <Tabs.Item value="privacy" text="Privacy" />
    </Tabs>
  )
}
```

Items given as data are drawn by the owner, and their slots are the owner's `item-<slot>` props,
with the item in the scope: `item={(scope) => <b>{scope.item.text}</b>}`. Read the scope in the
markup, as you read Solid props, rather than destructuring it: the markup follows the scope in
place, while a destructured scope redraws the whole slot on every change — on every selection — and
a button or field in the slot loses its focus. An item whose slot drew nothing draws its own content
instead — its text, check mark or close icon.

A popover opens a panel with any content at its trigger. The trigger is your own element in the
`trigger` slot; the link to the panel comes in the slot scope — `triggerAria` (`aria-haspopup`,
`aria-expanded`, `aria-controls`) and `triggerDataset` (`data-selected` of an open trigger):

```tsx
import { Button, Popover } from '@soldy-ui/solid'

export function Filters() {
  return (
    <Popover
      aria_label="Filters"
      trigger={(scope) => (
        <Button text="Filters" {...scope.triggerAria} {...scope.triggerDataset} />
      )}
    >
      Any content: text, fields, buttons
    </Popover>
  )
}
```

Here too the scope is read in the markup: the link changes on every opening, and a spread of
`scope.triggerAria` updates the same trigger in place, while a destructured scope would draw a new
trigger each time, and the focus on the old one would be lost. `Tooltip` takes its trigger the same
way, with `triggerAria` in the scope.

A menu takes its trigger the same way. Choosing an action closes the menu and calls `onChoose`; a
checkbox item and a radio item are checked in place, and the menu stays open:

```tsx
import { Button, Menu } from '@soldy-ui/solid'

export function Actions() {
  return (
    <Menu
      trigger={(scope) => (
        <Button text="Actions" {...scope.triggerAria} {...scope.triggerDataset} />
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
the API in its body, like `useContext` — a component in a dialog under the manager too; your own
content of a toast is a Solid component with a `toast` prop:

```tsx
import { Button, Toasts, useToasts, type TToastRender } from '@soldy-ui/solid'

const Undo: TToastRender = (props) => <Button text="Undo" onClick={() => props.toast.close()} />

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

The application plugs in a theme and an icon pack once, in its entry point:

```ts
import { useIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import oren from '@soldy-ui/theme-oren/setup'

import '@soldy-ui/theme-oren'

useIcons(material)
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
