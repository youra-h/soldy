# @soldy-ui/vue

**The Vue adapter: Soldy UI components rendered on the headless models of the core.**

Part of [Soldy UI](https://github.com/youra-h/soldy) — UI components with the logic written once: a
framework-agnostic core and thin adapters that render it in Vue, React, Angular, Svelte, Solid and
Web Components.

The adapter is wiring, not behavior: it connects a core model to Vue's reactivity and renders the
markup — BEM classes `s-*` and `data-*` state attributes. Props, events and slots come from the
component descriptor, so they match the other five adapters; only the spelling is Vue's.

## Install

```bash
npm install @soldy-ui/vue @soldy-ui/theme-oren @soldy-ui/icons-material
```

Vue `^3.5` is a peer dependency. A theme and an icon pack are separate packages — pick the ones you
want.

## Usage

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

The same component can be driven from code — pass a core instance as `ctrl`, and both sides see the
same state and events:

```vue
<script setup lang="ts">
import { TButton } from '@soldy-ui/core'
import { Button } from '@soldy-ui/vue'

const btn = new TButton({ text: 'Save' })
</script>

<template>
  <Button :ctrl="btn" @action:press="btn.disabled = true" />
</template>
```

The application plugs in a theme and an icon pack once:

```ts
import { createApp } from 'vue'
import { setIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import oren from '@soldy-ui/theme-oren/setup'
import App from './App.vue'

import '@soldy-ui/theme-oren'

setIcons(material)
useTheme(oren)

createApp(App).mount('#app')
```

## Documentation

- [Soldy UI README](https://github.com/youra-h/soldy#readme) — the component set and what each
  adapter implements so far.
- [Architecture overview](https://github.com/youra-h/soldy/blob/main/docs/architecture.md) —
  layers, descriptors, plugins, collections, adapters.

## License

[MIT](https://github.com/youra-h/soldy/blob/main/LICENSE)
