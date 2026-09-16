---
name: add-soldy-component
description: 'Add a new headless UI component to the soldy monorepo. Use when creating a component (Button, Badge, Input, etc.), porting a component from packages/_plugins, or wiring a core model through setup (contribution + descriptor) and the Vue or React adapter with barrel exports and tests. Also covers complex components (Select) and when a part needs its own internal instance rather than markup.'
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
  - `static defaultValues` is typed `typeof TBase.defaultValues & TDefaultValues<I<Name>Props, 'ownKeyA' | 'ownKeyB'>` (own keys only; keys declared as `undefined` go to the third argument), never `Partial<I<Name>Props>`. The constructor then reads `props.x ?? ctor.defaultValues.x` without `!` — `x!` fails `lint:ci`. See AGENTS.md, «Умолчание пропа — в декларации».
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
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { <Name>Descriptor } from '@soldy/setup'
import type { I<Name> } from '@soldy/core'

export const emits<Name>: TEmits = useEmits(<Name>Descriptor())
export const props<Name>: TProps = useProps(<Name>Descriptor()) as TProps

export type <Name>Props = UseProps<typeof <Name>Descriptor, I<Name>>

export default {
  name: 'Base<Name>',
  emits: emits<Name>,
  props: props<Name>,
}
```

- `setup.component.ts`: type the `setup` props with `<Name>Props`, create the context with `createVueAdapterContext` and return `useAdapter`. The wrapper (`packages/ui/vue/src/adapter/common/`) strips the Vue proxy from `ctrl`, so the component imports nothing from `'vue'` and never imports `createAdapterContext` from `@soldy/setup` — the eslint block `soldy/vue-components-no-framework` fails on both:

```ts
import { <Name>Descriptor } from '@soldy/setup'
import { useAdapter, createVueAdapterContext, type SetupContext } from '../../adapter'
import Base<Name>, { type <Name>Props } from './base.component'
import { type I<Name>Props, type I<Name> } from '@soldy/core'

export default {
  name: '_<Name>',
  extends: Base<Name>,
  setup(props: <Name>Props, { emit }: SetupContext) {
    const adapter = createVueAdapterContext(<Name>Descriptor(), {
      ctrl: props.ctrl,
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

- `setup.component.ts`: one hook that creates the adapter context once per component lifetime. The context is held between renders by `useAdapterContext` (`packages/ui/react/src/adapter/runtime/`), which takes a factory, not by the component's own `useRef`: the eslint block `soldy/react-components-no-framework` fails on any value imported from `'react'` in a component (`import type` passes):

```ts
import { createAdapterContext, <Name>Descriptor } from '@soldy/setup'
import type { I<Name> } from '@soldy/core'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { <Name>Props } from './base.component'

export function useSetup<Name>(props: <Name>Props) {
  const adapter = useAdapterContext<I<Name>>(() =>
    createAdapterContext(<Name>Descriptor(), { ctrl: props.ctrl, props }),
  )

  return useAdapter(adapter, props)
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

### 6. Angular adapter — `packages/ui/angular/src/components/<name>/`

Четыре файла. Отличие от Vue/React: имена inputs/outputs **генерируются заранее**,
т.к. Angular AOT требует литеральные массивы в декораторе.

- `manifest.ts` — вход кодогенератора:

```ts
import { <Name>Descriptor } from '@soldy/setup'

export const name = '<name>'
export const descriptor = <Name>Descriptor
```

- Запусти `npm run generate --workspace=@soldy/ui-angular` → появится
  `src/generated/<name>.metadata.ts` с `<Name>Inputs` / `<Name>Outputs`.
  **Файл коммитится**, CI проверяет, что он не разъехался с дескриптором.

- `base.component.ts` — только переэкспорт сгенерированных имён:

```ts
export {
  <Name>Inputs as <Name>InputNames,
  <Name>Outputs as <Name>OutputNames,
} from '../../generated/<name>.metadata'
```

- `setup.component.ts`:

```ts
import { createAdapterContext, <Name>Descriptor } from '@soldy/setup'
import type { I<Name>, I<Name>Props } from '@soldy/core'
import { useAdapter } from '../../adapter'
import type { TAngularBinding } from '../../adapter'

export function setup<Name>(
  ctrl: I<Name> | undefined,
  props: Partial<I<Name>Props>,
): TAngularBinding<I<Name>> {
  const adapter = createAdapterContext(<Name>Descriptor(), { ctrl, props })

  return useAdapter<I<Name>>(adapter)
}
```

- `<name>.component.ts` — оболочка. Наследует `TAngularComponentBase`, состояние
  читается как `state()` (сигнал):

```ts
@Component({
  selector: 'soldy-<name>',
  standalone: true,
  inputs: [...<Name>InputNames],
  outputs: [...<Name>OutputNames],
  imports: [NgClass, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './<name>.component.html',
})
export class T<Name>Component extends TAngularComponentBase<I<Name>> {
  private readonly _el = viewChild('rootEl', { read: ElementRef })

  constructor() {
    super(<Name>InputNames, <Name>OutputNames)
    this.bindElementFrom(this._el)   // не @ViewChild: узел пересоздаётся
  }

  protected createBinding(ctrl, inputs) {
    return setup<Name>(ctrl, inputs)
  }
}
```

Правила разметки:

- корень помечается `#rootEl` и живёт внутри `@if (state()['rendered'])`;
- `<ng-content>` объявляется **ровно один раз** внутри `<ng-template #content>`
  и подставляется через `[ngTemplateOutlet]="content"` — два слота во
  взаимоисключающих ветках теряют содержимое при переключении;
- если корень — хост-элемент и всегда существует (как у `component-view`),
  используй `bindElement()` в `ngAfterViewInit` вместо `bindElementFrom`.

### 7. Register barrel exports

- `packages/core/src/components/custom/index.ts`
- `packages/setup/contributions/components/index.ts`
- `packages/setup/descriptors/components/index.ts`
- `packages/ui/vue/src/components/index.ts`
- `packages/ui/react/src/components/index.ts` (if a React adapter was added)
- `packages/ui/angular/src/components/index.ts` (if an Angular adapter was added)

### 8. Validate

```bash
npm run test:core
npm run test:setup
# type checks
npm run build:types --workspace=@soldy/ui-vue
npx tsc -p packages/ui/react/tsconfig.json --noEmit
# Angular: метаданные не должны разъехаться с дескриптором
npm run generate --workspace=@soldy/ui-angular
git diff --exit-code packages/ui/angular/src/generated
npm run build --workspace=@soldy/ui-angular
```

Confirm no framework imports leaked into the framework-agnostic packages.

## Reference Example

Button is the canonical minimal component. Copy its shape:

- `packages/core/src/components/custom/button/{types.ts,button.class.ts,index.ts}`
- `packages/setup/contributions/components/button.ts`
- `packages/setup/descriptors/components/button.descriptor.ts`
- Vue: `packages/ui/vue/src/components/button/{base.component.ts,setup.component.ts,Button.vue,index.ts}`
- React: `packages/ui/react/src/components/button/{base.component.ts,setup.component.ts,Button.tsx,index.ts}`
- Angular: `packages/ui/angular/src/components/button/{manifest.ts,base.component.ts,setup.component.ts,button.component.ts,button.component.html,index.ts}`

## Общий слой — не дублируй

`packages/setup/common/` содержит поведение, одинаковое для всех адаптеров:
`defaultPropNaming`, `createInspectorFactory(naming)`, `collectEventBindings`.
Плюс `resolveDefaultExtensions` в `adapter/extensions/` (уже применяется по
умолчанию в `createAdapterContext` — вручную передавать не нужно).

Адаптер реализует **только** стратегию именования событий. Если пишешь что-то в
`packages/ui/*/adapter/common/`, сначала проверь, не место ли этому в общем слое.
Починил баг в одном адаптере — проверь остальные адаптеры.

## Collection components (Vue only for now)

Collection-based components (Tabs, Accordion, List, ListBox, Select, Tags) are currently
wired **only for Vue** — the other five adapters (React, Angular, …) have no collection
adapter yet. For Vue, follow the Tabs shape: `packages/setup/descriptors/components/tabs/`,
the collection facades (`TTabsCollectionFacade` / `TTabsItemCollectionFacade`), and the
two-context setup (`TabsDescriptor` + `TabsCollectionDescriptor` sharing one bundle).
Details: [Collection components reference](./references/collection-component.md).

## Complex components: internal instances vs. markup

Some parts of a complex component (e.g. Select's `field`, `tags`) need their own
core instance rather than plain markup — state written by the core, a collection
extension, or a plugin needs somewhere to live. Others (a nested close button, an
arrow icon) never need one — they only display what the owner already computed.
Worked example and the criterion for telling them apart: [Complex component reference](./references/complex-component.md).
