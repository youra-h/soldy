---
name: add-soldy-component
description: 'Add a new headless UI component to the soldy monorepo. Use when creating a component (Button, Badge, Input, etc.), porting a component from packages/_plugins, or wiring a core model through setup (contribution + descriptor) and the Vue adapter with barrel exports and tests.'
argument-hint: 'component name (e.g. Badge)'
---

# Add a Soldy Component

Adds a new headless UI component across the soldy layers: core model → contribution → descriptor → Vue adapter, with all barrel exports registered.

## When to Use

- Creating a new component from scratch.
- Porting a legacy component from `packages/_plugins`.
- A component exists in `core` but is missing the `setup` / `@soldy/ui-vue` wiring.

## Ground Rules

- `core`, `accessor`, `setup`, `plugins` must **not** import `vue`, `react`, `Ref`, `PropType`. Framework imports live only in `packages/ui/*`.
- Naming: `T` prefix for type aliases, `I` prefix for interfaces.
- Contributions and descriptors are **arrow-function factories** (call them, don't pass the reference).

## Procedure

Do the layers in order. Replace `<Name>`/`<name>` with the component name.

### 1. Core model — `packages/core/src/components/custom/<name>/`

- `types.ts`:
  - `I<Name>Props` extends a base props interface (`ITextableProps`, `IComponentProps`, …).
  - `T<Name>Events` intersects a base events type plus per-prop change events, e.g. `'change:view': (v: T<Name>View) => void`.
  - `I<Name>` interface extends the base component interface: `interface I<Name> extends ITextable<I<Name>Props, T<Name>Events>`.
- `<name>.class.ts`:
  - `export default class T<Name> extends TBase<...> implements I<Name>`
  - `static baseClass = 's-<name>'`, `static defaultValues`, getters/setters that update `_classes` and `events.emit('change:…', value)`, and `getProps()`.
- `index.ts`: `export * from './types'` + `export { default as T<Name> } from './<name>.class'`.

### 2. Contribution — `packages/setup/contributions/components/<name>.ts`

```ts
import type { IContribution } from '@soldy/accessor'

export const <Name>Contribution = (): IContribution => ({
  props: {
    view: { type: String, triggers: ['change:view'] },
  },
})
```

The `props` key is the prop name. Use `defineType<T>(ctor)` from `@soldy/setup` for phantom-typed props.

### 3. Descriptor — `packages/setup/descriptors/components/<name>.descriptor.ts`

```ts
export const <Name>Descriptor = () =>
  defineComponent({
    ctor: T<Name>,
    extends: <Base>Descriptor(),
    contribution: <Name>Contribution(),
  })
```

### 4. Vue adapter — `packages/ui/vue/src/components/<name>/`

- `base.component.ts`: `extends: Base<X>`, `props`/`emits` from `useProps(<Name>Descriptor())` / `useEmits(<Name>Descriptor())`.
- `setup.component.ts`: `createAdapterContext(<Name>Descriptor(), { ctrl: toRaw(props.ctrl), props })`, return `useVue<I<Name>Props, I<Name>>(adapter, props, emit)`.
- `<Name>.vue`: `<script lang="ts">` re-exports `Setup<Name>`; template binds `ref="rootElement"`, `:is="tag"`, `v-if="rendered"`, `v-show="visible"`, `:class="classes"`.
- `index.ts`: export `Base<Name>` + `props<Name>`/`emits<Name>` and the `.vue` default.

### 5. Register barrel exports

- `packages/core/src/components/custom/index.ts`
- `packages/setup/contributions/components/index.ts`
- `packages/setup/descriptors/components/index.ts`
- `packages/ui/vue/src/components/index.ts`

### 6. Validate

```bash
npm run test:core
npm run lint
```

Confirm no framework imports leaked into the framework-agnostic packages.

## Reference Example

Button is the canonical minimal component. Copy its shape:

- `packages/core/src/components/custom/button/{types.ts,button.class.ts,index.ts}`
- `packages/setup/contributions/components/button.ts`
- `packages/setup/descriptors/components/button.descriptor.ts`
- `packages/ui/vue/src/components/button/{base.component.ts,setup.component.ts,Button.vue,index.ts}`

For collection-based components (tabs, list, collapse) follow the Tabs shape instead — see `packages/setup/descriptors/components/tabs/` and the flat output interface (`ITabsCollectionOutput`) used by `useVueCollection<TOutput>`. Details: [Collection components reference](./references/collection-component.md).
