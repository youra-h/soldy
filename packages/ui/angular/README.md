# @soldy-ui/angular

**The Angular adapter: Soldy UI components rendered on the headless models of the core.**

Part of [Soldy UI](https://github.com/youra-h/soldy) — UI components with the logic written once: a
framework-agnostic core and thin adapters that render it in Vue, React, Angular, Svelte, Solid and
Web Components.

The adapter is wiring, not behavior: it connects a core model to Angular's signals and renders the
markup — BEM classes `so-*` and `data-*` state attributes. Props, events and slots come from the
component descriptor, so they match the other five adapters; only the spelling is Angular's: a
component is a prefixed attribute on your own element (`<button so-button>`, `<div so-input>`) —
only the wrappers without a box of their own are elements (`<so-virtual>`, `<so-drag-and-drop>`) —
events are outputs
named `so` + the core name in camelCase (`show` → `soShow`, `show:before` → `soShowBefore`,
`element:ready` → `soElementReady`), and slots are filled through the `slot` attribute. Every
output has the prefix: Angular binds `(x)` both to an output and to the DOM event of that name, so
`(input)` on a field is the browser's event, as on a native `<input>`, and the component's own is
`(soInput)`.

The components are standalone and zoneless — state is a signal, so Zone.js is not required. They
render on the server (`@angular/platform-server`) and hydrate in the browser
(`provideClientHydration`); component ids match on both sides.

> **Status:** the Angular adapter is in progress — Button, Icon, Label, Frame, ProgressSpinner,
> ProgressLinear (`<span so-progress-linear>`), Skeleton, Input, NumberInput (a number in the
> locale's format with − and + step buttons; the form gets the number), Textarea (multi-line,
> growing with its text, with a character counter), CheckBox, Switch, Slider (`<span so-slider>`),
> Rating (`<span so-rating>`), the form field `<div so-field>` (label, helper and error linked to
> the control inside it), Scroller (`<div so-scroller>`), RadioGroup, ListBox, Tabs, Accordion,
> Pagination (`<nav so-pagination>`), Table, the `Virtual` window for long lists and the
> `<so-drag-and-drop>` wrapper that lets users reorder the items of Tabs, ListBox and Accordion by
> dragging (`(soMove)`, `(soMoveBefore)` can cancel) are ported, the rest of the set is on its
> way. Frame moves the element you wrote into `target` (`body` by default) in the browser; with
> `contained` it stays in place. Popover (`<span so-popover>`) and Tooltip (`<span so-tooltip>`)
> are panels on a Frame anchored to the element you write them on. The modal window Dialog
> (`<div so-dialog>`) and the sliding panel Drawer (`<div so-drawer>`) are layers themselves, with a
> backdrop placed before them. `so-locale-provider` gives a subtree its language and library
> strings. See [the adapter table](https://github.com/youra-h/soldy#components).

## Install

```bash
npm install @soldy-ui/angular @soldy-ui/theme-oren @soldy-ui/icons-material
```

`@angular/core`, `@angular/common` and `@angular/platform-browser` (Angular 21.1 or 22) are peer
dependencies. A theme and an icon pack are separate packages — pick the ones you want.

Add `provideAttrs()` to the providers of your application config — the one shared by the browser and
the server:

```ts
import { ApplicationConfig } from '@angular/core'
import { provideAttrs } from '@soldy-ui/angular'

export const appConfig: ApplicationConfig = {
  providers: [provideAttrs()],
}
```

It lets the bindings and listeners you write on a component reach the node inside it they belong to
(see the fields below). It is required: without it a field, a collection item, ListBox, Tabs and
Table throw an error telling you to add it. Put it in the application config, not in the providers
of a route or a component — there it cannot replace the renderer of the application.

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
next to `TIconComponent`. Your own drawing is registered as a role too (`useIcons`): the icon renders
nothing written inside it.

```ts
template: `<svg so-icon so-role-icon="close" aria_label="Close"></svg>`
```

A field — Input, NumberInput, Textarea, CheckBox, Switch — is written on a `div` or, for the inline
CheckBox and Switch, a `span` (`<div so-input>`, `<div so-number-input>`, `<div so-textarea>`,
`<span so-check-box>`, `<span so-switch>`) and renders a native `<input>` (a `<textarea>`) inside,
so your markup is split the way Vue and React split it: `class` and `style` stay on the field,
while everything else you write on it goes to the `<input>` — static attributes (`autocomplete`,
`data-*`), bindings (`[attr.aria-describedby]`, `[aria-label]`, `[title]`) and listeners
(`(focus)`, `(blur)`), which is what `provideAttrs()` is for. A field is not an `<input>` itself —
`<input so-input>` throws, since its template would have nowhere to render. A field gets its
visible name from a Label around it:

```ts
template: `<label so-label text="Remember me"
    ><span so-check-box (soChangeValue)="remember($event)"></span
  ></label>
  <div so-input clearable name="City" autocomplete="address-level2" (blur)="check()"></div>`
```

Slots that hand data in are `<ng-template slot>` — the content next to an Input gets the field
itself:

```ts
template: `<div so-input>
  <ng-template slot="trailing" let-ctrl="ctrl">{{ ctrl.value?.length ?? 0 }}/40</ng-template>
</div>`
```

A number field shows its number in the locale's format — `1,234.5`, `12%` or `RUB 1,234.50` with
`formatOptions` — and steps it within `min` and `max` with the arrow keys and the − and + buttons,
which repeat while held. The form gets the number, not the text: `name` goes to a hidden `<input>`
with `1234.5`, while what you write on the field goes to the text `<input>`. `(soChangeValue)`
comes on every typed digit and step, `(soCommit)` once per finished action — leaving the field,
Enter, releasing a step button. The icons of the step buttons are templates,
`<ng-template slot="decrement-icon">` and `increment-icon`:

```ts
template: `<div so-number-input name="qty" [min]="0" [value]="qty()" (soCommit)="save($event.newValue)"></div>`
```

A slider and a rating are fields as well: `<span so-slider>` has a native `<input type="range">` in
each thumb, `<span so-rating>` one under its row of stars, and the form gets their values under
`name`. A number is one thumb, an array is a thumb per item (`[value]="[20, 80]"`). The pointer
works on the track, never on the inputs, so what you write on these two stays on the element; only
a rating's `id` is an input, and it goes to its range input, where `<label for>` finds it. With
several thumbs the slider is a group named by `aria_label`, and each thumb takes its own name from
`thumbLabels`. The `mark` and `thumb` slots of a slider and the `icon` slot of a rating are
templates with the data of their mark, thumb or star:

```ts
template: `<label so-label text="Volume" position="top"><span so-slider name="volume" [value]="40"></span></label>
<span so-slider [value]="[20, 80]" aria_label="Price" [thumbLabels]="['From', 'To']" tooltip="always">
  <ng-template slot="thumb" let-value="value">{{ value }} ₽</ng-template>
</span>
<span so-rating name="score" [value]="3.5" [step]="0.5" aria_label="Score" (soCommit)="rate($event.newValue)"></span>`
```

A collection — RadioGroup, ListBox, Tabs, Accordion — is an owner element with its items inside
(`<div so-radio-group>`, `<div so-list-box>`, `<div so-tabs>`, `<div so-accordion>`). The parts are
components of their own, written as separate elements, since Angular has no dot syntax:
`<div so-list-box-item>`, `<div so-tabs-item>`, `<div so-accordion-item>`,
`<label so-radio-group-item>` and the tab panel `<div so-tabs-content>`. Items written in the markup
join the collection in document order, on the server too; without them the owner renders its
`items`. Inputs of the collection — `items`, `engine`, `mode`, an item's `selected` or `active` — are
inputs of the same element:

```ts
template: `<div so-list-box mode="multiple" aria-label="Cities" (soChangeValue)="pick($event.newValue)">
  <div so-list-box-item value="a" text="Moscow"></div>
  <div so-list-box-item value="b" text="Kazan" selected></div>
</div>
<div so-tabs>
  <div so-tabs-item value="a" text="General" active></div>
  <div so-tabs-item value="b" text="Mail"></div>
  <div so-tabs-content slot="content" value="a">…</div>
  <div so-tabs-content slot="content" value="b">…</div>
</div>`
```

A list box and tabs split your markup like a field: `class` and `style` stay on the element — a
frame around the list, next to the header and footer of a list box or the panels of tabs — while
everything else you write on it (`aria-label`, `id`, `tabindex`, `data-*`, `[attr.x]`, `(keydown)`)
goes to the list itself, `[role=listbox]` or `[role=tablist]`, which it names. An item splits your
markup the same way: `class` and `style` stay on the item, the rest (`title`, `id`, `(click)`) goes
to its row — or to the `<input>` of a radio. Animation and transition events (`(transitionend)`)
stay on the element you wrote: that is where they happen. Inside
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

Pagination draws its pages itself — from `total` and `pageSize`, or from a list of `pages` — and
has no content of its own: a page is an inner part, `<li so-pagination-item>` with a button in it,
and the `item` slot gives every page your template with the page and its text. A scroller lays its
content out in its viewport, between the two buttons; a role for the row and what goes with it
comes to the viewport as `viewportAria`. The arrow icons of both are templates, `prev-icon` and
`next-icon`:

```ts
template: `<nav so-pagination [total]="200" [value]="page()" aria_label="Result pages" (soChangeValue)="page.set($event.newValue)"></nav>
<div so-scroller>
  <button so-button text="First"></button>
  <button so-button text="Second"></button>
</div>`
```

A table takes its columns and rows as data only — `columns` and `items`, or an `engine` — and draws
its headers (`th[so-table-column]`) and rows (`tr[so-table-row]`) itself: sorting, row selection
with "select all", column resizing and reordering, a grid mode and a sticky head. The element you
write it on, `<div so-table>`, is the table's scroll viewport, with the `<table>` inside it, and it
splits your markup like a field: `class`, `style` and hiding stay on the viewport, while everything
else you write on it (`aria-label`, `id`, `data-*`, bindings and listeners) goes to the `<table>`,
which it names, next to the classes and ARIA of the table. A header and a cell are filled through
templates — a template given to the table renders in every header or cell — and an empty table
through the `empty` slot:

```ts
template: `<div so-table [items]="rows" [columns]="columns" mode="multiple" aria-label="Staff" (soColumnResize)="save($event)">
  <ng-template slot="cell" let-column="column" let-value="value">…</ng-template>
  <p slot="empty">No data</p>
</div>`
```

Without a `cell` template a value is rendered as the cell's text from the core (`cell.text`) — an
object as JSON; the `soText` pipe (`TextPipe`) gives your own template the same text. A long list renders only
what is visible inside `<so-virtual>` — the same with a table; the wrapper has no box of its own,
and `enabled` turns the window off:

```ts
template: `<so-virtual><div so-list-box [items]="cities"></div></so-virtual>`
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

A popover and a tooltip are written on your element, `<span so-popover>` and `<span so-tooltip>`,
which wraps the trigger and anchors their panel — a Frame of their own, moved into `body`. The
trigger is a template, `<ng-template slot="trigger">`: its context carries what links the trigger
to the panel — `triggerAria` (`aria-expanded`, `aria-controls` or the tooltip's `aria-describedby`)
and, for a popover, `triggerDataset` with the pressed look — and you put it on your own element
with the `[so-attributes]` directive. Import `SlotDirective` and `AttributesDirective` along with
the component. The trigger stays the same node as the panel opens and closes, so focus stays on
it. The content of a popover is its panel's content, next to a close button (`closable`, the
`close-icon` template); the content of a tooltip is its text. `lazyMount` keeps a popover's content
out of the document until it first opens, although Angular creates the components in it right
away: they belong to the template that wrote them. `rendered` set to `false` hides the panel along
with your element. Like a Frame, the panel exists only in the browser: on the server it is an empty
hidden element inside yours, and the trigger already links to it.

```ts
template: `<span so-popover aria_label="Filters" (soChangeOpen)="opened.set($event)">
  <ng-template slot="trigger" let-triggerAria="triggerAria" let-triggerDataset="triggerDataset">
    <button so-button text="Filters" [so-attributes]="{ ...triggerAria, ...triggerDataset }"></button>
  </ng-template>
  …
</span>
<span so-tooltip>
  <ng-template slot="trigger" let-triggerAria="triggerAria">
    <button so-button text="Save" [so-attributes]="triggerAria"></button>
  </ng-template>
  Save a draft
</span>`
```

A modal window and a sliding panel are written on your element, `<div so-dialog>` and
`<div so-drawer>`, and that element is the panel: it moves into `target` (`body` by default) with
your `class`, attributes and listeners, while a drawer with `contained` stays in place, positioned
in its nearest positioned ancestor. The backdrop is placed right before the panel by the component
itself — in the target and in place — and hides with it. Whether the panel is open is `visible`:
bind it and listen to `(soChangeVisible)`. The close button, Escape, a press on the backdrop and a
drawer's swipe ask the panel to close, and `(soCloseBefore)` can refuse with
`$event.preventDefault()`. The title and the footer are slots by the `slot` attribute
(`<span slot="title">`, `<button so-button slot="footer">`), the rest of the content is the body;
the icons of the header buttons are templates — `close-icon`, and for a dialog with `maximizable`
also `maximize-icon` and `restore-icon`. Like a Frame, the panel exists only in the browser: on the
server it is your element, empty and hidden, and inside `@for` it needs a wrapping element.

```ts
template: `<button so-button text="Settings" (click)="open.set(true)"></button>
<div so-dialog [visible]="open()" (soChangeVisible)="open.set($event)">
  <span slot="title">Settings</span>
  …
  <button so-button slot="footer" text="Done" (click)="open.set(false)"></button>
</div>`
```

The language and the strings the library renders itself come from the nearest
`LocaleProviderDirective` above — it can sit on an `ng-container`, and changing `locale` updates
the components without re-creating them:

```ts
template: `<ng-container so-locale-provider [locale]="locale()"><router-outlet /></ng-container>`
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
