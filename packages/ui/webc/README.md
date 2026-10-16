# @soldy-ui/webc

**The Web Components adapter: Soldy UI as Custom Elements on the headless models of the core.**

Part of [Soldy UI](https://github.com/youra-h/soldy) — UI components with the logic written once: a
framework-agnostic core and thin adapters that render it in Vue, React, Angular, Svelte, Solid and
Web Components.

The adapter is wiring, not behavior: it defines a Custom Element per component and renders the
markup — BEM classes `so-*` and `data-*` state attributes. Props, events and slots come from the
component descriptor, so they match the other five adapters; only the spelling is the platform's:
props are attributes or element properties, and events are DOM events named `so:` + the core name
(`so:show`, `so:show:before`, `so:action:press`, `so:change:disabled`). Every event has the prefix:
events bubble from your element through the DOM, and the prefix tells a component's event from the
browser's and your own.

Each component is a native element of its tag extended by Soldy (a customized built-in):
`<button is="so-button">` is a real `<button>`, `<div is="so-component-view">` a real `<div>`.
Whatever the browser does for the tag it does for the component — a button submits and resets its
form, is the event's `submitter`, works with `new FormData(form, submitter)`, Enter in a form
field, `formaction`, `<fieldset disabled>`, `<label for>` and `popovertarget`. `class`, `style`,
attributes and listeners on it take effect directly, and an attribute you set (`aria-label`,
`tabindex`) wins over what the component writes. There is no `tag` prop — the root is always the
element you wrote.

Safari does not support customized built-ins, so the package imports the
[`@ungap/custom-elements`](https://github.com/ungap/custom-elements) polyfill (3 KB gzipped); it
does nothing where the browser supports them natively. With the polyfill an element comes to life a
microtask after it is inserted, so right after `innerHTML` its `ctrl` is not there yet. Elements
already in the page when the package is imported are assembled a microtask after the import in every
browser, so the theme, icons and plugins your entry point sets up right after the import (before any
top-level `await`) apply to them too.

Shadow DOM is not used — a theme styles global BEM classes, so light DOM is distributed by the
`slot` attribute by hand. Content for a slot the component does not have is not rendered, and slots
get no scope: slot content is the element's own light DOM, so component data (the `text` of
Button's `default` slot) cannot be passed into it — slot content reads it from the element,
`el.ctrl`.

> **Status:** the Web Components adapter is in progress — Button, Icon, Label, Input, CheckBox,
> Switch, ProgressSpinner, Skeleton and Frame are ported, the rest of the set is on its way. See
> [the adapter table](https://github.com/youra-h/soldy#components).

## Install

```bash
npm install @soldy-ui/webc @soldy-ui/theme-oren @soldy-ui/icons-material
```

A theme and an icon pack are separate packages — pick the ones you want.

## Usage

Importing the package defines the elements:

```ts
import '@soldy-ui/webc'
```

```html
<button is="so-button" text="Save" class="toolbar-action"><i slot="leading">★</i></button>
<button is="so-button"><i slot="leading">★</i> Save</button>
<span is="so-progress-spinner" value="40" aria_label="Uploading"></span>
<div is="so-skeleton" width="160" height="16"><p>Loaded content</p></div>
```

An icon from the icon pack is `<span is="so-icon">` with the role in its `icon` attribute (`el.icon`
from code). The role is the element's own attribute, not a component prop: the element draws the
role's `<svg>` inside itself, stretched to its box. The `span` is the icon's root — size, classes
and the accessible name are on it, as with any element. Without a name the icon is hidden from
screen readers:

```html
<span is="so-icon" icon="close" size="lg"></span>
<span is="so-icon" icon="close" aria_label="Close"></span>
<button is="so-button" text="Next">
  <span is="so-icon" icon="arrowRight" slot="trailing"></span>
</button>
```

The icon is always a `span`: `is` extends HTML elements only, so it cannot be an `<svg>`, and one
name extends one tag, so `<i is="so-icon">` does not come to life. A bare `<svg>` with a role's
picture, for markup of your own, is `roleIcon(role)` from the package.

Attributes, classes and inline styles you write on an element win over what the component writes
there itself: `style="width: 40px"` on a skeleton beats the width it computes, and a property a
script sets on the element directly survives the component's updates.

A frame is a layer above the page: the element you wrote moves itself to its `target` (`body` by
default), out from under `overflow` and stacking contexts, with your class, attributes and
listeners on it, and a comment stays in its place. It is hidden until `visible`, and `contained`
keeps it in place, inside the nearest positioned ancestor:

```html
<div class="card">
  <div is="so-frame" visible target="#layers" class="menu-panel" x="40" y="120">
    <button is="so-button" text="Rename"></button>
  </div>
</div>
```

Moving the panel rebuilds neither the frame nor anything inside it, and the panel keeps the place it
was written in: the button above takes its language from the `<so-locale-provider>` around the
card, not around `#layers`. Removing the card from the page takes the panel out of the target with
it.

In a form it is simply a button:

```html
<form>
  <input name="q" />
  <button is="so-button" name="action" value="search" text="Search"></button>
  <button is="so-button" type="reset" text="Clear"></button>
</form>
```

A field — `<div is="so-input">`, `<span is="so-check-box">`, `<span is="so-switch">` — is your
element with a real `<input>` inside, in the page's ordinary DOM. The form sees that input by
itself: `FormData`, `<fieldset disabled>`, validation and `<label>` work as with any input, no
form-associated element involved. A checkbox and a switch get their visible name from
`<label is="so-label">` around them: clicking the text toggles the control, and the text becomes
its accessible name.

```html
<form>
  <div is="so-input" name="city" placeholder="City" autocomplete="address-level2"></div>
  <label is="so-label" text="Send me news">
    <span is="so-check-box" name="news"></span>
  </label>
  <label is="so-label" text="Dark theme">
    <span is="so-switch" name="dark"></span>
  </label>
</form>
```

Attributes you write on a field are split as in the other adapters: `class`, `style` and the
component's own props (`name`, `disabled`, `placeholder`) stay on the element, and every other
attribute in the markup — `autocomplete`, `aria-label`, `tabindex`, `data-*` — moves to the
`<input>` when the element is built. An attribute you set from code later stays on the element.
`id` is the input's: `id="city"` in the markup lands on the `<input>`, so `<label for="city">`
finds it; from code the input's id is `el.ctrl.id`, while `el.id` is the element's own.

Slot content gets no scope, so your own clear button (the `clear` slot) clears the field through
the element: `el.ctrl.clear()`. The built-in clear button and its icon are part of the field's
markup, so their events (`so:action:press`, `so:change:focused`) do not bubble — listeners on the
field and delegation on the form hear the field's own events only.

From JavaScript the element is the component: props are its properties, events are DOM events, and
a core instance can be handed over as `ctrl` before the element is connected:

```ts
import { TButton } from '@soldy-ui/core'
import { TButtonElement } from '@soldy-ui/webc'

const el = document.createElement('button', { is: 'so-button' })

if (el instanceof TButtonElement) {
  el.ctrl = new TButton({ text: 'Save' })
  el.addEventListener('so:action:press', () => console.log('pressed'))
  document.body.append(el)
}
```

The language of the strings the library renders itself and the locale for `Intl` come from the
nearest `<so-locale-provider>` above an element; without one, components are in English. The
provider has no box of its own (its children lay out as if it were not there), and its `locale` is a
property — a locale is an object, so there is no attribute. Changing it updates the components in
place, and a nested provider gives its subtree a language of its own:

```html
<so-locale-provider>
  <button is="so-button" text="Save"></button>
</so-locale-provider>

<script type="module">
  import { ruRU } from '@soldy-ui/plugins'

  document.querySelector('so-locale-provider').locale = ruRU
</script>
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
