# Soldy UI

**UI components with the logic written once: a framework-agnostic core and thin adapters that
render it in Vue, React, Angular, Svelte, Solid and Web Components.**

[![CI](https://github.com/youra-h/soldy/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/youra-h/soldy/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> **Status:** version `0.1.0`, early development. The API still changes. The packages are ready to
> publish — the first release to npm is on its way.

## What it is

The behavior of a Soldy UI component lives in a headless core with no framework in it: component
models in plain TypeScript that own their state, events, collections and ARIA. Behavior that needs
the DOM — focus, keyboard, overlay — comes as plugins, and the component contract (props, events,
slots) is declared once, in a descriptor. Thin adapters for Vue, React, Angular, Svelte, Solid and
Web Components connect that model to a framework and render the markup: BEM classes `s-*` and
`data-*` state attributes. The look comes from a theme, shipped as a separate package.

## Why Soldy UI

- **Logic is written once.** Behavior lives in the core, plugins and collection extensions, and an
  adapter only wires it up. Reactivity and lifecycle hooks stay in the adapter layer of each
  package; ESLint rules and tests keep them out of components.
- **One contract for every framework.** Props, events and slots are declared in the descriptor, and
  every adapter derives its API from it. Names match across frameworks; only the spelling follows
  each one's conventions: `@change:text` in Vue, `onChangeText` in React.
- **Two equal ways to drive a component.** Configure it in the template, or create a core instance,
  pass it as `ctrl` and work with it from code: both sides see the same state and events. Plugins
  are reachable from the instance too, through the `bundle:create` event.
- **Collections are an engine, not an array.** Tabs, Accordion, ListBox, Select and Tags run on the
  same engine with pluggable extensions: selection, activation, order, filtering. Every insert,
  update, remove, move and clear first emits a cancellable `*:before` event, and items come from
  the `items` prop or from markup.
- **Accessibility from the WAI-ARIA Authoring Practices.** Tabs, Accordion, Select and Switch take
  roles and relations from their APG patterns. Select implements the Combobox keyboard model, and
  Tabs the Tabs one: arrow keys and Home/End with automatic activation, and a single Tab stop.
  ARIA is computed outside the framework and rendered with the markup, so it is in place from the
  first render.
- **Themes and icon packs are pluggable contracts.** A theme styles `s-*` classes and `data-*`
  attributes, never `aria-*`, so an accessibility fix does not break the look. An icon pack is
  plain data for a fixed set of roles, with no bundler-specific imports.
- **Rules are enforced, not just written down.** TypeScript runs in `strict` mode with no escape
  hatches: `as any`, `as unknown as X`, non-null `!` and `@ts-ignore` fail CI. Key architectural
  rules have guard tests, and the playground layout is checked in real Chromium, not in jsdom.

## What it looks like

The examples use Vue and are based on the adapter tests and the playground.

Compound components name their parts with a dot:

```vue
<script setup lang="ts">
import { Accordion } from '@soldy-ui/vue'
</script>

<template>
  <Accordion mode="multiple">
    <Accordion.Item text="First" value="a" :selected="true">
      <p>Content A</p>
    </Accordion.Item>
    <Accordion.Item text="Second" value="b">
      <p>Content B</p>
    </Accordion.Item>
  </Accordion>
</template>
```

The same component can be driven from code — pass a core instance as `ctrl`:

```vue
<script setup lang="ts">
import { TButton } from '@soldy-ui/core'
import { TActionPlugin, TPluginBundle } from '@soldy-ui/plugins'
import { Button } from '@soldy-ui/vue'

const btn = new TButton({ text: 'Save', variant: 'accent' })

// Plugins are reachable from the instance, without the template
btn.events.on('bundle:create', (bundle: unknown) => {
  if (bundle instanceof TPluginBundle) {
    bundle.get(TActionPlugin)?.events.on('press', () => {
      btn.disabled = true // the rendered button updates
    })
  }
})
</script>

<template>
  <Button :ctrl="btn" />
</template>
```

The application plugs in a theme and an icon pack:

```ts
import { createApp } from 'vue'
import { setIcons } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import App from './App.vue'

import '@soldy-ui/theme-oren'

setIcons(material)

createApp(App).mount('#app')
```

The dark scheme is switched on with `<html data-theme="oren-dark">`.

## Components

The component set, as the playground shows it:

| Component   | What it is                                                             |
| ----------- | ---------------------------------------------------------------------- |
| Button      | Button: text, icons in slots, four views                               |
| Input       | Text field with slots for icons and buttons                            |
| CheckBox    | Checkbox with a third, indeterminate state                             |
| Switch      | Switch: the same value as a checkbox, a different metaphor             |
| Select      | Select field: an input plus a list in an overlay, the Combobox pattern |
| ListBox     | List with single or multiple selection                                 |
| Tabs        | Tabs: a tab list and panels linked by value                            |
| Tags        | Tag set: close buttons, optional selection                             |
| Accordion   | Sections that expand one at a time or several at once                  |
| Icon        | Icon from the registered pack, by role                                 |
| Spinner     | Loading indicator                                                      |
| Skeleton    | Placeholder while content loads                                        |
| DragAndDrop | Drag and drop of collection items                                      |

What each adapter implements so far:

| Adapter        | Package             | Ready                     |
| -------------- | ------------------- | ------------------------- |
| Vue            | `@soldy-ui/vue`     | all of the above          |
| React          | `@soldy-ui/react`   | Button                    |
| Angular        | `@soldy-ui/angular` | Button (`<soldy-button>`) |
| Svelte         | `@soldy-ui/svelte`  | Button                    |
| Solid          | `@soldy-ui/solid`   | Button                    |
| Web Components | `@soldy-ui/webc`    | Button (`<soldy-button>`) |

## Repository structure

```
packages/
  core/             headless component models: components, collection engine, facades, extensions
  accessor/         runtime reflection: instance props and events, named for each framework
  setup/            code shared by adapters, in two layers:
    protected/      mechanics: define, naming, registry, adapter context and exchange
    content/        what fills the library up: descriptors, adapter extensions, icon roles
  plugins/          runtime behavior installed into TPluginBundle: DOM, focus, keyboard, overlay
  ui/
    vue/            Vue adapter
    react/          React adapter
    angular/        Angular adapter
    svelte/         Svelte adapter
    solid/          Solid adapter
    webc/           Web Components adapter: Custom Elements
  themes/oren/      oren theme: CSS for the BEM classes and data-*, light and dark schemes
  icons/material/   Material icons implementing the ICON_ROLES contract
  playground/
    shared/         framework-free playground data: component registry, prop descriptions, enums
    vue/            Vue playground app
tools/
  eslint/           local ESLint rule (soldy/no-explicit-any) and tests for the lint blocks
  agent-flow/       ClickUp ↔ Claude Code task pipeline
docs/               architecture overview
```

## Development

Node `^22.12.0 || ^24 || >=26`, npm workspaces.

```bash
npm install
npm run dev:vue     # playground, with the theme rebuilt on change
npm run test:core   # core tests (Vitest)
npm run test:vue    # Vue adapter tests
npm run lint        # ESLint
```

The playground's overview page shows every component. A component page renders each prop twice —
from props and from a core instance passed as `ctrl` — with the code for both. The rest of the
commands are listed in [AGENTS.md → Commands](AGENTS.md#commands).

## Roadmap

The goal is one component set with the same behavior, accessibility and look in all six targets.
On the way there:

- every component ported to React, Angular, Svelte, Solid and Web Components;
- a playground for each of those adapters;
- Menu and Popover on the same overlay layer as Select;
- the packages published to npm;
- more themes and icon packs on the same contracts.

## Documentation

- [docs/architecture.md](docs/architecture.md) — architecture overview: layers, descriptors,
  plugins, collections, adapters (English and Russian).
- [AGENTS.md](AGENTS.md) — project rules and conventions, mostly in Russian.
- [packages/themes/oren/AGENTS.md](packages/themes/oren/AGENTS.md) — the oren theme: scales, color
  schemes, tokens (in Russian).

## License

[MIT](LICENSE)
