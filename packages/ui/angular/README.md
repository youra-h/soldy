# @soldy-ui/angular

**The Angular adapter: Soldy UI components rendered on the headless models of the core.**

Part of [Soldy UI](https://github.com/youra-h/soldy-ui) — UI components with the logic written once: a
framework-agnostic core and thin adapters that render it in Vue, React, Angular, Svelte, Solid and
Web Components.

The adapter is wiring, not behavior: it connects a core model to Angular's signals and renders the
markup — BEM classes `so-*` and `data-*` state attributes. Props, events and slots come from the
component descriptor, so they match the other five adapters; only the spelling is Angular's: a
component is always a prefixed attribute, never a tag of its own — on your own element when it has
an element to render into (`<button so-button>`, `<div so-input>`; the toasts manager has its
region, so it is `<div so-toasts>`), and on an `<ng-container>` when it renders no element of its
own (`<ng-container so-virtual>`, `<ng-container so-drag-and-drop>`, like
`<ng-container so-locale-provider>`) — events are outputs
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
> the control inside it), Scroller (`<div so-scroller>`), RadioGroup, ListBox, Tags
> (`<div so-tags>`), Select (`<div so-select>`, a field with a list in a panel), Tabs, Accordion,
> Pagination (`<nav so-pagination>`), Table, the dates — DateInput (`<div so-date-input>`, a date
> field of parts), Calendar (`<div so-calendar>`) and DatePicker (`<div so-date-picker>`, a date
> field with a calendar in a panel) —, the `Virtual` window for long lists and the
> `<ng-container so-drag-and-drop>` wrapper that lets users reorder the items of Tabs, ListBox and
> Accordion by dragging (`(soMove)`, `(soMoveBefore)` can cancel) are ported, the rest of the set is on its
> way. Frame moves the element you wrote into `target` (`body` by default) in the browser; with
> `contained` it stays in place. Popover (`<span so-popover>`) and Tooltip (`<span so-tooltip>`)
> are panels on a Frame anchored to the element you write them on. Menu (`<span so-menu>`) is an
> action menu at a button or, with `openOn="contextmenu"`, on right click, with submenus,
> checkbox and radio items and an item with its own panel. The modal window Dialog
> (`<div so-dialog>`) and the sliding panel Drawer (`<div so-drawer>`) are layers themselves, with a
> backdrop placed before them. Toasts (`<div so-toasts>` around the application, a toast from code
> with `useToasts().show(…)`) show notifications at an edge of the window. `so-locale-provider`
> gives a subtree its language and library strings. See
> [the adapter table](https://github.com/youra-h/soldy-ui#components).

## Install

```bash
npm install @soldy-ui/angular @soldy-ui/theme-oren @soldy-ui/icons-material
```

`@angular/core`, `@angular/common` and `@angular/platform-browser` (Angular 22.2+) are peer
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
(see the fields below). It is required: without it a field, Select, a collection item, ListBox,
Tabs, Table and Toasts throw an error telling you to add it. Put it in the application config, not in the providers
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

The `[so-attributes]` directive on such a component goes the same way as the rest of your markup:
the set lands on the `<input>`, the row or the list, on top of what the component puts there
itself.

A slot by which a part decides whether to render its own default — the close icon of a tab, the
arrows of an accordion section, the edges of the tab list — is an `<ng-template slot>` only, and a
template given to the owner renders in every item in place of its own. A tab panel that is not
active stays in place hidden, its content not inserted; a markup tab closed with its close button
is hidden the same way — the element is yours.

A tab panel takes its content as is or as a template, `<ng-template slot="default">`, and a given
template is drawn instead. Write heavy content — a table, a calendar, a form — as a template: the
panel creates it when its tab is chosen and removes it when the tab is left, so an inactive panel
holds nothing. Content written as is Angular creates right away, with the template that wrote it:
the components of every panel live as long as the tabs do, an inactive panel only keeps them out of
the document.

```ts
template: `<div so-tabs>
  <div so-tabs-item value="a" text="General" active></div>
  <div so-tabs-item value="b" text="History"></div>
  <div so-tabs-content slot="content" value="a">…</div>
  <div so-tabs-content slot="content" value="b">
    <ng-template slot="default"><div so-table [items]="rows" [columns]="columns"></div></ng-template>
  </div>
</div>`
```

A tag set, `<div so-tags>`, is the row itself: your markup stays on it, next to its role. Tags are
`<div so-tags-item>` parts or come from `items`; with `mode` they become selectable, and with
`closable` every tag gets a close button. To lay the shown tags out yourself — in a scroller strip,
or a row with the rest in a popover — give the set a `default` template: its context carries
`shown`, and every tag is rendered in it exactly once.

```ts
template: `<div so-tags closable [items]="cities" (soChangeValue)="pick($event.newValue)"></div>
<div so-tags overflow="scroll" [items]="cities">
  <ng-template slot="default" let-shown="shown">
    <div so-scroller>
      @for (tag of shown; track tag.uid) {
        <div so-tags-item [ctrl]="tag"></div>
      }
    </div>
  </ng-template>
</div>`
```

A select, `<div so-select>`, is a field with the list in a panel anchored to the element, moved into
`body` like a Frame. Options are `<div so-select-item>` parts, grouped with
`<div so-select-group label="…">`, or come from `items`; with `mode="multiple"` the chosen ones
show as tags in the field, `editable` lets you type, and `editableMode="filter"` narrows the list.
It splits your markup like a field: `class` and `style` stay on the element, while everything else
— `aria-label`, `id`, `[attr.x]`, `(keyup)` — goes to the `<input>` of its field. The `field`,
`tags`, `clear`, `arrow-icon` and item slots are templates; `leading`, `trailing` and `empty` are
elements by the `slot` attribute. Options join the collection on the server too, so the server
renders the field with the chosen text; the panel exists only in the browser.

```ts
template: `<div so-select placeholder="City" aria-label="City" (soChangeValue)="pick($event.newValue)">
  <div so-select-item value="msk" text="Moscow"></div>
  <div so-select-group label="Volga">
    <div so-select-item value="kzn" text="Kazan"></div>
  </div>
</div>`
```

A date field, `<div so-date-input>`, is a group of parts in the format of the subtree's locale —
day, month and year, with `kind="datetime"` also the time; the form gets the date as a string. A
calendar, `<div so-calendar>`, draws its month grids itself — a day is a cell,
`<td so-calendar-item>` — with one pair of paging buttons and a month and year picker under each
month title. `<div so-date-picker>` is a date field, or two for a range, with a calendar in a panel
anchored to the element and moved into `body` like a Frame. None of them has a native field to pass
your markup to, so it all stays on the element you write them on, the `id` of a date field and a
date picker too. The slots are templates: the calendar's `item` (`let-item`, `let-text`),
`prev-icon`, `next-icon` and `footer`; the date field's `leading`, `clear` and `trailing`; the date
picker's `clear`, `trigger-icon` and `item`.

```ts
template: `<div so-date-picker mode="range" aria_label="Trip" (soChangeValue)="trip.set($event.newValue)"></div>
<div so-calendar [months]="months">
  <ng-template slot="item" let-text="text"><b>{{ text }}</b></ng-template>
</div>`
```

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
what is visible inside `<ng-container so-virtual>` — the same with a table; the window renders no
element of its own, so the layout around the list stays as it is, and `enabled` turns the window
off:

```ts
template: `<ng-container so-virtual><div so-list-box [items]="cities"></div></ng-container>`
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
`close-icon` template); the content of a tooltip is its text. A popover takes its content as is
or as a template, `<ng-template slot="default">`, and a given template is drawn instead. Write it
as a template when it should not be created right away: the popover creates the template itself,
and with `lazyMount` its components come with the first open of the panel. Content written as is
Angular creates right away, with the template that wrote it, and `lazyMount` only keeps it out of
the document until the first open. `rendered` set to `false` hides the panel along with your
element. Like a Frame, the panel exists only in the browser: on the server it is an empty hidden
element inside yours, and the trigger already links to it.

```ts
template: `<span so-popover aria_label="Filters" lazyMount (soChangeOpen)="opened.set($event)">
  <ng-template slot="trigger" let-triggerAria="triggerAria" let-triggerDataset="triggerDataset">
    <button so-button text="Filters" [so-attributes]="{ ...triggerAria, ...triggerDataset }"></button>
  </ng-template>
  <ng-template slot="default">…</ng-template>
</span>
<span so-tooltip>
  <ng-template slot="trigger" let-triggerAria="triggerAria">
    <button so-button text="Save" [so-attributes]="triggerAria"></button>
  </ng-template>
  Save a draft
</span>`
```

A menu is written on your element too, `<span so-menu>`, with its trigger template as in a popover
— a button, or with `openOn="contextmenu"` the area it is called over by a right click, a long
touch or Shift+F10, and then the panel opens at that point. The items are parts on your own
elements: `<div so-menu-item>` (an action — `(soChoose)` on the menu tells which one was chosen),
`<div so-menu-checkbox-item>`, `<div so-menu-radio-item>` inside `<div so-menu-radio-group>`
(the group's `[value]` and `(soChangeValue)`), `<div so-menu-group label="…">`,
`<div so-menu-separator>`, `<div so-menu-submenu>` with items of its own and
`<div so-menu-popover-item>` with any content in its own side panel — as in a popover, a
`<ng-template slot="default">` with `lazyMount` is created with the first open of the panel, and
the row text is the `header` template. A checkbox or a radio item is
checked with `[selected]` and `(soChangeSelected)`. The items of a menu and of a submenu are written
as is or as a template, `<ng-template slot="default">`, and a given template is drawn instead.
Write them as a template when they should not be created right away — say, a menu in every row of a
table: the menu creates the template itself, with the first open of its panel, and the items stay
until the menu is removed. Items written as is Angular creates with the menu, and the menu only
keeps them out of the document until the first open. Without items in the markup, the menu draws them
from `[items]`: an item with nested `items` is a submenu, groups come from `_.group` or `groupBy`,
and the item slots are templates — `item`, `item-leading`, `item-trailing`, `item-header` and
`item-arrow-icon`, with the item in the context; a submenu from data gets them under the same names.
The `item-content` template is the panel of a submenu from data: write menu items in it, and they
belong to the submenu it is drawn in, not to the menu you wrote it in. Given, it replaces the items
from data in every submenu from data, even where it draws nothing. A group, a radio group or a
submenu written inside the template keeps its own items.

```ts
template: `<span so-menu (soChoose)="run($event.value)">
  <ng-template slot="trigger" let-triggerAria="triggerAria" let-triggerDataset="triggerDataset">
    <button so-button text="Actions" [so-attributes]="{ ...triggerAria, ...triggerDataset }"></button>
  </ng-template>
  <div so-menu-item value="edit" text="Edit"><span slot="trailing">Ctrl+E</span></div>
  <div so-menu-submenu value="share" text="Share">
    <ng-template slot="default">
      <div so-menu-item value="link" text="Link"></div>
      <div so-menu-item value="mail" text="Mail"></div>
    </ng-template>
  </div>
  <div so-menu-popover-item value="due" text="Due date" lazyMount>
    <ng-template slot="default"><div so-calendar></div></ng-template>
  </div>
  <div so-menu-separator></div>
  <div so-menu-item value="remove" text="Delete"></div>
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

Toasts are shown from code. `<div so-toasts>` wraps the application and has no box of its own: the
application inside it stays in place, and the region with the toasts moves to `target` (`body` by
default) in the browser — with everything you wrote on the `div`: `class`, `style`, attributes,
`[class.x]`, `[style.x]`, `[attr.x]` and listeners. A component under the manager takes the queue
with `useToasts()` in a field or its constructor, and `show` takes a text or options and returns the
toast — the core instance you can change or close. Content of your own (`render`) is a component
class with a `toast` input. The `item`, `item-icon`, `item-content` and `item-close-icon` slots are
templates with the toast in their context. Like the other layers, the region exists only in the
browser; the application inside the manager renders on the server and hydrates as usual.

```ts
@Component({
  selector: 'app-undo',
  imports: [TButtonComponent],
  template: `<button so-button text="Undo" (click)="toast().close()"></button>`,
})
export class Undo {
  readonly toast = input.required<IToastsItem>()
}

@Component({
  selector: 'app-save',
  imports: [TButtonComponent],
  template: `<button so-button text="Save" (click)="save()"></button>`,
})
export class Save {
  private readonly toasts = useToasts()

  save(): void {
    this.toasts.show({ text: 'Draft saved', type: 'success', render: Undo })
  }
}

// In the application template:
// <div so-toasts placement="bottom-end"><router-outlet /></div>
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

useIcons(material)
useTheme(oren)
```

The theme's stylesheet goes into the global styles, `src/styles.css` — the file listed in `styles`
of `angular.json`:

```css
@import '@soldy-ui/theme-oren';
```

Not an `import` in `main.ts`: Angular CLI puts CSS imported from a module into a chunk the page
never loads, and the components stay unstyled. The values of the theme, such as
`variant="accent"`, reach the template type check with `@soldy-ui/theme-oren/setup`.

The `initial` budget of Angular CLI counts the raw bytes of the initial JavaScript and the global
styles, and a project made by `ng new` fails the build above 1 MB. The theme's stylesheet holds the
CSS of every component — 356 kB raw, 35 kB gzip — and a page with a Button, an Input, a Select, a
Dialog, a Table and a DatePicker adds 698 kB of JavaScript (170 kB gzip): 1.05 MB raw, 205 kB over
the network. Raise the error threshold of the `initial` entry in `budgets` of the `production`
configuration in `angular.json`:

```json
{ "type": "initial", "maximumWarning": "500kB", "maximumError": "2MB" }
```

## Documentation

- [Soldy UI README](https://github.com/youra-h/soldy-ui#readme) — the component set and what each
  adapter implements so far.
- [Architecture overview](https://github.com/youra-h/soldy-ui/blob/main/docs/architecture.md) —
  layers, descriptors, plugins, collections, adapters.

## License

[MIT](https://github.com/youra-h/soldy-ui/blob/main/LICENSE)
