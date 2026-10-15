# @soldy-ui/webc

**The Web Components adapter: Soldy UI as Custom Elements on the headless models of the core.**

Part of [Soldy UI](https://github.com/youra-h/soldy) — UI components with the logic written once: a
framework-agnostic core and thin adapters that render it in Vue, React, Angular, Svelte, Solid and
Web Components.

The adapter is wiring, not behavior: it defines a Custom Element per component and renders the
markup — BEM classes `s-*` and `data-*` state attributes. Props, events and slots come from the
component descriptor, so they match the other five adapters; only the spelling is the platform's:
props are attributes or element properties, and events are DOM events with the core names
(`action:press`). A one-word event gets the `so-` prefix (`show` → `so-show`, `ready` →
`so-ready`): events bubble from your element, and under its own name a component's `input` or
`reset` would mix with the browser's events of that name on the element and its ancestors.

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
microtask after it is inserted, so right after `innerHTML` its `ctrl` is not there yet.

Shadow DOM is not used — a theme styles global BEM classes, so light DOM is distributed by the
`slot` attribute by hand. Content for a slot the component does not have is not rendered, and slots
get no scope: slot content is the element's own light DOM, so component data (the `text` of
Button's `default` slot) cannot be passed into it.

> **Status:** the Web Components adapter is in progress — Button, ProgressSpinner and Skeleton are
> ported, the rest of the set is on its way. See
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

Attributes, classes and inline styles you write on an element win over what the component writes
there itself: `style="width: 40px"` on a skeleton beats the width it computes, and a property a
script sets on the element directly survives the component's updates.

In a form it is simply a button:

```html
<form>
  <input name="q" />
  <button is="so-button" name="action" value="search" text="Search"></button>
  <button is="so-button" type="reset" text="Clear"></button>
</form>
```

From JavaScript the element is the component: props are its properties, events are DOM events, and
a core instance can be handed over as `ctrl` before the element is connected:

```ts
import { TButton } from '@soldy-ui/core'
import { TButtonElement } from '@soldy-ui/webc'

const el = document.createElement('button', { is: 'so-button' })

if (el instanceof TButtonElement) {
  el.ctrl = new TButton({ text: 'Save' })
  el.addEventListener('action:press', () => console.log('pressed'))
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
