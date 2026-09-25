# @soldy-ui/angular

**The Angular adapter: Soldy UI components rendered on the headless models of the core.**

Part of [Soldy UI](https://github.com/youra-h/soldy) — UI components with the logic written once: a
framework-agnostic core and thin adapters that render it in Vue, React, Angular, Svelte, Solid and
Web Components.

The adapter is wiring, not behavior: it connects a core model to Angular's signals and renders the
markup — BEM classes `s-*` and `data-*` state attributes. Props, events and slots come from the
component descriptor, so they match the other five adapters; only the spelling is Angular's:
selectors are prefixed (`<soldy-button>`), events are camelCase outputs (`element:ready` →
`elementReady`), and slots are filled through the `slot` attribute.

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
  template: `<soldy-button text="Save" (actionPress)="onPress()" />`,
})
export class ToolbarComponent {
  onPress(): void {
    console.log('pressed')
  }
}
```

The same component can be driven from code — pass a core instance as `ctrl`, and both sides see the
same state and events:

```ts
template: `<soldy-button [ctrl]="btn" (actionPress)="btn.disabled = true" />`
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
