# @soldy-ui/angular

**The Angular adapter: Soldy UI components rendered on the headless models of the core.**

Part of [Soldy UI](https://github.com/youra-h/soldy) — UI components with the logic written once: a
framework-agnostic core and thin adapters that render it in Vue, React, Angular, Svelte, Solid and
Web Components.

The adapter is wiring, not behavior: it connects a core model to Angular's signals and renders the
markup — BEM classes `so-*` and `data-*` state attributes. Props, events and slots come from the
component descriptor, so they match the other five adapters; only the spelling is Angular's: a
component is a prefixed attribute on your own element (`<button so-button>`), events are outputs
named `so` + the core name in camelCase (`show` → `soShow`, `show:before` → `soShowBefore`,
`element:ready` → `soElementReady`), and slots are filled through the `slot` attribute. Every
output has the prefix: Angular binds `(x)` both to an output and to the DOM event of that name, so
`(input)` on a field is the browser's event, as on a native `<input>`, and the component's own is
`(soInput)`.

The components are standalone and zoneless — state is a signal, so Zone.js is not required. They
render on the server (`@angular/platform-server`) and hydrate in the browser
(`provideClientHydration`); component ids match on both sides.

> **Status:** the Angular adapter is in progress — Button, Icon, Label, Frame, ProgressSpinner,
> Skeleton, Input, CheckBox, Switch, the form field `<div so-field>` (label, helper and error linked
> to the control inside it), RadioGroup, ListBox, Tabs, Accordion, Table and the `Virtual`
> window for long lists are ported, the rest of the set is on its way. Frame moves
> the element you wrote into `target` (`body` by default) in the browser; with `contained` it stays
> in place. `so-locale-provider` gives a subtree its language and library strings. See
> [the adapter table](https://github.com/youra-h/soldy#components).

## Install

```bash
npm install @soldy-ui/angular @soldy-ui/theme-oren @soldy-ui/icons-material
```

`@angular/core` and `@angular/common` `^22.1` are peer dependencies. A theme and an icon pack are
separate packages — pick the ones you want.

## Usage

```ts
import { Component } from '@angular/core'
import { TButtonComponent } from '@soldy-ui/angular'

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [TButtonComponent],
  template: `<button so-button text="Save" (soActionPress)="onPress()"></button>`,
})
export class ToolbarComponent {
  onPress(): void {
    console.log('pressed')
  }
}
```

There is no wrapper: the element you write is the component's root. Any tag works and keeps its
browser behavior — `<button so-button>` is a native button, `<a so-button href="/next">` is a link,
`<div so-button>` is a `div` that gets `role="button"` and `tabindex="0"`. The tag is read from the
element, so there is no `tag` input. Your `class`, `style`, attributes and event listeners stay on
the element. What the component writes on it — a class, an attribute, a style property — is the
component's, the way a host binding (`[attr.x]`, `[class.x]`) is: it writes over a value you set
under the same name, so `<div so-button tabindex="-1">` still gets `tabindex="0"`. Names the
component does not write stay yours. `rendered` set to `false` hides the element instead of
removing it — the element is yours — and your inline `display` wins over hiding.

Import the component you use: without `TButtonComponent` in `imports`, `<button so-button>` is a
plain button and Angular reports nothing; only an input binding such as `[text]` fails (NG8002).

The same component can be driven from code — pass a core instance as `ctrl`, and both sides see the
same state and events:

```ts
template: `<button so-button [ctrl]="btn" (soActionPress)="btn.disabled = true"></button>`
```

An icon from the registered pack is an `<svg>` with the icon's role — import `RoleIconDirective`
next to `TIconComponent`. Your own drawing is registered as a role too (`setIcons`): the icon renders
nothing written inside it.

```ts
template: `<svg so-icon so-role-icon="close" aria_label="Close"></svg>`
```

A field — Input, CheckBox, Switch — is an element of its own (`<so-input>`, `<so-check-box>`,
`<so-switch>`) with a native `<input>` inside, so your markup is split the way Vue and React split
it: `class` and `style` stay on the field, while the static attributes you write on it
(`autocomplete`, `data-*`) move to the `<input>`. Bindings such as `[attr.title]` and event
listeners stay on the field element — Angular attaches them where you wrote them; events that
bubble from the `<input>` (`keydown`) reach them, `focus` and `blur` do not. A field gets its
visible name from a Label around it:

```ts
template: `<label so-label text="Remember me"><so-check-box (soChangeValue)="remember($event)" /></label>
  <so-input clearable name="City" autocomplete="address-level2" />`
```

Slots that hand data in are `<ng-template slot>` — the content next to an Input gets the field
itself:

```ts
template: `<so-input>
  <ng-template slot="trailing" let-ctrl="ctrl">{{ ctrl.value?.length ?? 0 }}/40</ng-template>
</so-input>`
```

A collection — RadioGroup, ListBox, Tabs, Accordion — is an owner element with its items inside:
your element for RadioGroup and Accordion (`<div so-radio-group>`, `<div so-accordion>`), an
element of its own for ListBox and Tabs (`<so-list-box>`, `<so-tabs>`). The parts are components of
their own, written as separate tags, since Angular has no dot syntax: `<so-list-box-item>`,
`<so-tabs-item>`, `<so-accordion-item>`, `<label so-radio-group-item>` and the tab panel
`<div so-tabs-content>`. Items written in the markup join the collection in document order, on the
server too; without them the owner renders its `items`. Inputs of the collection — `items`,
`engine`, `mode`, an item's `selected` or `active` — are inputs of the same element:

```ts
template: `<so-list-box mode="multiple" aria-label="Cities" (soChangeValue)="pick($event.newValue)">
  <so-list-box-item value="a" text="Moscow" />
  <so-list-box-item value="b" text="Kazan" selected />
</so-list-box>
<so-tabs>
  <so-tabs-item value="a" text="General" active />
  <so-tabs-item value="b" text="Mail" />
  <div so-tabs-content slot="content" value="a">…</div>
  <div so-tabs-content slot="content" value="b">…</div>
</so-tabs>`
```

A list box and tabs split your markup like a field: `class` and `style` stay on the element — a
frame around the list, next to the header and footer of a list box or the panels of tabs — while
the static attributes you write on it (`aria-label`, `id`, `tabindex`, `data-*`) move to the list
itself, `[role=listbox]` or `[role=tablist]`, which they name. An item splits your markup the same
way: `class` and `style` stay on the item, the static attributes you write on it (`title`, `id`)
move to its row — or to the `<input>` of a radio. Inside
a Label, write the radio on an inline tag, `<span so-radio-group-item>`: a `label` inside a `label`
is not allowed. Items rendered from `items` get their slots from the owner — `item`, `item-leading`
and the rest receive the item along with their scope:

```ts
template: `<div so-radio-group [items]="options">
  <ng-template slot="item" let-item="item" let-active="active">{{ item.value }}</ng-template>
</div>`
```

A slot by which a part decides whether to render its own default — the close icon of a tab, the
arrows of an accordion section, the edges of the tab list — is an `<ng-template slot>` only, and a
template given to the owner renders in every item in place of its own. A tab panel that is not
active stays in place hidden, its content not inserted; a markup tab closed with its close button
is hidden the same way — the element is yours.

A table takes its columns and rows as data only — `columns` and `items`, or an `engine` — and draws
its headers (`th[so-table-column]`) and rows (`tr[so-table-row]`) itself: sorting, row selection
with "select all", column resizing and reordering, a grid mode and a sticky head. The element of its
own, `<so-table>`, is the table's scroll viewport, with the `<table>` inside it, and it splits your
markup like a field: `class`, `style` and hiding stay on the viewport, while the static attributes
you write on it (`aria-label`, `id`, `data-*`) move to the `<table>`, which they name, next to the
classes and ARIA of the table. A header and a cell are filled through templates — a template given
to the table renders in every header or cell — and an empty table through the `empty` slot:

```ts
template: `<so-table [items]="rows" [columns]="columns" mode="multiple" aria-label="Staff" (soColumnResize)="save($event)">
  <ng-template slot="cell" let-column="column" let-value="value">…</ng-template>
  <p slot="empty">No data</p>
</so-table>`
```

Without a `cell` template a value is rendered as the cell's text from the core (`cell.text`) — an
object as JSON; the `soText` pipe (`TextPipe`) gives your own template the same text. A long list renders only
what is visible inside `<so-virtual>` — the same with a table; the wrapper has no box of its own,
and `enabled` turns the window off:

```ts
template: `<so-virtual><so-list-box [items]="cities" /></so-virtual>`
```

A panel over the page is a Frame. The element you write is the panel, and it is that element which
moves into `target` (`body` by default) once the page has rendered in the browser — with your
`class`, attributes and event listeners on it. Its content keeps the context of the place it is
written in, such as the language of the surrounding `so-locale-provider`. Like a CDK overlay, the
panel exists only in the browser: on the server, and while `target` matches nothing, there is no
panel — the element you wrote stays in place, empty and hidden. `contained` keeps the panel in
place, positioned in its nearest positioned ancestor.

```ts
template: `<div so-frame [visible]="open()" [x]="10" [y]="20" class="app-menu">…</div>`
```

Angular inserts and moves nodes relative to the ones it rendered, so a Frame must not be the first
node of an `@for` item that gets items inserted before it or reordered — Angular fails with
NG05106. Wrap it in an element: `@for (item of items; track item.id) { <section><div so-frame>…`.
The panel follows its place. When Angular takes the place off the page while the component lives
on — a Frame inside a conditional `<ng-content>` of another component, or in a detached view — the
panel leaves the page with it, and when the place comes back, the panel is back in `target`.

The language and the strings the library renders itself come from the nearest
`LocaleProviderDirective` above — it can sit on an `ng-container`, and changing `locale` updates
the components without re-creating them:

```ts
template: `<ng-container so-locale-provider [locale]="locale()"><router-outlet /></ng-container>`
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
