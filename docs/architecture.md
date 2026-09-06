# Soldy UI Component Adapter Architecture Overview

## Project Structure
Multi-package monorepo with framework adapters for Vue, React, Angular, Svelte, Solid и Web Components.
Core business logic is **framework-agnostic** in `packages/core/src`.

---

## Layer 1: Core Components (`packages/core/src`)

### Role
Defines **headless (framework-agnostic)** component models with:
- Event emission via `TEvented`
- State management via `TStateUnit`
- Property tracking without UI binding

### Base Component Hierarchy

Граница «невизуальное / визуальное» проходит между `TComponent` и
`TComponentView`. Всё, что связано с отображением — включая `rendered`,
`visible`, `present` и `show()`/`hide()` — живёт в `TComponentView`.

```
TEntity (uid, getProps, assign, toJSON)
├── TComponent (events, states) — НЕВИЗУАЛЬНАЯ база
│   ├── TDragAndDrop                        — провайдер контекста, ничего не рендерит
│   ├── TCollectionComponent / TCollectionItemComponent — фасады коллекций
│   └── TComponentView (rendered/visible/present, show/hide, tag, classes, ready)
│       ├── TFrame (x, y, width, height, position, zIndex)
│       ├── TIcon, TSkeleton
│       └── TStylable (size, variant)
│           ├── TSpinner
│           └── TControl (disabled, focused)
│               ├── TInputControl (value tracking)
│               │   ├── TCheckBox
│               │   └── TSwitch
│               ├── TValueControl (generic value)
│               ├── TTextable (text)
│               │   └── TButton (view)
│               └── TTabs, TCollapse, TListBox
```

**Почему так.** Одно время `rendered`/`visible`/`present` были спущены в
`TComponent` — ради `TFrame`, который нуждался в `visible`, но наследовал
`TComponent`. Обоснование в `FrameDescriptor` («ComponentViewDescriptor
приносит size/variant») было ошибочным: `size`/`variant` объявлены ниже, в
`StylableContribution`. В результате невизуальные компоненты (`TDragAndDrop`,
фасады коллекций) получали свойства отображения, которые им не нужны.

Правильное решение — поднять `TFrame` до `TComponentView`: он и так рендерит
элемент, биндит его через `TElementPlugin`, а `class="s-frame"` и тег `<div>`
были захардкожены в шаблоне вместо наследуемых `classes`/`tag`. Заодно
`FrameDescriptor` перестал дублировать `ElementPluginDescriptor` и
`ReadyPluginDescriptor`.

### Key Files
- [base/component/component.class.ts](packages/core/src/components/base/component/component.class.ts) - Base IComponent interface
- [base/control/control.class.ts](packages/core/src/components/base/control/control.class.ts) - Interactive controls
- [custom/button/button.class.ts](packages/core/src/components/custom/button/button.class.ts) - Button implementation
- Custom components: Tree, Tabs, ListBox, Icon, Spinner, Collapse, List, Input, etc.

### Key Exports
- `IComponent<TProps, TEvents, TStates>` - Component contract
- `TEvented<T>` - Event emitter
- `TStateUnit<T>` - Reactive state wrapper

---

## Layer 2: Accessor Layer (`packages/accessor`)

### Role
**Runtime reflection API** for components. Provides unified access to properties and events with namespace/plugin support.

### Key Classes
- **TComponentAccessor**: Delegates to TDescriptorInspector for name formatting, handles getValue/setValue
  - `getProps(includeProtected?)` - Compiled props list
  - `getEvents()` - Compiled events list
  - `getValue(prop)` / `setValue(prop, value)` - Access instance properties
  - `getExportName(item)` - Format prop/event name for framework (e.g., 'icon:ready' → 'iconReady')

- **TDescriptorInspector**: Compiles schema + applies naming strategy
  - Used by Vue adapter to generate props/emits static definitions

### Key Files
- [accessor.interface.ts](packages/accessor/accessor.interface.ts) - IAccessor contract
- [component-accessor.class.ts](packages/accessor/component-accessor.class.ts) - Runtime reflection
- [descriptor-inspector.class.ts](packages/accessor/descriptor-inspector.class.ts) - Schema compilation
- [contract/types.ts](packages/accessor/contract/types.ts) - ICompiledProp, ICompiledEvent, INamingStrategy

### Key Exports
- `IAccessor` - Unified access interface
- `TComponentAccessor` - Component reflection
- `TDescriptorInspector` - Schema formatter
- `INamingStrategy` - Prop/event naming rules (vue: 'iconReady', React: 'icon_ready')

---

## Layer 3: Setup & Descriptors (`packages/setup/descriptors`)

### Role
**Build-time component metadata**. Single source of truth for:
- Props schema (from contributions + plugins)
- Events schema
- Plugin definitions with namespaces
- Inheritance hierarchy

### Descriptor Pattern
```
defineComponent({
  ctor: TButton,
  extends: TextableDescriptor,  // Inherit props/events/plugins
  contribution: ButtonContribution,
  plugins: [...]
})
```

Returns `IComponentDescriptor` with:
- `props: ICompiledProp[]` - Full prop list (own + parent + plugins)
- `events: ICompiledEvent[]` - Full event list
- `createBundle(instance)` - Create plugin bundle
- `createAccessor(instance, bundle)` - Create runtime accessor

### Key Files
- [base/define-component.ts](packages/setup/descriptors/base/define-component.ts) - defineComponent factory
- [base/define-plugin.ts](packages/setup/descriptors/base/define-plugin.ts) - definePlugin factory
- [base/compile-contribution.ts](packages/setup/descriptors/base/compile-contribution.ts) - Contribution merger
- [components/button.descriptor.ts](packages/setup/descriptors/components/button.descriptor.ts) - Button example
- Descriptor files for: Control, ValueControl, TextInput, CheckBox, Switch, Tabs, ListBox, Tree, Collapse, Icon, Spinner, Skeleton, Input, Frame, DragAndDrop

### Key Exports
- `IComponentDescriptor<TProps, TEvents, TPlugins>` - Metadata contract (phantom: props + события + TUPLE плагинов; `TProps extends object`, `TEvents extends object`, `TPlugins extends readonly IPluginDefinition[]`)
- `IPluginDefinition<N, TEvents>` - Plugin definition (generic: namespace + plugin events)
- `defineComponent` - **двойная сигнатура**: одноразовая `defineComponent({...})` (нетипизированные дескрипторы) и curried `defineComponent<TProps, TEvents>()({...})` (типизированные). Curried нужна из-за ограничения TS: явные type-аргументы ломают tuple-вывод из `plugins` в одном вызове.
- `definePlugin<N, TEvents>(options)` - Create plugin definition
- Extractors (types): `TDescriptorInstance<T>`, `DescriptorProps<T>`, `DescriptorEvents<T>` (свои события), `DescriptorPlugins<T>` (tuple плагинов), `DescriptorAllEvents<T>` (свои + namespaced события плагинов). + framework-agnostic helpers `NamespacedEvents`, `TPluginEventsFrom`. **Descriptor = единственный source of truth для типов props/events/plugin-events** (фреймворки не импортируют `IXxxProps`/`TXxxEvents`/`TXxxPluginEvents` из core/plugins).

### Component Descriptors (22+)
Organized by inheritance:
- **Base**: Component, Entity, ComponentView, Control, Interactive
- **ValueControl**: InputControl, CheckBox, Switch
- **TextableControl**: Button
- **Collections**: Collection, CollectionItem, Tabs, ListBox, List, Tree, Collapse
- **Standalone**: Icon, Spinner, Skeleton, DragAndDrop, Frame, Input

---

## Layer 4: Plugins (`packages/plugins/src`)

### Role
**Runtime behavior extenders**. Each plugin:
- Registers with a unique `namespace` (string literal, declared in the descriptor)
- Emits events via `TEvented`
- Gets installed into `TPluginBundle`

### Base Classes
- **TBasePlugin**: Provides events, install/destroy lifecycle
  - Namespace is declared in the plugin descriptor (`definePlugin({ namespace })`), not on the class
  - Can add props/events via contribution

### Plugin Examples
- `TElementPlugin` - Stores DOM element reference, emits 'ready'
- `TInstancePlugin` - Stores component instance
- `TCollectionPlugin` - Collection/add/remove operations
- `TDragAndDropPlugin` - DnD handler
- `TInputPlugin`, `TInputBoolPlugin` - Value tracking
- `TIconPlugin` - Icon configuration
- `TSpinnerPlugin`, `TSkeletonPlugin`, `TFramePlugin` - UI-specific behaviors
- `TCollectionBundlesPlugin` (`custom/collection/bundles.plugin.ts`) - реестр item-bundles (uid → IPluginBundle) + ссылка на collection
- `TCollectionBundlesAccess` / `TCollectionElements` (`custom/collection/`) - доступ к bundles / DOM-элементам (не накапливают; element лежит в bundle, instance в collection)

### Key Files
- [base/base.class.ts](packages/plugins/src/base/base.class.ts) - TBasePlugin base
- [base/bundle.class.ts](packages/plugins/src/base/bundle.class.ts) - TPluginBundle registry
- [custom/element/element.plugin.ts](packages/plugins/src/custom/element/element.plugin.ts) - DOM binding
- [custom/input/input.plugin.ts](packages/plugins/src/custom/input/input.plugin.ts) - Value tracking
- [custom/collection/collection.plugin.ts](packages/plugins/src/custom/collection/collection.plugin.ts) - Collection management

### Key Exports
- `IPlugin<TInstance, TEvents>` - Plugin contract
- `TBasePlugin` - Base class
- `TPluginBundle` - Registry
- `IPluginContext` - Plugin install context

---

## Layer 5: Adapter Context (`packages/setup/adapter`)

### Role
**Headless runtime container** that:
1. Creates component instance from core
2. Creates plugin bundle from descriptor
3. Manages lifecycle via extensions

### IAdapterContext (Registry Pattern)
```
use<T>(ExtensionCtor, options?) → this
get<T>(ExtensionCtor) → T | undefined
destroy() → void (emits 'destroy' event)
```

Расширения регистрируются по самому классу (без `static readonly key = Symbol(...)`) — `extensionsMap` ключуется конструктором, как `TPluginBundle` ключуется `IPluginConstructor`.

Starts with default extension: `TPluginsBindingExtension` (binds DOM to element plugin)

### Adapter Layers

#### Context (`createAdapterContext`)
- Creates `instance` (TButton, TCheckBox, etc.)
- Creates `bundle` (plugin registry)
- Creates `accessor` (reflection API)
- Manages extensions registry

#### Extensions (`packages/setup/adapter/extensions/`)
- `TPluginsBindingExtension` - Binds DOM element to TElementPlugin
- `TCollectionExtension` - Provides child registration via elevator
- `TCollectionItemExtension` - Child registers itself with parent
- `TDragAndDropExtension` - Drag/drop handler

#### Elevator (`packages/setup/adapter/elevator/`)
- **TElevator** (base) - Caches string/symbol keys to unique symbols
- **TVueElevator** - Uses Vue provide/inject
- **ReactElevator** - Uses React.Context
- **Pattern**: Abstracts parent-child context passing

### Key Files
- [context/createAdapterContext.ts](packages/setup/adapter/context/createAdapterContext.ts) - Factory
- [context/types.ts](packages/setup/adapter/context/types.ts) - IAdapterContext contract
- [elevator/elevator.class.ts](packages/setup/adapter/elevator/elevator.class.ts) - Base elevator
- [extensions/plugins-binding.extension.class.ts](packages/setup/adapter/extensions/plugins-binding.extension.class.ts) - DOM binding
- [extensions/collection/collection.extension.class.ts](packages/setup/adapter/extensions/collection/collection.extension.class.ts) - Collection registry

### Key Exports
- `IAdapterContext` - Container contract
- `createAdapterContext(descriptor, options)` - Factory
- `TElevator` - Parent-child context base
- Extension classes

---

---

## Layer 5b: Общий слой адаптеров (`packages/setup/common`)

Поведение, которое обязано совпадать во всех фреймворках. Адаптер реализует
только то, что действительно различается — стратегию именования **событий**.

| Экспорт | Назначение |
|---|---|
| `underscorePropNaming(name)` | Имя пропа: `ns_name`. Одинаково везде — публичный API компонентов должен читаться одинаково на всех фреймворках. |
| `createInspectorFactory(naming)` | Адаптер связывает инспектор со своей стратегией один раз. |
| `collectEventBindings(accessor, inspector)` | Дедуплицированный список `{ source, rawName, exportName }` для проброса событий. |
| `resolveDefaultExtensions(descriptor)` | Живёт в `adapter/extensions/`; применяется по умолчанию внутри `createAdapterContext`. |

### Почему `collectEventBindings` дедуплицирует

Один raw-триггер объявлен у нескольких пропов. `present` в `ComponentContribution` —
производное от `rendered && visible`, поэтому его `triggers` это
`['change:rendered', 'change:visible']`, т.е. те же события, что у самих
`rendered` и `visible`. Наивный обход `getProps(true)` вешал две подписки на
`change:rendered` и потребитель получал **два эмита на одно изменение** (во всех
трёх адаптерах).

Дедуплицировать можно **только проброс событий**. Синхронизацию состояния
(`bindOutput`) — нельзя: `present` обязан пересчитываться на обоих триггерах.

### Контракт границы: значение, а не ручка на живое состояние

Адаптер узнаёт об изменении по смене идентичности. Поэтому составные props
(объекты, массивы) обязаны пересекать границу как снимок:

- через `valueOf()` — `TClasses.valueOf()` и `TCollectionStorageDriver.valueOf()`;
  `accessor.getValue` вызывает его сам (`val?.valueOf?.() ?? val`);
- либо заменой объекта целиком — layout-плагины (`this._styles = {...}`).

Раньше адаптеры компенсировали протечку клонированием (`cloneValue`) с
эвристиками про `Symbol.iterator`, `constructor === Object` и охранниками
`__v_skip`/`render` под Vue. Клонирование удалено: знание о том, что значение
означает, есть только у ядра, и снимок должен делаться там. Проверяется
`packages/setup/__tests__/value-identity.spec.ts`.

Смежный инвариант: `change:*` эмитится только при реальном изменении. Отсюда же
исправление асимметрии `show()`/`hide()` — `show()` эмитил `show:before` до
собственной проверки, что и вынуждало React ставить guard от бесконечного цикла.

### Почему `resolveDefaultExtensions` стал дефолтом

`TPluginsBindingExtension` требует `TElementPlugin` и бросает исключение, если
его нет. Раньше он подключался безусловно, поэтому headless-дескрипторы
(`DragAndDropDescriptor` наследует `ComponentDescriptor`, а не `ComponentViewDescriptor`)
приходилось обходить вручную через `{ defaultExtensions: [] }`. Теперь
`createAdapterContext` сам выбирает применимый набор.

---

## Layer 6: Vue Adapter (`packages/ui/vue/src`)

### ✅ COMPLETE IMPLEMENTATION

#### Static Layer (`adapter/static/`)
- `useProps(descriptor)` - Generate Vue props config from descriptor
- `useEmits(descriptor)` - Generate Vue emits array + update:prop triggers

#### Runtime Layer (`adapter/runtime/`)
- `useAdapter<TProps, TInstance>()` - Main hook (syncs props, events, DOM)
  - Returns TVueBinding with `ctrl`, `plugins`, `rootElement`, props refs
  - Subscribed to all events, syncs DOM via ref watchers
  - На `onUnmounted`: снимает подписки событий, затем `adapter.destroy()`
- `useSyncProps()` - Two-way prop binding; `bindOutput()` возвращает функцию отписки
- `useSyncEvents()` - Проброс событий + `update:<prop>` для `v-model`; возвращает
  функцию отписки

**Отписка обязательна.** `adapter.destroy()` работает только с собственным
`TEvented` адаптера и не трогает `instance.events`. При внешнем `ctrl`,
переживающем компонент (документированный сценарий), хендлеры копились бы с
каждым монтированием. React/Angular отписывались изначально, Vue — нет.

**`v-model`.** `useEmits` объявляет `update:<prop>` для каждого записываемого
свойства, `useSyncEvents` их эмитит (значение перечитывается через accessor —
у производных триггеров полезная нагрузка может не совпадать со свойством).
Раньше объявления существовали, но никогда не эмитились.

#### Elevator (`adapter/elevator/`)
- `TVueElevator<T>` - Wraps Vue provide/inject

#### Common Utilities (`adapter/common/`)
- `createInspector()` - Unified TDescriptorInspector factory
- `VueNaming` - Vue naming strategy (camelCase props, dash-case events)

#### Composables (`composables/`)
Осталось два — остальные (`useComponentSetup`, `useInstance`, `useInheritProps`,
`useEventState`, `composables/useSyncProps`) удалены как мёртвый код поколения
до адаптера. `composables/useSyncProps` вдобавок коллидировал по имени с
`adapter/runtime/useSyncProps`, и наружу экспортировался именно мёртвый.

- `useIconImport()` — импорт SVG из `@soldy/icons` в `markRaw(defineComponent(...))`
- `useSplitAttrs()` — разделение `useAttrs()` на `{class, style}` и остальное
  (для составных компонентов с `inheritAttrs: false`)

#### Components (`components/`)
**22+ Framework Components** (one per core component):
- Each has: `base.component.ts` (props/emits) + `setup.component.ts` (logic) + `.vue` template
- Pattern:
  ```ts
  // base.component.ts - Static props/emits
  extends: BaseParent,
  props: useProps(ButtonDescriptor),
  emits: useEmits(ButtonDescriptor)

  // setup.component.ts - Lifecycle + adapter
  setup(props, { emit }) {
    const adapter = createAdapterContext(ButtonDescriptor, { ctrl: props.ctrl, props })
    return useAdapter<IButtonProps, IButton>(adapter, props, emit)
  }
  ```

### Key Files
- [adapter/static/useProps.ts](packages/ui/vue/src/adapter/static/useProps.ts) - Vue props factory
- [adapter/static/useEmits.ts](packages/ui/vue/src/adapter/static/useEmits.ts) - Vue emits factory
- [adapter/runtime/useAdapter.ts](packages/ui/vue/src/adapter/runtime/useAdapter.ts) - Main hook
- [components/button/](packages/ui/vue/src/components/button/) - Button component example
- [composables/useComponentSetup.ts](packages/ui/vue/src/composables/useComponentSetup.ts) - Setup helper

### Component Hierarchy (Vue)
```
BaseComponent (Entity props)
├── BaseControl (disabled, focused, tag)
│   ├── BaseInputControl (value)
│   │   └── BaseCheckBox → CheckBox
│   └── BaseValueControl
│       └── BaseTextable (text, size, variant)
│           └── BaseButton → Button
├── BaseComponentView (rendered, visible, tag, classes)
│   └── BaseSkeleton → Skeleton
├── BaseStylable
├── BaseIcon
├── BaseSpinner
├── BaseTabs / BaseTabItem
├── BaseListBox / BaseListBoxItem
├── BaseList / BaseListItem
├── BaseCollection / BaseCollectionItem
├── BaseFrame
├── BaseDragAndDrop
└── BaseInput
```

---

## Layer 7: React Adapter (`packages/ui/react/src`)

### ✅ IMPLEMENTED (mirrors Vue `adapter/` architecture)

**Structure (1:1 with Vue adapter, 3-module component split):**
- `adapter/common/` — `createInspector` (через `createInspectorFactory(ReactNaming)`) и `ReactNaming`, который целиком собран из общих стратегий: `prop: underscorePropNaming`, `event: callbackEventNaming`. `resolveDefaultExtensions` переехал в `@soldy/setup` и применяется по умолчанию
  - props: same as Vue (`namespace_name`); events: `onXxx` callbacks (`change:visible` → `onChangeVisible`, `element:ready` → `onElementReady`)
  - тип-зеркало `TCallbackEventProps` живёт в `@soldy/setup/common` (им же пользуется Svelte). **Descriptor = единственный источник типов**: React НЕ импортирует `IXxxProps`/`TXxxEvents`/`TXxxPluginEvents` из core/plugins. Component event props = `TCallbackEventProps<DescriptorAllEvents<typeof XxxDescriptor>>` — `DescriptorAllEvents` включает свои + namespaced события плагинов из tuple (`TPlugins` phantom на `IComponentDescriptor`).
- `adapter/runtime/` — `useAdapter(adapter, props)` (main hook — takes a READY adapter, аналог `useAdapter`), `useSyncProps` (Core↔React state), `useSyncEvents` (event forwarding)
- `adapter/elevator/` — `TReactElevator` (React Context; `down`/`up` — collections NOT wired yet)
- `components/` — each component = 3 modules: `base.component.ts` (типы/props) + `setup.component.ts` (`useSetupXxx` hook, calls `createAdapterContext` directly) + view (`*.tsx`)
  - headless layers (`component`/`stylable`/`control`/`textable`): `base.component.ts` + `setup.component.ts` (no `.tsx` view, like Vue base layers)
  - concrete layers (`component-view`, `button`): `base.component.ts` + `setup.component.ts` + `.tsx` view

**Key design decisions (React-specific):**
- `useSetupXxx(props)` hook creates `IAdapterContext` once via lazy `useRef` (StrictMode-safe) and passes it to `useAdapter` — `createAdapterContext` is called DIRECTLY in setup hooks (not hidden in `useAdapter`), so users can pass custom `defaultExtensions`
- `useAdapter` returns `{ ctrl, plugins, ref, forwardProps, state }` — `state` = exported props (incl. protected `classes`/`present`), `forwardProps` = DOM attrs not consumed by the component (`ctrl`/`plugins`/`children` + prop/event names are consumed)
- DOM binding goes directly through `adapter.bundle.get(TElementPlugin).element` (not `TPluginsBindingExtension`) so it survives `adapter.destroy()` on StrictMode remount
- `useSyncProps` returns `{ state, bindOutput, bindInput, cleanup }` (mirrors Vue): `bindOutput()` = Core → React (subscribes to triggers, returns unsubscribe), `bindInput(props)` = React → Core (syncs props with `getValue === value` guard). `useAdapter` wires them via `useEffect(() => bindOutput(), [adapter, inspector])` + `useEffect(() => bindInput(props), [props, adapter, inspector])`
- `useSyncEvents`: `useLayoutEffect` (so rAF `ready` from TElementPlugin isn't missed); reads latest `props` via `propsRef`
- ~~React naming quirk: `onChangeVisible` fires TWICE~~ — исправлено дедупликацией в `collectEventBindings` (Layer 5b), одинаково во всех трёх адаптерах
- `{...restProps}` разворачивается ПЕРВЫМ, до `ref`: в React 19 `ref` — обычный проп, и переданный потребителем ref перекрыл бы ref адаптера, тихо сломав привязку к `TElementPlugin`

### Theming (`@soldy/theme-oren`) — foundation REMOVED
- `packages/foundation` deleted. Themes live in `packages/themes/*` (workspace glob `packages/themes/*` added to root).
- `@soldy/theme-oren` = standalone theme package: `src/{tokens.css, utilities.css, base.css, index.scss, mixins/_button.scss, components/_button.scss}` → built to `dist/index.css` (main/style/exports point to `dist/index.css`).
- Theme build = Vite lib mode (`entry: src/index.scss`, `assetFileNames: 'index.css'`) + `postcss.config.mjs` (`@tailwindcss/postcss`) + SCSS `additionalData` injecting `@import ".../src/base.css"` (base.css = `@import 'tailwindcss'` + tokens + utilities). `@apply` resolves because tailwind context is injected.
- **Contract = BEM classes** (`.s-button`, `.s-button--size-*`, `.s-button--a-*`). UI packages emit only classes; theme ships their CSS. Tailwind/SCSS live ONLY in the theme package.
- **Tokens**: `:root,[data-theme='oren'] { --s-accent-500: oklch(...) }` + `@theme inline { --color-s-accent-500: var(--s-accent-500) }` — utilities reference vars, so runtime theme switching via `data-theme` works without rebuild.
- UI packages (`ui-react`, `ui-vue`) + `core`/`angular`/`solid`/`svelte` dropped `@soldy/foundation` dep; demos import `@soldy/theme-oren`. Button styles removed from React (`button.scss`/`_mixines.scss`) and Vue (`Button.vue` `<style>`).
- Vue/React demo `additionalData` now points to `../../themes/oren/src/base.css` (demo chrome styles still use `@apply` + Tailwind — cleanup later).
- Remaining Vue component styles (`_fade.scss`/`_required.scss`, CheckBox/Switch/Input inline styles) NOT yet migrated to theme.

### React demo (`packages/ui/react/demo`) — mirrors Vue demo, ComponentView + Button only
- `App.tsx` — nav (Sandbox/Logs) + sidebar + playground switching; `common/` (EventLog, Properties, PropertyField, PanelDemo, items, useEventLogger, useSyncPropsToInstance); `layouts/PlaygroundLayout.tsx`; `playgrounds/{Button,ComponentView}.tsx`; `components/{button,component-view}/{Component,Instance,Slots}.tsx`; `demo.scss` (all demo styles)
- Demo uses raw event lists (`items.ts`: COMPONENT_VIEW_EVENTS / BUTTON_EVENTS) + `toReactHandler` → `onXxx` (same mapping as `ReactNaming.event`)
- Core instance logging via `instance.events.use()` middleware (catches ALL instance events, no enumeration)

### React package config
- `package.json` deps: `@soldy/accessor`, `@soldy/setup`, `@soldy/theme-oren`
- `tsconfig.json` paths + `vite.config.ts` aliases for `@soldy/accessor`, `@soldy/setup` added

### ⚠️ React pitfall: infinite loop via `visible` setter
- Core `TComponent.visible` setter calls `show()`/`hide()`, which emit `show:before`/`hide:before` **unconditionally** (before the `if (this.visible) return` guard). So writing `instance.visible = sameValue` still emits events.
- Fix in `useSyncProps.bindInput`: guard `if (accessor.getValue(prop) === value) continue` before `setValue`. Without it, event-logging demos re-render forever (Vue avoids it because `watch` only fires on actual value change).

---

## Layer 8: Angular Adapter (`packages/ui/angular/src`)

### ✅ IMPLEMENTED (ComponentView + Button, как в React)

**Структура** зеркалит Vue/React: `adapter/{common,runtime,elevator}` + `components/*`.

- `adapter/common/` — `AngularNaming` (события → camelCase без `on`-префикса,
  т.к. имя `@Output` обязано быть валидным TS-идентификатором), `createInspector`,
  `useInputs`/`useOutputs` (**только для кодогенератора**).
- `adapter/runtime/` — `useAdapter(adapter)` → `TAngularBinding`,
  `buildInitialState`/`bindOutput`/`bindInput`, `bindEvents`,
  `TAngularComponentBase` (общий жизненный цикл).
- `codegen/` — `collect-manifests` + `generate` → `src/generated/*.metadata.ts`.

### Почему Angular нужен кодогенератор

Angular AOT статически анализирует декоратор: `inputs`/`outputs` обязаны быть
литеральными массивами на этапе компиляции. Имена же живут в рантайм-дескрипторах
(`@soldy/setup`), поэтому вычислить их внутри декоратора нельзя — в отличие от Vue,
где `props: useProps(ButtonDescriptor())` вычисляется при инициализации модуля.
Имена считаются заранее и сериализуются в `as const`-массивы.

`manifest.ts` каждого компонента объявляет `name` + фабрику `descriptor`;
`generate` прогоняет их через `useInputs`/`useOutputs`. Файлы закоммичены,
`prebuild`/`predev` их обновляют, CI проверяет дрейф.

### Реактивность

Состояние — `signal<Record<string, any>>`, шаблон читает `state()['x']`.
Раньше было поле + `cdr.markForCheck()`: `markForCheck` помечает путь грязным,
но не планирует проверку, поэтому работало только под Zone.js и молча ломалось
бы под `provideZonelessChangeDetection`. Сигнал уведомляет шаблон сам.

### DOM-биндинг

`bindElementFrom(viewChild('el', { read: ElementRef }))` — сигнальный запрос
переустанавливает связь при пересоздании узла (переключение `rendered`, смена
`tag` между веткой `<button>` и `<div>`). Обычный `@ViewChild` + `ngAfterViewInit`
читается один раз и после пересоздания указывает на мёртвый элемент.

`TComponentViewComponent` — исключение: его корень это хост-элемент, который
живёт всё время, поэтому биндинг разовый в `ngAfterViewInit`.

### Известные ограничения

- `tag` схлопывается до двух веток: `<button>` либо `<div>`. Произвольный тег
  (`a`, `span`) отрендерится как `<div>` — Angular не умеет менять имя тега.
- Нет именованных слотов (во Vue у Button есть `leading`/`trailing`).
- Нет двусторонней привязки: `[(text)]` требует аутпут `textChange`, а стратегия
  именования даёт `changeText`.
- Elevator (`TAngularElevator`) реализован, но никуда не подключён и передаёт
  значение через приватное поле, а не через DI — понадобится доработка, когда
  дойдёт до коллекций.

## Layer 8b: Svelte Adapter (`packages/ui/svelte/src`)

### ✅ IMPLEMENTED (Component / ComponentView / Stylable / Control / Textable / Button)

Svelte 5 на рунах. Структура зеркалит React, потому что механика событий та же —
колбэк-пропы:

- `adapter/common/` — `SvelteNaming` (`prop` = `underscorePropNaming`, `event` =
  `callbackEventNaming` — обе стратегии общие с React), `createInspector`.
- `adapter/runtime/` — `useAdapter.svelte.ts`, `useSyncProps.svelte.ts`,
  `useSyncEvents.ts`. Расширение `.svelte.ts` обязательно там, где используются
  руны (`$state`, `$effect`, `$derived`).
- `adapter/elevator/` — `TSvelteElevator` через `setContext`/`getContext`
  (ограничение то же, что у Vue: только во время инициализации компонента).

### Svelte-специфика

- **Состояние** — `$state`-объект. Глубокая реактивность прокси покрывает и
  скалярные props, и составные, поэтому отдельного механизма уведомления не нужно.
- **props передаются геттером** (`() => props`): в Svelte 5 захват `$props()`
  в переменную рвёт реактивность, читать нужно лениво. Компилятор ловит это
  предупреждением `state_referenced_locally`.
- **DOM-биндинг — attachment** (`{@attach binding.attachElement}`), прямой аналог
  callback-ref из React: вызывается при появлении узла и умеет вернуть cleanup,
  поэтому пересоздание элемента при смене `tag` обрабатывается само.
- **Слоты — сниппеты**: `children` рендерится через `{@render children?.()}`,
  именованные области layout'а передаются сниппет-пропами.
- **Атрибуты идут одним объектом**: у `<svelte:element>` тип атрибутов обобщённый,
  поэтому `disabled` нельзя поставить отдельным атрибутом — он уходит через спред.

### Известные ограничения

- `tag` поддерживается только строковый: `<svelte:element>` не принимает
  компонент. Объектные теги (как в Vue) потребуют отдельной ветки.
- Коллекции не портированы (elevator готов, но не подключён).

## Layer 8c: Solid Adapter (`packages/ui/solid/src`)

### ✅ IMPLEMENTED (Component / ComponentView / Stylable / Control / Textable / Button)

Структура зеркалит React — JSX и колбэк-пропы делают их почти близнецами:

- `adapter/common/` — `SolidNaming` целиком собран из общих стратегий
  (`prop: underscorePropNaming`, `event: callbackEventNaming` — **третий**
  потребитель после React и Svelte), `createInspector`.
- `adapter/runtime/` — `useAdapter`, `useSyncProps`, `useSyncEvents`.
- `adapter/elevator/` — `TSolidElevator` через `createContext`/`useContext`.

### Solid-специфика

- **Состояние — `createStore`, а не сигнал.** Store даёт реактивность на уровне
  отдельных свойств, поэтому изменение одного пропа не перерисовывает всё, что
  читает остальные. Запись — merge-формой `setState({ [name]: value })`:
  путевая форма `setState(name, value)` трактовала бы значение-функцию как updater.
- **props не деструктурируются** — это объект геттеров. Разделение через
  `splitProps`, чтение напрямую. Поэтому `useSyncEvents` не нуждается в
  обёртке вроде `propsRef` из React: колбэк читается в момент события.
- **Жизненный цикл — `onCleanup`**, подписки снимаются при уничтожении
  реактивного владельца.
- **DOM-биндинг — callback-ref** (`ref={binding.ref}`), как в React.
- **Динамический тег** — `<Dynamic component={tag}>` из `solid-js/web`.
- **children резолвятся через `children()`** — прямое чтение `props.children`
  в нескольких местах создавало бы узлы заново.

### Известные ограничения

- `tag` поддерживается только строковый.
- Коллекции не портированы; elevator, как и в React, не может отдать значение
  императивно — контекст в Solid выставляется только через `<Provider>` в JSX.

## Layer 8d: Web Components Adapter (`packages/ui/webc/src`)

### ✅ IMPLEMENTED (Component / ComponentView / Stylable / Control / Textable / Button)

Единственный таргет без фреймворка — и потому самый показательный тест
архитектуры: ядро уже событийное, а `CustomEvent` это родная модель DOM.

- `adapter/common/` — `WebcNaming` (`prop` = общий `underscorePropNaming`,
  `event` = имя как в ядре: двоеточия в CustomEvent легальны, так же как во Vue),
  `createInspector`, `attributes` (карта «атрибут → проп» + коэрция).
- `adapter/runtime/` — `useAdapter`, `useSyncProps`, `useSyncEvents`,
  `TSoldyElement` (базовый класс), `defineProps`, `defineElement`.

### Чем Web Components проще Angular

`observedAttributes` — статический геттер, вычисляемый в рантайме при
регистрации класса, а не декоратор, который анализирует компилятор. Дескриптор
доступен на уровне модуля, поэтому **кодогенерация не нужна**:

```ts
static get observedAttributes() { return useAttributes(ButtonDescriptor()) }
```

### Чем сложнее всех остальных

**Реактивности нет вообще.** У четырёх других адаптеров был примитив (`ref`,
`useState`, `signal`, `$state`, `createStore`), превращавший «состояние
изменилось» в «перерисуй». Здесь его нет: `useSyncProps` держит обычный объект
и зовёт колбэк, а `TSoldyElement` коалесцирует перерисовку в микротаске —
одно изменение props в ядре часто даёт несколько триггеров. Сам `render()`
императивный, и это самая объёмная часть компонента.

**Два входных канала.** Атрибуты (строки, для HTML) и свойства (любые значения,
для JS) — оба кормят `bindInput`. Атрибут приводится к типу из contribution;
для Boolean действует HTML-семантика: значимо наличие атрибута, поэтому
`disabled="false"` это `true`, а снять флаг можно только его удалением.

### Решения по DOM

**Light DOM с внутренним элементом.** Классы из ядра остаются обычными
глобальными BEM-классами, поэтому тема работает без изменений — в отличие от
Shadow DOM, куда её пришлось бы вносить через `adoptedStyleSheets`, ломая
контракт «UI отдаёт классы, тема отдаёт CSS».

Внутри хоста рендерится настоящий `<button>` — сохраняются клавиатура, фокус и
участие в форме, которых у кастомного элемента самого по себе нет.

Плата: `<slot>` недоступен, поэтому пользовательское содержимое снимается с
хоста в `connectedCallback` и переносится в корень вручную.

### Известные ограничения

- Смена `tag` пересоздаёт внутренний элемент: имя тега поменять нельзя.
- `ctrl` имеет смысл присваивать только до вставки в DOM — adapter-context
  создаётся один раз, как и во всех остальных адаптерах.
- Элеватор не написан: коллекции не портированы, а плодить мёртвый код
  (как вышло с React/Svelte/Solid) незачем. Для WC понадобится context protocol
  через всплывающее событие-запрос.

---

## Data Flow & Connection Patterns

### Static (Build Time)
```
defineComponent({ ctor, extends, contribution, plugins })
  ↓
definePlugin({ ctor, contribution, options })
  ↓
Descriptor (props, events, plugins)
  ↓
Inspector generates Vue props/emits schemas
```

### Runtime (Component Initialization)
```
setup(props, { emit }) {
  1. createAdapterContext(Descriptor, { ctrl, props })
     ↓
     - Create instance (TButton)
     - Create bundle (TPluginBundle)
     - Create accessor (TComponentAccessor)
     - Register TPluginsBindingExtension
     ↓
  2. useAdapter(adapter, props, emit)
     ↓
     - useSyncProps: bidirectional prop binding (component → Vue refs)
     - useSyncEvents: event subscription + emit forwarding
     - bindElement: DOM ref → TElementPlugin
     - onUnmounted: adapter.destroy()
     ↓
  3. Return { ctrl, plugins, rootElement, ...props }
     ↓
     Template accesses: ref.value, @event, :prop
}
```

### Collection Pattern (Parent-Child)
```
Parent (TCollectionExtension, in setup layer):
  - context.bundle.get(TCollectionBundlesPlugin)
  - bundles.bindCollection(collection)  // передаёт ссылку на коллекцию в плагин
  ↓ (elevator.down)
  Child (TCollectionItemExtension, in setup layer):
    - elevator.up() → register(instance, bundle)
    - Parent: 1) plain.insert(instance)  2) bundles.register(bundle, instance)  // key = instance.uid
    - Cleanup: plain.remove(instance) → item:removed → реестр bundles чистится по событию

TCollectionBundlesPlugin (plugins layer):
  - хранит ссылку на collection + Map<uid, IPluginBundle> (только bundles, НЕ instances)
  - подписан на collection.engine.events: 'item:removed' (delete), 'reset' (clear)
  - порядок bundles всегда берётся из collection.engine → 'item:moved' не требует обработки
  - query: getByUid / getByItem / getAll / collection (полный доступ к состоянию коллекции)
```

Key files:
- `packages/plugins/src/custom/collection/bundles.plugin.ts` — TCollectionBundlesPlugin (+ TBundlesEvents) — реестр item-bundles + ссылка на collection; эмитит `collection:bound` при bindCollection
- `packages/plugins/src/custom/collection/collection-bundles-access.plugin.ts` — TCollectionBundlesAccess (abstract, доступ к bundles по uid/item/index)
- `packages/plugins/src/custom/collection/collection-elements.plugin.ts` — TCollectionElements (доступ к DOM-элементам через bundle.get(TElementPlugin))
- `packages/plugins/src/custom/tabs/` — TTabsLayoutPlugin / TTabsActiveTabPlugin / TTabsViewPlugin (мигрированы из _plugins)
- `packages/plugins/src/custom/drag-and-drop/` — TDragPlugin (мигрирован из _plugins; activate(collection), использует TCollectionElements + TCollectionBundlesPlugin)
- `packages/setup/adapter/extensions/collection/collection.extension.class.ts` — TCollectionExtension (фасад: создание коллекции через TCollectionFactoryExtension + owner-props через TCollectionPropsExtension + bindCollection + insert/register). descriptor опционален.
- `packages/setup/adapter/extensions/collection/collection-factory.extension.class.ts` — TCollectionFactoryExtension (создаёт коллекцию / берёт engine; нужен для context.get(TCollectionFactoryExtension) в useVueCollection и TDragAndDropCollectionExtension)
- `packages/setup/adapter/extensions/collection/collection-props.extension.class.ts` — TCollectionPropsExtension (применяет owner-props)
- `packages/setup/adapter/extensions/collection/drag-and-drop*.extension.class.ts` — TDragAndDropExtension (down(true)), TDragAndDropCollectionExtension (up() → activate(TDragPlugin, collection из TCollectionFactoryExtension))
- `packages/setup/adapter/extensions/collection/collection-item.extension.class.ts` — TCollectionItemExtension (фасад: TItemContext через TCollectionItemContextExtension + регистрация через COLLECTION_ELEVATOR + meta через TCollectionItemMetaExtension). descriptor опционален.
- `packages/setup/descriptors/plugins/` — CollectionBundlesPluginDescriptor, CollectionElementsPluginDescriptor, TabsLayoutPluginDescriptor, TabsActiveTabPluginDescriptor, TabsViewPluginDescriptor, DragPluginDescriptor (wired into TabsDescriptor / CollapseDescriptor)

---

## Key Architectural Patterns

### 1. **Descriptor Pattern**
Single source of truth for metadata. Enables:
- Inheritance (TextableDescriptor → ButtonDescriptor)
- Plugin composition
- Static framework adapter generation

### 2. **Accessor Pattern (Runtime Reflection)**
Unified reflection API. Enables:
- Framework-agnostic property/event access
- Namespace prefixing for plugins
- Prop/event name formatting per framework

### 3. **Plugin System**
Extensibility via namespaced plugins:
- Each plugin = isolated behavior
- Props/events added via contribution
- Lifecycle: install → destroy

### 4. **Adapter Context (Registry)**
Container for:
- Component instance + bundle + accessor
- Extensions (behavior customization)
- Lifecycle management via events

### 5. **Elevator Pattern (Parent-Child Context)**
Framework-agnostic dependency injection:
- Vue: provide/inject
- React: React.Context
- Abstracts framework differences

### 6. **Headless + Renderer Separation**
- **Core** (@soldy/core) - Business logic, no UI
- **Adapter** (@soldy/ui-vue) - Framework binding only
- Each framework can implement independently

---

## Missing/Incomplete Areas

### React
- Hooks (`useAdapter`, `useSyncProps`, `useSyncEvents`), elevator (`TReactElevator`), DOM/plugin binding — done
- [ ] All 20+ component implementations (only `component-view`, `button` done)
- [ ] Collection support (owner/item registration over the elevator)

### Angular
- Адаптер, кодогенерация метаданных, сигналы, жизненный цикл, DOM-биндинг — done
- [ ] Все компоненты, кроме `component-view` и `button`
- [ ] Коллекции (elevator реализован, но не подключён и не использует DI)
- [ ] Именованные слоты, двусторонняя привязка, произвольный `tag`

### Svelte (Not Started)
- [ ] Store integration
- [ ] Reactive statement handling
- [ ] Component implementations

### Solid (Not Started)
- [ ] Signal integration
- [ ] Effect synchronization
- [ ] Component implementations

---

## Package Exports

| Package | Main Exports |
|---------|-------------|
| @soldy/core | TComponent, TButton, TCheckBox, etc., TEvented, TStateUnit |
| @soldy/accessor | TComponentAccessor, TDescriptorInspector, INamingStrategy, IAccessor |
| @soldy/setup | createAdapterContext, IAdapterContext, defineComponent, definePlugin, underscorePropNaming, createInspectorFactory, collectEventBindings, resolveDefaultExtensions |
| @soldy/plugins | TPluginBundle, TBasePlugin, TElementPlugin, IPlugin |
| @soldy/ui-vue | Vue components (Button, CheckBox, etc.) + adapter (useAdapter, useProps, useEmits, VueNaming, TVueElevator) — `src/index.ts` теперь экспортирует `./adapter`, раньше нет |
| @soldy/ui-react | Button, ComponentView, useAdapter, useSyncProps/useSyncEvents, useSetupXxx hooks, naming/plugins type transformers |
| @soldy/ui-angular | TButtonComponent, TComponentViewComponent, TComponentComponent, useAdapter, TAngularComponentBase, AngularNaming |
| @soldy/ui-svelte | Button, ComponentView, useAdapter, TSvelteElevator, SvelteNaming |
| @soldy/ui-solid | Button, ComponentView, useAdapter, TSolidElevator, SolidNaming |
| @soldy/ui-webc | `<soldy-button>`, `<soldy-component-view>`, TSoldyElement, useAdapter, WebcNaming |


---

## Collapse ↔ Tabs parity (post collection-refactor)

Collapse is now a 1:1 mirror of Tabs. Only differences: component props (`view` vs orientation/alignment/position/view/closable) and the state extension (`selection` → `selected` vs `activation` → `active`).

- Core: `packages/core/src/components/custom/collapse/` — `TCollapse` (view only), `TCollapseItem` (text + arrowPlacement), `collection/` with `CollapseFactory` + `TCollapseExtension`/`TCollapseItemExtension` (item adapter exposes `view`, namespaced prop `collapse_view`).
- Custom item classes removed (`TCollapseItemCustom`, `CollapseItemCustomDescriptor`, `CollapseItemCustomContribution`, `BaseCollapseItemCustom`) — single `TCollapseItem` remains, same in UI.
- Selection default mode is `'single'` (TSelectionExtension default); old Collapse default `'multiple'` is set explicitly by callers (e.g. demos pass `mode="multiple"`).
- Vue: `Collapse.vue` renders `CollapseItem` by `items`; `CollapseItem.vue` toggles via `context.adapters.selection.toggle()`, button view via `collapse_view`, aria via `selected`.

---

## List / ListBox parity (post collection-refactor)

List is headless (no visual part), ListBox extends it. Both mirror Tabs/Collapse:
- Core: `TList` (maxRows/autoWidth/wordWrap/scrollBehavior, no collection), `TListItem` (text + wordWrap). `TListBox extends TList` (+ view), `TListBoxItem extends TListItem` (view comes from extension).
- Collections: `ListFactory`/`ListBoxFactory`. Extensions **inherit, not duplicate**: `TListExtension` (selection + wordWrap propagation, `protected _owner`, `TOwner extends IList<any,any,any>`, `name: string`) ← `TListBoxExtension` (adds `view` + `change:view` relay). Item adapters: `TListItemExtension` (wordWrap) ← `TListBoxItemExtension` (adds `view`). Item adapters expose `list_wordWrap` / `list_view` (namespace `list`).
- `TList`/`IList` are generic in props (`TProps extends IListComponentProps`) so `TListBox` can pass `IListBoxProps`. `defaultValues` typed `Partial<IListComponentProps>` to avoid static-side `engine` type conflict between `TListCollection` and `TListBoxCollection`.
- List plugins migrated to `packages/plugins/src/custom/list/`: `TListItemPlugin` (highlighted only — selection moved to selection extension), `TListLayoutPlugin`, `TListKeyboardPlugin`, `TListScrollPlugin`. **`TListItemAccumulationPlugin` removed** — `TCollectionBundlesPlugin.getByUid(uid)?.get(TListItemPlugin)` replaces per-uid plugin accumulation.
- Plugin descriptors: `ListItemPluginDescriptor` (namespace `listItem` → `listItem_highlighted`), `ListLayout/Keyboard/ScrollPluginDescriptor`. ListBoxDescriptor wires: CollectionBundles + CollectionElements + Layout + Keyboard + Scroll + Drag.
- Pitfall: `TList` constructor needs `const { props = {} as Partial<TProps> } = TComponentView.prepareOptions<TProps, TStates>(...)` — generic `TProps` + `{}` default otherwise types `props` as `{}`.
