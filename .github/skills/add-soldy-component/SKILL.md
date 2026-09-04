---
name: add-soldy-component
description: 'Add a new headless UI component to the soldy monorepo. Use when creating a component (Button, Badge, Input, etc.), porting a component from packages/_plugins, or wiring a core model through setup (contribution + descriptor) and the Vue or React adapter with barrel exports and tests.'
argument-hint: 'component name (e.g. Badge)'
---

# Add a Soldy Component

Adds a new headless UI component across the soldy layers: core model → contribution → descriptor → framework adapter (Vue and/or React), with all barrel exports registered.

## When to Use

- Creating a new component from scratch.
- Porting a legacy component from `packages/_plugins`.
- A component exists in `core` but is missing the `setup` / `@soldy/ui-vue` (or `@soldy/ui-react`) wiring.

## Ground Rules

- `core`, `accessor`, `setup`, `plugins` must **not** import `vue`, `react`, `Ref`, `PropType`. Framework imports live only in `packages/ui/*`.
- Naming: `T` prefix for shared/generic type aliases, `I` prefix for interfaces. Concrete component types (`<Name>Props`, `<Name>EventProps`) have **no** `T` prefix.
- Contributions and descriptors are **arrow-function factories** (call them, don't pass the reference).
- The descriptor is the **single source of truth** for props/events types — it must be typed with the curried `defineComponent<TProps, TEvents>()({...})` form so `DescriptorProps<typeof <Name>Descriptor>` resolves to `I<Name>Props`.

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

Always use the **typed curried form** so framework adapters can infer `I<Name>Props` / `T<Name>Events` from the descriptor:

```ts
import { defineComponent } from '../base'
import { T<Name> } from '@soldy/core'
import type { I<Name>Props, T<Name>Events } from '@soldy/core'
import { <Name>Contribution } from '../../contributions'

export const <Name>Descriptor = () =>
  defineComponent<I<Name>Props, T<Name>Events>()({
    ctor: T<Name>,
    extends: <Base>Descriptor(),
    contribution: <Name>Contribution(),
  })
```

> Generic base layers (`IValueControlProps<T>`, `IInputControlProps<T>`) need an explicit instantiation at the descriptor: `defineComponent<IValueControlProps<any>, TValueControlEvents<any>>()({...})` and `defineComponent<IInputControlProps, TInputControlEvents>()({...})` (default `string`).

### 4. Vue adapter — `packages/ui/vue/src/components/<name>/`

- `base.component.ts`: runtime `props`/`emits` from `useProps(<Name>Descriptor())` / `useEmits(<Name>Descriptor())`, **plus** the precise props type derived from the descriptor:

```ts
import { Base<X> } from '../<x>'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { <Name>Descriptor } from '@soldy/setup'
import type { I<Name> } from '@soldy/core'

export const emits<Name>: TEmits = useEmits(<Name>Descriptor()) as unknown as TEmits
export const props<Name>: TProps = useProps(<Name>Descriptor()) as TProps

export type <Name>Props = UseProps<typeof <Name>Descriptor, I<Name>>

export default {
  name: 'Base<Name>',
  emits: emits<Name>,
  props: props<Name>,
}
```

- `setup.component.ts`: type the `setup` props with `<Name>Props` and return `useAdapter`:

```ts
import { toRaw } from 'vue'
import { createAdapterContext, <Name>Descriptor } from '@soldy/setup'
import { useAdapter } from '../../adapter'
import Base<Name>, { type <Name>Props } from './base.component'
import { type I<Name>Props, type I<Name> } from '@soldy/core'

export default {
  name: '_<Name>',
  extends: Base<Name>,
  setup(props: <Name>Props, { emit }: any) {
    const adapter = createAdapterContext(<Name>Descriptor(), {
      ctrl: toRaw(props.ctrl),
      props,
    })
    return useAdapter<I<Name>Props, I<Name>>(adapter, props, emit)
  },
}
```

- `<Name>.vue`: `<script lang="ts">` re-exports `Setup<Name>`; template binds `ref="rootElement"`, `:is="tag"`, `v-if="rendered"`, `v-show="visible"`, `:class="classes"`.
- `index.ts`: export `Base<Name>`, `props<Name>`, `emits<Name>`, and the `.vue` default.

`UseProps` lives in `packages/ui/vue/src/types/common.ts` and is defined as `TBaseComponentProps<DescriptorProps<TDescriptorFn>, TInstance>`.

### 5. React adapter — `packages/ui/react/src/components/<name>/`

React has **no runtime props declaration** — only types. Three files per component:

- `base.component.ts`: derive the precise props type from the descriptor. Use `UseDomProps` when the component renders a DOM root (it merges `HTMLAttributes<HTMLElement>`); use `UseProps` for headless layers:

```ts
import type { I<Name> } from '@soldy/core'
import type { <Name>Descriptor } from '@soldy/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События слоя <Name> (core + плагины), выведены из дескриптора автоматически. */
export type <Name>EventProps = EventProps<typeof <Name>Descriptor>

export type <Name>Props = UseDomProps<typeof <Name>Descriptor, I<Name>, <Name>EventProps>
```

- `setup.component.ts`: one hook that creates the adapter once per component lifetime:

```ts
import { useRef } from 'react'
import { createAdapterContext, <Name>Descriptor } from '@soldy/setup'
import type { IAdapterContext } from '@soldy/setup'
import { useAdapter, resolveDefaultExtensions } from '../../adapter'
import type { I<Name>Props, I<Name> } from '@soldy/core'
import type { <Name>Props } from './base.component'

export function useSetup<Name>(props: <Name>Props) {
  const adapterRef = useRef<IAdapterContext | null>(null)
  if (!adapterRef.current) {
    const descriptor = <Name>Descriptor()
    adapterRef.current = createAdapterContext(
      descriptor,
      { ctrl: props.ctrl, props },
      { defaultExtensions: resolveDefaultExtensions(descriptor) },
    )
  }
  return useAdapter<I<Name>Props, I<Name>>(adapterRef.current, props)
}
```

- `<Name>.tsx`: the view component. Consumes `{ ref, forwardProps, state }` from `useSetup<Name>()`, reads `rendered/visible/tag/classes` from `state`, returns `null` when `!rendered`, and spreads `forwardProps` onto the root element.

- `index.ts`:

```ts
export * from './base.component'
export { useSetup<Name> } from './setup.component'
export { <Name> } from './<Name>'
```

React type helpers live in `packages/ui/react/src/types.ts`: `TReactComponentProps`, `EventProps`, `UseProps`, `UseDomProps`.

### 6. Register barrel exports

- `packages/core/src/components/custom/index.ts`
- `packages/setup/contributions/components/index.ts`
- `packages/setup/descriptors/components/index.ts`
- `packages/ui/vue/src/components/index.ts`
- `packages/ui/react/src/components/index.ts` (if a React adapter was added)

### 7. Validate

```bash
npm run test:core
npm run test:setup
npm run lint
# type checks
npx tsc -p packages/ui/react/tsconfig.json --noEmit
npm run build:types --workspace=@soldy/ui-vue
```

Confirm no framework imports leaked into the framework-agnostic packages.

## Reference Example

Button is the canonical minimal component. Copy its shape:

- `packages/core/src/components/custom/button/{types.ts,button.class.ts,index.ts}`
- `packages/setup/contributions/components/button.ts`
- `packages/setup/descriptors/components/button.descriptor.ts`
- Vue: `packages/ui/vue/src/components/button/{base.component.ts,setup.component.ts,Button.vue,index.ts}`
- React: `packages/ui/react/src/components/button/{base.component.ts,setup.component.ts,Button.tsx,index.ts}`

## Collection components (Vue only for now)

Collection-based components (tabs, collapse, list, list-box) are currently wired **only for Vue** — React has no collection adapter yet. For Vue, follow the Tabs shape: `packages/setup/descriptors/components/tabs/`, the collection facades (`TTabsCollectionFacade` / `TTabItemCollectionFacade`), and the two-context setup (`TabsDescriptor` + `TabsCollectionDescriptor` sharing one bundle). Details: [Collection components reference](./references/collection-component.md).
