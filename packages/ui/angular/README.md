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

The components are standalone and zoneless — state is a signal, so Zone.js is not required. They
render on the server (`@angular/platform-server`) and hydrate in the browser
(`provideClientHydration`); component ids match on both sides.

> **Status:** the Angular adapter is in progress — Button, Icon, Frame, ProgressSpinner and Skeleton
> are ported, the rest of the set is on its way. Frame moves the element you wrote into `target`
> (`body` by default) in the browser; with `contained` it stays in place. `so-locale-provider` gives
> a subtree its language and library strings. See
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
template: `<button so-button [ctrl]="btn" (actionPress)="btn.disabled = true"></button>`
```

An icon from the registered pack is an `<svg>` with the icon's role — import `RoleIconDirective`
next to `TIconComponent`. Your own drawing is registered as a role too (`setIcons`): the icon renders
nothing written inside it.

```ts
template: `<svg so-icon so-role-icon="close" aria_label="Close"></svg>`
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
Angular also does not tell a component that its place left the page while the component lives on,
so a Frame projected through a conditional `<ng-content>` of another component does not follow that
content: it stays in `target` or comes back in place. Put the condition around the Frame itself.

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
