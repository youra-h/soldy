---
name: add-soldy-component
description: 'Add a new headless UI component to the soldy monorepo. Use when creating a component (Button, Badge, Input, etc.) or wiring a core model through setup (contribution + descriptor) and the Vue, React or Angular adapter with barrel exports and tests. Also covers complex components (Select) and when a part needs its own internal instance rather than markup.'
argument-hint: 'component name (e.g. Badge)'
---

# Add a Soldy Component

Adds a new headless UI component across the soldy layers: core model → contribution → descriptor → framework adapter (Vue, React and/or Angular), with all barrel exports registered.

## When to Use

- Creating a new component from scratch.
- A component exists in `core` but is missing the `setup` / `@soldy-ui/vue` (or `@soldy-ui/react`, `@soldy-ui/angular`) wiring.

## Ground Rules

- `core`, `setup`, `plugins` must **not** import `vue`, `react`, `solid`, `svelte`, `@angular/*`, `Ref`, `PropType`. Framework imports live only in `packages/ui/*`.
- Naming: `T` prefix for shared/generic type aliases, `I` prefix for interfaces. Concrete component types (`<Name>Props`, `<Name>EventProps`) have **no** `T` prefix.
- Descriptors are **factories wrapped in `defineDescriptor`** (call them, don't pass the reference); the contract is declared inline in `contribution`.
- The descriptor is the **single source of truth** for props/events/slots types, and none of them is written by hand: `defineComponent({...})` takes no type arguments. Props and events are inferred from the core class (`ctor`), so `DescriptorProps<typeof <Name>Descriptor>` resolves to `I<Name>Props` — the `TProps` of `T<Name>`; slots are inferred from the `slots` declaration.

## Procedure

Do the layers in order. Replace `<Name>`/`<name>` with the component name.

### 1. Core model — `packages/core/src/components/custom/<name>/`

- `types.ts`:
  - `I<Name>Props` extends a base props interface (`ITextableProps`, `IComponentProps`, …).
  - `T<Name>Events` intersects a base events type plus per-prop change events, e.g. `'change:view': (v: T<Name>View | undefined) => void`.
  - `I<Name>` interface extends the base component interface: `interface I<Name> extends ITextable<I<Name>Props, T<Name>Events>`.
  - An appearance prop — its value describes only the look and the set of values is a design decision (`view`, `shape`) — is **not** a union: its values are declared by the theme. Declare an empty registry `interface I<Name>Views extends TThemeRegistry {}` with `type T<Name>View = Extract<keyof I<Name>Views, string>`, default `undefined` (third argument of `TDefaultValues`), class via `this._classes.swap({ prefix: '--view-', oldValue, newValue })`, and no theme value in any adapter markup. A row drawn by `Button` reuses `TButtonView` instead of its own registry. See AGENTS.md, «Оформление: значения объявляет тема».
- `<name>.class.ts`:
  - `export default class T<Name> extends TBase<...> implements I<Name>`
  - `static override baseClass = 's-<name>'`, `static defaultValues`, getters/setters that update `_classes` and `events.emit('change:…', value)`, and `getProps()`.
  - `static defaultValues` is typed `typeof TBase.defaultValues & TDefaultValues<I<Name>Props, 'ownKeyA' | 'ownKeyB'>` (own keys only; keys declared as `undefined` go to the third argument), never `Partial<I<Name>Props>`. The constructor then reads `props.x ?? ctor.defaultValues.x` without `!` — `x!` fails `lint:ci`. See AGENTS.md, «Умолчание пропа — в декларации».
- `index.ts`: `export * from './types'` + `export { default as T<Name> } from './<name>.class'`.

### 2. Descriptor — `packages/setup/content/descriptors/components/<name>.descriptor.ts`

One file per component: inheritance, the public contract (props, events, slots) and plugins. The contract is declared inline in `contribution` — there are no separate contribution files. Wrap the factory in `defineDescriptor` (the descriptor is built once). The types come from `ctor`: framework adapters infer `I<Name>Props` / `T<Name>Events` from the descriptor, and no type arguments are passed:

```ts
import { defineComponent, defineDescriptor } from '../../../protected/define'
import { T<Name> } from '@soldy-ui/core'
import { <Base>Descriptor } from './<base>.descriptor'

export const <Name>Descriptor = defineDescriptor(() =>
  defineComponent({
    ctor: T<Name>,
    extends: <Base>Descriptor(),
    contribution: {
      props: {
        view: { type: String, triggers: ['change:view'] },
      },
    },
  }),
)
```

The `props` key is the prop name, and `type` is only the runtime constructor (`String`, `Boolean`, `[String, Object]`): the value type comes from `I<Name>Props`, so a prop never takes `defineType` — Vue would check the wrapper as `Object`.

Slots are declared in the same `contribution` under `slots`; a scope value is `defineType<T>(ctor)` (`scope: { text: defineType<string>(String) }`), a bare `String` does not compile. `defineType` is exported from `@soldy-ui/setup` and lives in `packages/setup/protected/define/prop-type.ts`; descriptors import it from `'../../../protected/define'`. The slot type is inferred from this declaration — `DescriptorSlots<typeof <Name>Descriptor>`, own slots over the slots of `extends`; there is no mirror type to write or export. See AGENTS.md, «Слоты — третья категория контракта».

> A generic core class gets its type parameters' constraints, not their defaults: `ValueControlDescriptor` has `IValueControlProps<unknown>`, `InputControlDescriptor` — `IInputControlProps<unknown>`. A concrete component fixes the value type in its own class (`TInput extends TInputControl<string, …>`), and its descriptor gets exactly that.

### 3. Vue adapter — `packages/ui/vue/src/components/<name>/`

- `base.component.ts`: runtime `props`/`emits` from `useProps(<Name>Descriptor())` / `useEmits(<Name>Descriptor())`, **plus** the precise props type derived from the descriptor:

```ts
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { <Name>Descriptor } from '@soldy-ui/setup'
import type { I<Name> } from '@soldy-ui/core'

export const emits<Name>: TEmits = useEmits(<Name>Descriptor())
export const props<Name>: TProps = useProps(<Name>Descriptor()) as TProps

export type <Name>Props = UseProps<typeof <Name>Descriptor, I<Name>>

export default {
  name: 'Base<Name>',
  emits: emits<Name>,
  props: props<Name>,
}
```

- `setup.component.ts`: type the `setup` props with `<Name>Props`, create the context with `createVueAdapterContext` and return `useAdapter`. The wrapper (`packages/ui/vue/src/adapter/common/`) strips the Vue proxy from `ctrl`, so the component imports nothing from `'vue'` and never imports `createAdapterContext` from `@soldy-ui/setup` — the eslint block `soldy/vue-components-no-framework` fails on both:

```ts
import { <Name>Descriptor } from '@soldy-ui/setup'
import { useAdapter, createVueAdapterContext, type SetupContext } from '../../adapter'
import Base<Name>, { type <Name>Props } from './base.component'
import { type I<Name>Props, type I<Name> } from '@soldy-ui/core'

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

- `<Name>.vue`: `<script lang="ts">` re-exports `Setup<Name>`; template binds `ref="rootElement"`, `:is="tag"`, `v-if="rendered"`, `v-show="visible"`, `:class="classes"` and the three core attribute sets `v-bind="{ ...attrs, ...aria, ...dataset }"`.
- `index.ts`: export `Base<Name>`, `props<Name>`, `emits<Name>`, and the `.vue` default.

`UseProps` lives in `packages/ui/vue/src/types/common.ts` and is defined as `DescriptorComponentProps<TDescriptorFn, TInstance>` from `@soldy-ui/setup` — own props, plugin props (`aria_label`, …) and the adapter's service props (`ctrl`, `embedded`, `pluginProps` — values for plugins installed from outside).

### 4. React adapter — `packages/ui/react/src/components/<name>/`

React has **no runtime props declaration** — only types. Four files per component:

- `base.component.ts`: derive the precise props type from the descriptor. Use `UseDomProps` when the component renders a DOM root (it merges `HTMLAttributes<HTMLElement>`); use `UseProps` for headless layers:

```ts
import type { I<Name> } from '@soldy-ui/core'
import type { <Name>Descriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События слоя <Name> (core + плагины), выведены из дескриптора автоматически. */
export type <Name>EventProps = EventProps<typeof <Name>Descriptor>

export type <Name>Props = UseDomProps<typeof <Name>Descriptor, I<Name>, <Name>EventProps>
```

- `setup.component.ts`: one hook that creates the adapter context once per component lifetime. The context is held between renders by `useAdapterContext` (`packages/ui/react/src/adapter/runtime/`), which takes a factory, not by the component's own `useRef`: the eslint block `soldy/react-components-no-framework` fails on any value imported from `'react'` in a component (`import type` passes):

```ts
import { createAdapterContext, <Name>Descriptor } from '@soldy-ui/setup'
import type { I<Name> } from '@soldy-ui/core'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { <Name>Props } from './base.component'

export function useSetup<Name>(props: <Name>Props) {
  const adapter = useAdapterContext<I<Name>>(() =>
    createAdapterContext(<Name>Descriptor(), { ctrl: props.ctrl, props }),
  )

  return useAdapter(adapter, props)
}
```

- `<Name>.tsx`: the view component. Consumes `{ ref, forwardProps, state }` from `useSetup<Name>()`, reads `rendered/visible/tag/classes` and the sets `attrs`/`aria`/`dataset` from `state`, returns `null` when `!rendered`, spreads `forwardProps` onto the root element **before** `ref` (in React 19 `ref` is a plain prop, and a consumer's `ref` inside `forwardProps` would override the adapter's) and the sets after it through `toAriaProps`. Slots are rendered with `renderSlot`.

- `index.ts`:

```ts
export * from './base.component'
export { useSetup<Name> } from './setup.component'
export { <Name> } from './<Name>'
```

React type helpers live in `packages/ui/react/src/types.ts`: `EventProps`, `SlotProps`, `UseProps`, `UseDomProps` — built on `DescriptorComponentProps` and `DescriptorCallbackEvents` from `@soldy-ui/setup`.

### 5. Angular adapter — `packages/ui/angular/src/components/<name>/`

Файлы — как у Button: `manifest.ts`, `base.component.ts`, `setup.component.ts`,
`<name>.component.ts` с разметкой в `<name>.component.html` и `index.ts`. Отличие
от Vue/React: имена inputs/outputs **генерируются заранее**, т.к. Angular AOT
требует литеральные массивы в декораторе.

- `manifest.ts` — вход кодогенератора:

```ts
import { <Name>Descriptor } from '@soldy-ui/setup'

export const name = '<name>'
export const descriptor = <Name>Descriptor
```

- Запусти `npm run generate --workspace=@soldy-ui/angular` → появится
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
import { createAdapterContext, <Name>Descriptor } from '@soldy-ui/setup'
import type { I<Name> } from '@soldy-ui/core'
import { useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setup<Name>(ctrl: I<Name> | undefined, props: object): TBinding<I<Name>> {
  const adapter = createAdapterContext(<Name>Descriptor(), { ctrl, props })

  return useAdapter(adapter)
}
```

- `<name>.component.ts` — оболочка. Наследует `TComponentBase`
  (`packages/ui/angular/src/adapter/runtime/component.base.ts`), состояние
  читается как `state()` (сигнал). Корень с `TElementPlugin` связывает база:
  компонент зовёт только `super(<Name>InputNames, <Name>OutputNames)` и
  реализует `createBinding`:

```ts
import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgClass, NgTemplateOutlet } from '@angular/common'
import type { I<Name> } from '@soldy-ui/core'
import type { TBinding } from '../../adapter'
import { AriaDirective, TComponentBase } from '../../adapter'
import { <Name>InputNames, <Name>OutputNames } from './base.component'
import { setup<Name> } from './setup.component'

@Component({
  selector: 'soldy-<name>',
  standalone: true,
  inputs: [...<Name>InputNames],
  outputs: [...<Name>OutputNames],
  imports: [NgClass, NgTemplateOutlet, AriaDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './<name>.component.html',
})
export class T<Name>Component extends TComponentBase<I<Name>> {
  constructor() {
    super(<Name>InputNames, <Name>OutputNames)
  }

  protected createBinding(ctrl: I<Name> | undefined, inputs: object): TBinding<I<Name>> {
    return setup<Name>(ctrl, inputs)
  }
}
```

Хуков жизненного цикла, `signal`, `computed` и `effect` в компоненте нет: они
живут в адаптерном слое (AGENTS.md, «Механизмы фреймворка — только в адаптерном
слое»), в `components/**` их ловит
`packages/setup/__tests__/framework-mechanisms-components.spec.ts`.

Правила разметки:

- корень помечается `#root` и живёт внутри `@if (state()['rendered'])`: при
  пересоздании узла связь переустанавливает `TComponentBase` (сигнальный запрос
  `viewChild('root')` — поле базы, `effect` только читает его). Сигнальные
  инициализаторы `@angular/core` (`viewChild`, `contentChildren`, `input`…)
  пишутся только в инициализаторе поля: вызов в методе роняет AOT с NG8110 —
  его ловит `ngc` из «Validate» (в CI — «Типы — Angular»);
- наборы ядра раскладываются на корень директивой `AriaDirective`:
  `[ariaAttrs]="state()['aria']"`, `[attrs]="state()['attrs']"`,
  `[dataset]="state()['dataset']"`;
- `<ng-content>` объявляется **ровно один раз** внутри `<ng-template #content>`
  и подставляется через `[ngTemplateOutlet]="content"` — два слота во
  взаимоисключающих ветках теряют содержимое при переключении;
- если корень — хост-элемент и всегда существует (как у `component-view`),
  третьим аргументом передаётся стратегия `'host'`:
  `super(<Name>InputNames, <Name>OutputNames, 'host')`. База берёт узел из
  `inject(ElementRef)` один раз и сама раскладывает на него `aria`, `attrs` и
  `dataset`; классы и видимость хоста — `@HostBinding`
  (`component-view.component.ts`).

### 6. Register barrel exports

- `packages/core/src/components/custom/index.ts`
- `packages/setup/content/descriptors/components/index.ts`
- `packages/ui/vue/src/components/index.ts`
- `packages/ui/react/src/components/index.ts` (if a React adapter was added)
- `packages/ui/angular/src/components/index.ts` (if an Angular adapter was added)

### 7. Validate

```bash
npm run test:core
npm run test:setup
npm run test:vue
npm run test:react   # if a React adapter was added
# lint and formatting — the CI job `lint`; eslint blocks soldy/*-components-no-framework live here
npm run lint
npx prettier --check .
# type checks — the same commands as the CI steps «Типы — …»
npx tsc --noEmit -p packages/core/tsconfig.json
npx tsc --noEmit -p packages/setup/tsconfig.json
npm run build:types --workspace=@soldy-ui/vue
npx vue-tsc --noEmit -p packages/ui/vue/tsconfig.json
npx tsc --noEmit -p packages/ui/react/tsconfig.json
# Angular: ngc без эмита — TS, шаблоны @Component (strictTemplates) и ограничения AOT
npx ngc -p packages/ui/angular/tsconfig.json
# Angular: метаданные не должны разъехаться с дескриптором
npm run generate --workspace=@soldy-ui/angular
git diff --exit-code packages/ui/angular/src/generated
```

Confirm no framework imports leaked into the framework-agnostic packages.

## Reference Example

Button is the canonical minimal component. Copy its shape:

- `packages/core/src/components/custom/button/{types.ts,button.class.ts,index.ts}`
- `packages/setup/content/descriptors/components/button.descriptor.ts`
- Vue: `packages/ui/vue/src/components/button/{base.component.ts,setup.component.ts,Button.vue,index.ts}`
- React: `packages/ui/react/src/components/button/{base.component.ts,setup.component.ts,Button.tsx,index.ts}`
- Angular: `packages/ui/angular/src/components/button/{manifest.ts,base.component.ts,setup.component.ts,button.component.ts,button.component.html,index.ts}`

## Общий слой — не дублируй

`packages/setup/protected/naming/` и `packages/setup/protected/adapter/` содержат поведение,
одинаковое для всех адаптеров:

- `underscorePropNaming` (имя пропа `ns_name`) и `callbackEventNaming` (события
  колбэк-пропами, `element:ready` → `onElementReady`);
- профиль фреймворка `IAdapterProfile` — стратегия имён и слот по умолчанию, одна
  константа на адаптер (`VueProfile`, `ReactProfile`, …);
- поверхность `surfaceOf(descriptor, profile)` — публичный API компонента в
  именах фреймворка: из неё берут статический слой и связка;
- связка `bindComponent(adapter, profile)` — всё, что адаптеры делают с
  аксессором на монтировании: состояние для фреймворка (`subscribe` — оно же
  инициализация), проброс событий и моделей,
  запись пропсов, спред несъеденных;
- `adapter.bindElement(el)` — связка корневого узла с `TElementPlugin`, метод
  контекста.

Правила связки — AGENTS.md, «Что общее, а что специфично для фреймворка», что
где лежит в setup — «Структура `packages/setup`».

Адаптер задаёт **только** профиль, куда писать значение, как отдать событие и в
какой момент своего цикла это делать; своих циклов по аксессору у него нет.
Своя стратегия имён событий тоже не у каждого: React, Svelte и Solid берут общую
`callbackEventNaming`, своя стратегия у Vue и Web Components (`element:ready`) и
у Angular (`elementReady`). Если пишешь что-то в
`packages/ui/*/adapter/common/`, сначала проверь, не место ли этому в общем
слое. Починил баг в одном адаптере — проверь остальные адаптеры.

## Collection components (Vue only for now)

Collection-based components (Tabs, Accordion, ListBox, Select, Tags) are currently
wired **only for Vue** — the other five adapters (React, Angular, …) have no collection
adapter yet. For Vue, follow the Tabs shape: `packages/setup/content/descriptors/components/tabs/`,
the collection facades (`TTabsCollectionFacade` / `TTabsItemCollectionFacade`), and the
two-context setup (`TabsDescriptor` + `TabsCollectionDescriptor` sharing one bundle).
Details: [Collection components reference](./references/collection-component.md).

## Complex components: internal instances vs. markup

Some parts of a complex component (e.g. Select's `field`, `tags`) need their own
core instance rather than plain markup — state written by the core, a collection
extension, or a plugin needs somewhere to live. Others (a nested close button, an
arrow icon) never need one — they only display what the owner already computed.
Worked example and the criterion for telling them apart: [Complex component reference](./references/complex-component.md).
