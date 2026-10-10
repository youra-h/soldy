# @soldy-ui/angular

**The Angular adapter: Soldy UI components rendered on the headless models of the core.**

Part of [Soldy UI](https://github.com/youra-h/soldy) — UI components with the logic written once: a
framework-agnostic core and thin adapters that render it in Vue, React, Angular, Svelte, Solid and
Web Components.

The adapter is wiring, not behavior: it connects a core model to Angular's signals and renders the
markup — BEM classes `s-*` and `data-*` state attributes. Props, events and slots come from the
component descriptor, so they match the other five adapters; only the spelling is Angular's: a
component is a prefixed attribute on your own element (`<button so-button>`), events are camelCase
outputs (`element:ready` → `elementReady`), and slots are filled through the `slot` attribute.

The components are standalone and zoneless — state is a signal, so Zone.js is not required.

> **Status:** the Angular adapter is in progress — Button is ported, the rest of the set is on its
> way. See [the adapter table](https://github.com/youra-h/soldy#components).

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
  template: `<button so-button text="Save" (actionPress)="onPress()"></button>`,
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
the element, and an attribute you set wins over the one the component writes: `tabindex="-1"` or
`role="link"` is kept. `rendered` set to `false` hides the element instead of removing it — the
element is yours — and your inline `display` wins over hiding.

Import the component you use: without `TButtonComponent` in `imports`, `<button so-button>` is a
plain button and Angular reports nothing; only an input binding such as `[text]` fails (NG8002).

The same component can be driven from code — pass a core instance as `ctrl`, and both sides see the
same state and events:

```ts
template: `<button so-button [ctrl]="btn" (actionPress)="btn.disabled = true"></button>`
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
