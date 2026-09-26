# Soldy UI Component Adapter Architecture Overview

## Project Structure

Multi-package monorepo with framework adapters for Vue, React, Angular, Svelte, Solid и Web Components.
Core business logic is **framework-agnostic** in `packages/core/src`.

`packages/setup` разложен на два слоя: `protected/` — механика (`define`,
`naming`, `registry`, `adapter`), одна на шесть адаптеров; `content/` —
наполнение (`descriptors`, `extensions`, `icons`), которым библиотека растёт.
Наполнение знает механику, механика о наполнении не знает. Правка `protected/`
идёт только с разрешения владельца, `content/` свободен — см. AGENTS.md,
«Структура `packages/setup`».

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
│   └── TComponentView (rendered/visible/present, show/hide, tag, direction, classes, aria/dataset/attrs, ready)
│       ├── TLayer (target, zIndex — общий стек слоёв, data-layer)
│       │   ├── TFrame (x, y, width, height, position)
│       │   └── TModalLayer (width, height, closable, dismissible, requestClose)
│       │       ├── TDialog (placement, maximized, alert)
│       │       └── TDrawer (placement у края, swipe, contained)
│       ├── TIcon, TSkeleton, TTabsContent
│       ├── TInteractive (disabled, focused)
│       └── TStylable (size, variant)
│           ├── TSpinner
│           └── TControl (disabled, focused)
│               ├── TTextable (text)
│               │   └── TButton (view)
│               ├── TValueControl (value, name)
│               │   ├── TInputControl (readonly, required)
│               │   │   └── TCheckBox, TSwitch, TInput, TSelect
│               │   ├── TListBox, TTags
│               │   └── TTabsItem, TAccordionItem, TListBoxItem, TSelectItem, TTagsItem
│               └── TTabs, TAccordion
```

**Почему так.** Одно время `rendered`/`visible`/`present` были спущены в
`TComponent` — ради `TFrame`, который нуждался в `visible`, но наследовал
`TComponent`. Обоснование в `FrameDescriptor` («ComponentViewDescriptor
приносит size/variant») было ошибочным: `size`/`variant` объявлены ниже, в
`StylableDescriptor`. В результате невизуальные компоненты (`TDragAndDrop`,
фасады коллекций) получали свойства отображения, которые им не нужны.

Правильное решение — поднять `TFrame` до `TComponentView`: он и так рендерит
элемент, биндит его через `TElementPlugin`, а `class="s-frame"` и тег `<div>`
были захардкожены в шаблоне вместо наследуемых `classes`/`tag`. Заодно
`FrameDescriptor` перестал дублировать `ElementPluginDescriptor` и
`ReadyPluginDescriptor`.

### Key Files

- [base/component/component.class.ts](../packages/core/src/components/base/component/component.class.ts) - Base IComponent interface
- [base/control/control.class.ts](../packages/core/src/components/base/control/control.class.ts) - Interactive controls
- [custom/button/button.class.ts](../packages/core/src/components/custom/button/button.class.ts) - Button implementation
- Custom components (`custom/`): Accordion, Button, CheckBox, DragAndDrop, Frame, Icon, Input, ListBox, Select, Skeleton, Spinner, Switch, Tabs, Tags. `custom/list/` holds only the shared ListBox/Select contract (`IList`), no class

### Key Exports

- `IComponent<TProps, TEvents, TStates>` - Component contract
- `TEvented<T>` - Event emitter
- `TStateUnit<T>` - Reactive state wrapper

---

## Layer 2: Exchange kernel (`packages/setup/protected/adapter/exchange`)

### Role

**Value exchange between the core and a framework for one mount.** A separate reflection package (`@soldy-ui/accessor`) no longer exists: it had a single consumer, and the package boundary split the write rules in two. The kernel is a module of `@soldy-ui/setup` that knows only a property spec (`TPropSpec`) and a surface (`TSurface`) — nothing about plugin bundles, registries or the adapter context (guarded by `setup-structure.spec.ts`).

### Key Classes

- **TCell**: the only mutable memory of the layer — a value, an equality rule and listeners. Svelte-store contract: `subscribe` delivers the current value at once, `listen` delivers changes only. «What the framework assigned», the state snapshot and the `pluginProps` bag are cells; there are no «assigned / not assigned» flags
- **TLine**: one property of one owner for the mount — spec + owner + framework name. Правило записи одно, поэтому оно одно на сборку, обмен и плагины снаружи
  - `read()` - `get` описания, а без него `owner[name]`; составное значение — снимком `valueOf()`
  - `write(value)` - запись; `protected` пропускается, «то же ли значение» решает сеттер владельца
  - `reset()` - вернуть умолчание описания; ключ не объявлен — значение остаётся
  - `accept(value)` - значение от фреймворка: `undefined` — «сняли»
  - `seed(value)` - начальное значение: `undefined` и равное умолчанию ничего не задают
  - `watch(listener)` - слушать триггеры свойства на шине владельца (`owner.events`, а без поля — сам владелец; без `on`/`off` источника нет)
- **TMember**: a participant of the mount — an owner and what it declares. The instance, a descriptor plugin, an external plugin and the binding itself (`TExternalPlugins`, the owner of `pluginProps`) are members of the same kind
- **TStateStore** (core → framework): a cell per property with triggers; `subscribe` / `getSnapshot`; subscribes to the owner bus while there is at least one subscriber
- **TInputPort** (framework → core): a cell per writable prop, seeded with the build props. `full(props)` / `delta(changes)` / `TInput.offer(value)` differ only in what counts as a change: a changed value (`offer`) or the mere presence of the key (`push`, used by `delta`)
- **TEventRelay** (events out): one handler per «source, raw name»; the `v-model` event goes out from the same handler right after the core event
- **TExchange**: lines of the members plus the three ports — everything an adapter sees (`adapter.connect(profile)`)

Names in a framework's notation are computed by the surface — `TSurface.of(descriptor, profile)`, once per descriptor × profile (Layer 5b). The line gets its framework name from the surface entry, found by the identity of the `TName` object — not by a string key.

### Key Files

- [exchange/cell.class.ts](../packages/setup/protected/adapter/exchange/cell.class.ts) - TCell
- [exchange/line.class.ts](../packages/setup/protected/adapter/exchange/line.class.ts) - TLine: чтение, запись и слежение за одним свойством
- [exchange/member.class.ts](../packages/setup/protected/adapter/exchange/member.class.ts) - TMember
- [exchange/state-store.class.ts](../packages/setup/protected/adapter/exchange/state-store.class.ts), [input-port.class.ts](../packages/setup/protected/adapter/exchange/input-port.class.ts), [event-relay.class.ts](../packages/setup/protected/adapter/exchange/event-relay.class.ts) - the three ports
- [exchange/exchange.class.ts](../packages/setup/protected/adapter/exchange/exchange.class.ts) - TExchange
- [exchange/value.ts](../packages/setup/protected/adapter/exchange/value.ts) - `sameValue` (plain objects and arrays by content, the rest by identity), `busOf`

### Key Exports

- `TExchange`, `TMember` - the exchange and its participants
- `TName` - Qualified name: raw name + optional namespace (`protected/define/name.class.ts`)
- `TPropSpec` - Immutable property spec with `read(owner)` / `assign(owner, value)`, `hasDefault`, `rebase`, `withDefault` (`protected/define/prop-spec.class.ts`)
- `IContribution`, `IPropDefinition`, `ISlotDefinition` / `ISlotDeclaration` - What a descriptor declares (`protected/define/contribution.types.ts`)
- `INamingStrategy`, `IAdapterProfile`, `CommonProfile` - Prop/event naming rules (`protected/naming/`). Props are `ns_name` everywhere (`underscorePropNaming`); events: `element:ready` in Vue and Web Components, `onElementReady` in React/Svelte/Solid (`callbackEventNaming`), `elementReady` in Angular

---

## Layer 3: Setup & Descriptors (`packages/setup/protected/define`, `packages/setup/content/descriptors`)

### Role

**Build-time component metadata**. Single source of truth for:

- Props schema (the descriptor's `contribution` + plugins)
- Events schema
- Plugin definitions with namespaces
- Inheritance hierarchy

### Descriptor Pattern

One file per component: inheritance, props, events, slots and plugins are declared right in the descriptor (AGENTS.md, «Project-specific patterns»):

```ts
export const ButtonDescriptor = defineDescriptor(() =>
  defineComponent({
    ctor: TButton,
    extends: TextableDescriptor(), // Inherit props/events/slots/plugins
    contribution: {
      props: { view: { type: String, triggers: ['change:view'] } },
      slots: { leading: {}, default: { scope: { text: defineType<string>(String) } } },
    },
  }),
)
```

Descriptors are factories, and `extends` takes a called descriptor. `defineDescriptor` caches the factory: the descriptor is built once per type, and the surface (Layer 5b) is cached by its identity. Own plugins go to `plugins: [...]` — `definePlugin` results.

The descriptor's types are not written by hand: `defineComponent` infers them from its options. Props and events come from the core class (`ctor`: its `IEntity<TProps>` and its `events: TEvented<TEvents>`; without `ctor` — from `extends`), slots from the `slots` declaration over the slots of `extends`, the plugin tuple from `plugins`. A generic base class gets its parameter's constraint, not its default: `IValueControlProps<unknown>` for `TValueControl`.

Returns `IComponentDescriptor` with:

- `ctor` - Core class the instance is built from
- `props: readonly TPropSpec[]` / `events: readonly TName[]` - Own + inherited declarations, without plugin ones
- `slots: readonly ISlotDeclaration[]` - Own + inherited, overridden by name. Плагины слотов не имеют, поэтому «полного» списка у слотов нет
- `plugins: readonly IPluginDefinition[]` - Own + inherited plugin definitions, overridden by plugin class
- `getProps()` / `getEvents()` - Full lists: component + plugins

Декларации заморожены: дескриптор строится один раз на тип и один на все монтирования.

The descriptor has no assembly methods: a component for one mount is assembled from it by `createAdapterContext` (Layer 5), which knows only the descriptor's contract (`protected/define/types.ts`).

### Key Files

- [define/descriptor.ts](../packages/setup/protected/define/descriptor.ts) - defineDescriptor: the descriptor is built once per type
- [define/component.ts](../packages/setup/protected/define/component.ts) - defineComponent factory
- [define/plugin.ts](../packages/setup/protected/define/plugin.ts) - definePlugin factory
- [define/component-descriptor.class.ts](../packages/setup/protected/define/component-descriptor.class.ts) - `TComponentDescriptor`: own declaration over the one inherited from `extends` (props, events, slots, plugins)
- [define/plugin-definition.class.ts](../packages/setup/protected/define/plugin-definition.class.ts) - `TPluginDefinition`: plugin contract plus install options of the place it is used in — `with(options)`
- [define/contribution.ts](../packages/setup/protected/define/contribution.ts) - Contribution → declarations (`normalizeContribution`)
- [define/inference.types.ts](../packages/setup/protected/define/inference.types.ts) - Types for adapters inferred from the descriptor (extractors below)
- [define/prop-spec.class.ts](../packages/setup/protected/define/prop-spec.class.ts) - `TPropSpec`: immutable property spec with `read` / `assign`, `rebase`, `withDefault`
- [adapter/context/create-adapter-context.ts](../packages/setup/protected/adapter/context/create-adapter-context.ts) - What is built from the descriptor on mount (Layer 5)
- [components/button.descriptor.ts](../packages/setup/content/descriptors/components/button.descriptor.ts) - Button example
- Descriptor files (`components/`) for: Entity, Component, ComponentView, Interactive, Stylable, Control, ValueControl, InputControl, Textable, Button, CheckBox, Switch, Input, Icon, Spinner, Skeleton, Frame, DragAndDrop; folders `accordion/`, `collection/`, `list-box/`, `select/`, `tabs/`, `tags/`

### Key Exports

- `IComponentContract` - контракт компонента в типах, единственный параметр дескриптора, контекста и `useAdapter`: `instance` (инстанс, который строит `ctor`), `eventName` (опубликованные имена событий), `slots`, `plugins` (сумма контрактов плагинов). Пропсы и карта событий — свойства инстанса, отдельных ключей у них нет. Новый факт о компоненте — новый ключ, сигнатуры при этом не меняются
- `IPluginContract` - контракт плагина в типах, уже под именами с неймспейсом: `props` (входы — незащищённые пропсы, их пишет потребитель), `events`, `outputs` (выходы — защищённые пропсы, которые плагин вычисляет, а разметка только читает: `dismiss_ownerAttribute`, `layout_styles`)
- `IComponentDescriptor<C>` - Metadata contract; `C` — фантомный `IComponentContract`, его выводит `defineComponent`
- `IPluginDefinition<C>` - Plugin definition; `C` — фантомный `IPluginContract`, его выводит `definePlugin`
- `defineComponent({...})` - одна сигнатура и один параметр типа — сами опции, литералом; type-аргументы не передаются. Контракт выводится из опций (`TContractFrom`): инстанс — из `ctor`, а без него из `extends`; события — карта инстанса, суженная до имён из `events` и триггеров пропсов, своих и `extends` (имя вне карты класса не компилируется, `TCheckedEventNames`); слоты — из объявления поверх слотов `extends`; плагины — из `plugins`.
- `defineDescriptor(build)` - Builds the descriptor once per type
- `definePlugin(options)` - Create plugin definition; type-аргументы не передаются. Контракт плагина выводится из его класса и contribution (`TPluginContractFrom`): состав — из contribution, тип значения пропа — у одноимённого свойства класса или у `get` декларации, события — карта класса, суженная до `events` и триггеров пропсов. Выход — геттер плагина, как выход компонента — геттер инстанса
- Extractors (types), все читают контракт по ключу: `TContractOf<T>`, `DescriptorInstance<T>`, `DescriptorProps<T>`, `DescriptorEvents<T>` (свои опубликованные события), `DescriptorSlots<T>`, `DescriptorAllEvents<T>` (свои + namespaced события плагинов), `DescriptorAllProps<T>` (свои + namespaced пропсы плагинов), `DescriptorPluginOutputs<T>` (namespaced выходы плагинов дескриптора; свои выходы компонента — `classes`, `aria` — в него не входят, их тип даёт инстанс). **Descriptor = единственный source of truth для типов props/events/plugin-events/plugin-outputs** (фреймворки не импортируют `IXxxProps`/`TXxxEvents`/`TXxxPluginEvents` из core/plugins).

### Component Descriptors

Organized by inheritance:

- **Base**: Entity → Component → ComponentView → Stylable → Control; Interactive (от ComponentView)
- **Control**: ValueControl, Textable → Button, Tabs, Accordion
- **ValueControl**: InputControl → CheckBox, Switch, Input, Select; ListBox, Tags; items `TabsItem`, `AccordionItem`, `ListBoxItem`, `SelectItem`, `TagsItem`
- **Collections**: `CollectionDescriptor` (общие props/events владельца) → `<Owner>CollectionDescriptor` у Tabs, Accordion, ListBox, Select, Tags; фасады элементов — `<Owner>CollectionItemDescriptor` и `TabsCollectionContentDescriptor`
- **Standalone** (от ComponentView/Stylable/Component): Icon, Skeleton, Frame, TabsContent, Spinner, DragAndDrop

---

## Layer 4: Plugins (`packages/plugins/src`)

### Role

**Runtime behavior extenders**. Each plugin:

- Registers with a unique `namespace` (string literal, declared in the descriptor)
- Emits events via `TEvented`
- Gets installed into `TPluginBundle`

### Base Classes

- **TBasePlugin**: Provides events, install/destroy/created lifecycle
  - Namespace is declared in the plugin descriptor (`definePlugin({ namespace })`), not on the class
  - Can add props/events via contribution
  - `_listenTo(source, event, handler)` — подписка на шину, которая живёт дольше набора (владелец, расширения движка); её снимает `destroy()` базы. См. AGENTS.md, «Плагины и расширения снаружи»

### Доступ к плагинам снаружи

Каждый плагин отдаёт событие `create` с самим собой. Список базовых событий
плагина объявлен **в слое плагинов** — `PLUGIN_EVENTS` в
[base/events.ts](../packages/plugins/src/base/events.ts) — и подмешивается в
contribution каждого плагина явно:

```ts
export const ElementPluginDescriptor = definePlugin({
  ctor: TElementPlugin,
  namespace: 'element',
  contribution: { events: [...PLUGIN_EVENTS, 'ready', 'removed'] },
})
```

Так плагин остаётся единственным источником истины о собственных событиях.
Автоматическая подстановка внутри `definePlugin` (слой setup) была бы магией в
чужом слое, которой нельзя управлять из места объявления.

`install` и `destroy` наружу не выходят — это внутренняя механика bundle.
`create` эмитится не в `install`, а из сборки набора (`TOwnBundle`) и с
задержкой на микрозадачу: на момент установки подписчиков ещё нет, bundle
собирается раньше, чем фреймворк привязывает обработчики. См. «Доступ к
плагинам с обеих сторон» ниже.

`PLUGIN_EVENTS` задаёт не только рантайм, но и типы дескриптора. Вывод
контракта плагина (`TPluginContractFrom`) навешивает namespace на карту плагина без
`TPluginInternalEvents` — это `TPluginEvents` минус `PLUGIN_EVENTS`, — поэтому
`action:install` нет ни в пробросе, ни в `DescriptorAllEvents`.
Сторожит `packages/setup/__tests__/plugin-events.spec.ts`: типы и `getEvents()`
дескриптора проверяются там на одних и тех же именах.

### Plugin Examples

- `TElementPlugin` - Stores DOM element reference, emits 'ready'
- `TActionPlugin` (`custom/action/`, namespace `action`, на `ControlDescriptor`) - взаимодействие
  с пользователем: `press` (нормализованная активация: клик или Enter/Space, с гейтом по
  `disabled`), сырой `click`, `focus`/`blur` и двусторонняя связь `focused` с DOM-фокусом.
  Элемент берёт у `TElementPlugin` через `ctx.get(...)` — композиция, а не наследование
- `TReadyPlugin` - Syncs `IComponentView.ready` with `TElementPlugin` (`ready` / `removed`)
- `TDragPlugin` (`custom/drag-and-drop/`) - DnD handler
- `TInputPlugin`, `TInputBoolPlugin`, `TInputControlPlugin` - Value tracking
- `TIconLayoutPlugin`, `TSpinnerLayoutPlugin`, `TSkeletonLayoutPlugin`, `TFrameLayoutPlugin` - UI-specific layout
- `TCollectionBundlesPlugin` (`custom/collection/bundles.plugin.ts`) - реестр item-bundles (uid → IPluginBundle) + ссылка на движок (`engine`)
- `TCollectionBundlesAccess` / `TCollectionElements` (`custom/collection/`) - доступ к bundles / DOM-элементам (не накапливают; element лежит в bundle, instance в движке)

### Key Files

- [base/base.class.ts](../packages/plugins/src/base/base.class.ts) - TBasePlugin base
- [base/bundle.class.ts](../packages/plugins/src/base/bundle.class.ts) - TPluginBundle registry
- [custom/element/element.plugin.ts](../packages/plugins/src/custom/element/element.plugin.ts) - DOM binding
- [custom/input/input.plugin.ts](../packages/plugins/src/custom/input/input.plugin.ts) - Value tracking
- [custom/collection/bundles.plugin.ts](../packages/plugins/src/custom/collection/bundles.plugin.ts) - Collection bundles registry

### Key Exports

- `IPlugin<TInstance, TEvents>` - Plugin contract
- `TBasePlugin` - Base class
- `TPluginBundle` - Registry
- `IPluginContext` - Plugin install context

---

## Layer 5: Adapter Context (`packages/setup/protected/adapter/context`)

### Role

**Headless runtime container** that:

1. Assembles the component for one mount: instance, plugin bundle (own or shared), members of the exchange, initial values of props
2. Holds the assembled component together with the adapter extensions
3. Hands the framework an exchange (`connect(profile)`), binds the root DOM node to `TElementPlugin` and tears everything down on `destroy()`

### IAdapterContext (Registry Pattern)

```
instance, bundle, descriptor, props, embedded, events
connect(profile) → TExchange (state, inputs, events, forward)
use<T>(ExtensionCtor, options?) → this
get<T>(ExtensionCtor) → T | undefined
bindElement(element | null) → void (root node ↔ TElementPlugin; no-op without the plugin)
destroy() → void (emits 'destroy', forgets extensions, destroys its own bundle)
```

Расширения регистрируются по самому классу (без `static readonly key = Symbol(...)`) — карта расширений (`_extensions` в `TAdapterContext`) ключуется конструктором, как `TPluginBundle` ключуется `IPluginConstructor`.

`bindElement` — метод контекста, а не расширение: связку корня с `TElementPlugin` зовут все шесть адаптеров, а расширение каждый из них был бы обязан помнить и подключать. У компонента без этого плагина вызов ничего не делает.

Тип контекста — `IAdapterContext<C>`, где `C` — контракт дескриптора (`IComponentContract`): его выводит `createAdapterContext`. Инстанс контекста сводится из двух источников — `ctor` дескриптора и `ctrl`: адаптер объявляет `ctrl` интерфейсом ядра (`IButton`), класс дескриптора его реализует, и контекст обещает интерфейс. `useAdapter` всех адаптеров берёт из контракта инстанс, а React, Solid, Svelte и Vue — ещё и выходы плагинов (`TAdapterState<C>`, у Vue `TBinding<C, TProps>`); дженерики компонент не пишет (AGENTS.md, «`any`: где он честный»). Расширение объявляет, какой инстанс ему нужен, через `TInstanceContext<TInstance>`.

### Adapter Layers

#### Assembly (`createAdapterContext`)

Six steps, top to bottom, in one function:

1. `instance` — `ctrl` or `new ctor(props, options)`; `embedded` — from the options or from the `embedded` prop
2. the bundle tenancy (`IBundleTenancy`) — the one fork of the assembly, nobody else asks «whose bundle is it»:
   - `TOwnBundle` — installs the descriptor plugins, creates `TExternalPlugins`, and in `complete()` installs the app registrations (`usePlugins`, `useTheme`) and announces the bundle (`bundle:create` and the plugins' `create` go out on a microtask; a bundle destroyed before it is never announced); on `destroy()` unbinds the root node before destroying the bundle
   - `TSharedBundle` — not our bundle: the owner's (`config.bundle`: a collection facade shares the component's bundle) or none at all. Members are the descriptor plugins found in it; every other step is empty — the owner of the bundle did it
3. members of the exchange — the instance (its props without `ctrl`, `embedded`, `pluginProps`), then what the tenancy gives: descriptor plugins and, for an own bundle, the binding itself (`TExternalPlugins`, the owner of `pluginProps`)
4. initial values — here and only here, the same for all six adapters: an own instance got the core props through the constructor and they are not written again, an external `ctrl` and the members of an own bundle get them through `TLine.seed` — the setter (which emits the trigger) gets every prop that differs from the declared default. Names are in the common format (`CommonProfile`): a prop name is the same in every framework
5. `tenancy.complete()` — registry plugins and the announcement

#### External plugins (`TExternalPlugins`)

Owns the `pluginProps` prop and emits `plugin:event`. It has no write, reset or relay rules of its own: for every arriving plugin with a contract (`pluginContractOf`) it creates the same `TExchange` that serves the component — with the common profile, the bag as its «framework props» and the envelope on the instance bus as its event sink. It subscribes to the bundle after the descriptor plugins and before the registry ones, so a registry plugin and a plugin installed later from `bundle:create` arrive by the same `use` event.

#### Extensions (`packages/setup/content/extensions/`)

- `TCollectionExtension` - Provides child registration via elevator
- `TCollectionItemExtension` - Child registers itself with parent
- `TDragAndDropExtension` / `TDragAndDropCollectionExtension` - Drag/drop context and `TDragPlugin` activation
- `TTabsContentBindingExtension` - Binds `Tabs.Content` to its tab by `value`

#### Elevator (`packages/setup/protected/adapter/elevator/`)

- **TElevator** (base) - Caches string/symbol keys to unique symbols
- **Pattern**: Abstracts parent-child context passing
- Implementations live in the adapters: `TVueElevator` (provide/inject), `TReactElevator` (React Context), `TSvelteElevator` (`setContext`/`getContext`), `TSolidElevator` (`createContext`/`useContext`), `TAngularElevator`; Web Components have none

### Key Files

- [context/create-adapter-context.ts](../packages/setup/protected/adapter/context/create-adapter-context.ts) - Factory: the six assembly steps
- [context/adapter-context.class.ts](../packages/setup/protected/adapter/context/adapter-context.class.ts) - TAdapterContext: `connect`, extensions by class, `bindElement`, destroy
- [context/own-bundle.class.ts](../packages/setup/protected/adapter/context/own-bundle.class.ts) / [context/shared-bundle.class.ts](../packages/setup/protected/adapter/context/shared-bundle.class.ts) - Bundle tenancy (`IBundleTenancy`)
- [context/external-plugins.class.ts](../packages/setup/protected/adapter/context/external-plugins.class.ts) - `TExternalPlugins`: `pluginProps` and `plugin:event` of plugins installed from outside
- [context/types.ts](../packages/setup/protected/adapter/context/types.ts) - IAdapterContext contract
- [surface/surface.class.ts](../packages/setup/protected/adapter/surface/surface.class.ts) - `TSurface` (Layer 5b)
- [elevator/elevator.class.ts](../packages/setup/protected/adapter/elevator/elevator.class.ts) - Base elevator
- [extensions/collection/collection.extension.class.ts](../packages/setup/content/extensions/collection/collection.extension.class.ts) - Collection registry

### Key Exports

- `IAdapterContext<C>` - Container contract; `C` — контракт дескриптора. `TContextContract<TInstance, TPlugins>` и `TInstanceContext<TInstance>` — контракт и контекст, про которые известен только инстанс (так расширение объявляет, с чем работает)
- `IAdapterContextOptions` / `IAdapterContextConfig` - `ctrl`, `props`, `options`, `embedded` / a shared `bundle`
- `createAdapterContext(descriptor, options, config?)` - Factory; the context type is inferred from the descriptor
- `TElevator` - Parent-child context base
- Extension classes

---

---

## Layer 5b: Общий слой адаптеров (`packages/setup/protected/naming`, `packages/setup/protected/adapter/surface`, `packages/setup/protected/adapter/exchange`, `packages/setup/protected/adapter/common`)

Поведение, которое обязано совпадать во всех фреймворках. Адаптер задаёт
только то, что действительно различается: профиль (стратегия имён событий и
слот по умолчанию), куда писать значение, как отдать событие и в какой момент
своего цикла это делать. Своих циклов по свойствам у адаптеров нет.

| Что                                   | Назначение                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `underscorePropNaming(name)`          | Имя пропа: `ns_name`. Одинаково везде — публичный API компонентов должен читаться одинаково на всех фреймворках.                                                                                                                                                                                                                                                                                                                                     |
| `callbackEventNaming(name)`           | Событие колбэк-пропом: `element:ready` → `onElementReady` — у React, Svelte и Solid. Тип-зеркало — `TCallbackEventProps`.                                                                                                                                                                                                                                                                                                                            |
| `IAdapterProfile`                     | Профиль фреймворка: стратегия имён и слот по умолчанию, одна константа на адаптер (`VueProfile`, `ReactProfile`, …). `CommonProfile` — общий формат: ключи `pluginProps`, имя в конверте `plugin:event`, начальные значения сборки.                                                                                                                                                                                                                  |
| `TSurface.of(descriptor, profile)`    | Поверхность — публичный API компонента в именах фреймворка: пропы, события, умолчания, съеденные имена. Одна на пару «описание × профиль»; из неё берут статический слой (`props`/`emits` Vue, `observedAttributes` Web Components, кодоген Angular) и обмен. Записи ссылаются на `TPropSpec`, копий умолчаний нет.                                                                                                                                  |
| `adapter.connect(profile)`            | Обмен на монтирование (`TExchange`): состояние для фреймворка (`state.subscribe` / `state.getSnapshot` — подписка сразу отдаёт каждое свойство тем же вызовом, что и триггер), входы (`inputs.full` / `inputs.delta` / `offer` одного пропа), проброс событий и моделей (`events.listen`), спред несъеденных пропсов (`forward`). Начальные значения не пишет — их применила сборка; память входов начинается с пропсов, с которыми собран контекст. |
| `adapter.bindElement(el)`             | Корневой узел ↔ `TElementPlugin`; метод контекста (Layer 5).                                                                                                                                                                                                                                                                                                                                                                                         |
| `toInstanceState` / `TAdapterState`   | Граница рантайма и типа для `state` адаптеров: свойства инстанса и выходы плагинов после `valueOf()`.                                                                                                                                                                                                                                                                                                                                                |
| `setIcons` / `getIcon` / `ICON_ROLES` | Реестр и контракт пакетов иконок; живёт в `protected/registry/`, список ролей — в `content/icons/`.                                                                                                                                                                                                                                                                                                                                                  |

Таблица не полная: слоты (`resolveSlotName`, `DEFAULT_SLOT`), `withParts` и правила связки — AGENTS.md, «Что общее, а что специфично для фреймворка».

### Пакеты иконок — контракт, а не мешок SVG

Иконки устроены как темы: библиотека объявляет, что ей нужно, а пакет это
реализует. Контракт — закрытый список ролей `ICON_ROLES`
(`check`, `checkIndeterminate`, `close`, `arrowDown`, `arrowRight`,
`moreHoriz`); пакет обязан закрыть их все, это проверяет conformance-тест.

Иконка приходит **данными**, не разметкой:

```ts
export type TIconSource = {
  viewBox: string // система координат
  body: string // содержимое <svg>, без самого тега
}
```

`body` без корневого `<svg>` — потому что корень строит адаптер: только так он
может задать размер, `aria-hidden` и классы.

Формат выбран под два ограничения, оба вскрылись на разборе прежнего решения:

**Никакой магии сборщика.** `@soldy-ui/icons` экспортировал
`import './close.svg?raw'` — синтаксис Vite. Внутри монорепы это работало,
потому что всё крутится на Vite и иконки использует один адаптер; опубликуй
пакет — и потребитель на webpack, rspack или в Node получил бы ошибку
разрешения модуля. Теперь пакет — обычный JS-модуль с данными.

**Никакого рантайм-компилятора.** `useIconImport` делал
`defineComponent({ template: svg })`, а `template` требует компилятор шаблонов
— из-за чего в конфиге Vue стоял алиас `vue/dist/vue.esm-bundler.js`. То есть
иконки навязывали полный билд Vue каждому приложению и ломались при CSP без
`unsafe-eval`. Теперь адаптер строит разметку через `h()`.

Подключает пакет **приложение**, как тему — библиотека не тянет его в
зависимости:

```ts
setIcons(material)
setIcons({ close: myCloseIcon }) // точечно, поверх
```

Незарегистрированная роль даёт пустую заглушку и одно предупреждение в консоль.
Исключение бросать нельзя: из-за одной иконки упало бы всё приложение.

Пакет (`packages/icons/material/`): SVG в `src/*.svg` правятся глазами,
`src/index.ts` генерируется и коммитится — как метаданные Angular. Генератор
снимает `fill="#…"`, иначе иконка не наследует `currentColor`.

### Тёмная схема: инвертируется шкала, а не компоненты

Ниже — решения темы `oren`, не контракт библиотеки: за границей BEM-классов
тема вольна устроить палитру как угодно. Записано здесь потому, что случай
показательный, а вскрывшиеся ловушки Tailwind достанут любую тему на нём.
Рабочая инструкция — `packages/themes/oren/AGENTS.md`.

Наивный подход к тёмной теме — дописать в каждый компонент блок
`[data-theme='dark'] &` с другими значениями. В трёх миксинах `themes/oren`
такой TODO и лежал: «то же самое, но ступень −100 вместо +100». Это одна мысль,
размазанная по пяти файлам, — ровно то, против чего правило про адаптеры.

Вместо этого номер ступени переопределён как **роль, а не светлота**:

| Ступень       | Роль                                                       |
| ------------- | ---------------------------------------------------------- |
| `50`          | поверхность (страница, панель)                             |
| `100` / `200` | приподнято на шаг: hover, контейнер, поверхность контрола  |
| `300` / `400` | границы                                                    |
| `500`         | приглушённый текст; точка симметрии — ~0.55 в обеих схемах |
| `800`         | основной текст                                             |
| `950`         | максимальный контраст с поверхностью                       |

`tokens-dark.css` инвертирует шкалу по этим ролям. После этого арифметика
`$hover-bg: $bg + 100` в миксинах в обеих схемах значит одно: «отойти дальше от
поверхности». В светлой это темнее, в тёмной светлее, а SCSS не меняется вовсе
— компонентные стили о схеме не знают.

**Значения не зеркальны механически.** Перестановка `50 ↔ 950` даёт плохой
результат: тёмному интерфейсу нужны сжатые тёмные ступени (глаз хуже различает
разницу внизу светлоты) и меньшая цветность на светлых концах, иначе светлый
текст отдаёт краской. Зеркальны роли, числа подобраны отдельно — так же
устроены dark-шкалы Radix Colors.

**У хроматических шкал зеркальны только концы.** Середина (500–700) в обеих
схемах остаётся насыщенной заливкой, на которой держится `text-white` у
вида `filled` у Button. Инвертируй её вслед за нейтралью — hover увёл бы заливку в
светлую пастель, и подпись стала бы нечитаемой. Меняется только направление
hover: в тёмной схеме заливка светлеет.

**Что не выражается ступенью — семантический токен.** Их пять; в тёмной схеме
переопределяются только те, у кого меняется сам выбор ступени.
`--s-component-text` не переопределяется вовсе: подстановка `var()` происходит
в месте использования, поэтому `var(--s-neutral-800)` сам возьмёт тёмную
ступень. Три новых появились там, где стоял литеральный `bg-white` — он не
инвертируется вместе со шкалой:

- `--s-component-surface` — поверхность контрола (поле, коробка чекбокса,
  «таблетка» Tabs). В светлой схеме белый: ниже страницы уйти нельзя,
  приподняться можно только в белое. В тёмной наоборот — две ступени вверх.
  Асимметрия не небрежность, а то, как работает высота в тёмном интерфейсе;
- `--s-component-knob` — ручка Switch. Отдельно от поверхности, потому что
  обязана контрастировать и с серой дорожкой, и с включённой цветной;
- `--s-component-veil` — вуаль для утопленных вкладок. Единственное, что
  ступенью не выражается вообще: «утопить» значит увести ЗА поверхность, а за
  поверхностью ступеней нет. В тёмной схеме это чистый чёрный.

**Две ловушки Tailwind, обе вскрылись на сборке.**

`border-s` — это `border-inline-start`. Утилита вида
`border-s-<семейство>-<ступень>` разбиралась как «левая граница цветом
`<семейство>-<ступень>` **из палитры Tailwind**», и в собранный CSS попадала
лишняя строка, перекрывающая наш цвет слева:

```css
.s-input--normal {
  border-color: var(--s-neutral-400);
  border-inline-start-color: var(--color-neutral-400); /* палитра Tailwind */
}
```

Девять правил. В светлой схеме молчало: tailwind-серый 0.708 и наш 0.707
неразличимы. В тёмной наш становится 0.4 — и левая граница каждого поля,
чекбокса и таба оказалась бы заметно светлее остальных трёх. Коллизия только у
`neutral`, единственного семейства с именем из палитры Tailwind. Цвет границы
поэтому пишется обычным объявлением, а не через `@apply`.

Вторая: сканер Tailwind читает исходники **вместе с комментариями** и
генерирует утилиты по упомянутым в них именам классов. Комментарий, объясняющий
сломанный класс, сам породил этот класс в `dist`. Так же туда уходили
глобальные `.rounded`, `.outline` и `.ring` из `index.d.ts`, документации и
тестов темы, поэтому поиск классов в теме выключен (`source(none)` в
`src/base.css`, сторож — `tailwind-scan.spec.ts`): стили компонентов собирает
`@apply`, которому поиск не нужен.

**Проверяется** в `themes/oren/__tests__/tokens.spec.ts`: паритет ступеней между
схемами, монотонность (светлая темнеет от 50 к 950, тёмная светлеет) и три
запрета на уровне исходников — палитра Tailwind, `bg-white`, `border-s-`.
Тест выкусывает комментарии перед разбором по той же причине, по которой это
делает описанная выше ловушка.

### Почему связка дедуплицирует события

Один raw-триггер объявлен у нескольких пропов. `present` в
`ComponentViewDescriptor` — производное от `rendered && visible`, поэтому его
`triggers` это `['change:rendered', 'change:visible']`, т.е. те же события, что
у самих `rendered` и `visible`. Наивный обход всех свойств повесил бы две
подписки на `change:rendered`, и потребитель получал бы **два эмита на одно
изменение**. Поэтому `events.listen` связки подписывается на пару «источник,
сырое имя» один раз — одинаково во всех адаптерах.

Дедуплицировать можно **только проброс событий**. Синхронизацию состояния
(`state.subscribe`) — нельзя: `present` обязан пересчитываться на обоих
триггерах.

### Контракт границы: значение, а не ручка на живое состояние

Адаптер узнаёт об изменении по смене идентичности. Поэтому составные props
(объекты, массивы) обязаны пересекать границу как снимок:

- через `valueOf()` — `TClasses.valueOf()` и `TCollectionStorageDriver.valueOf()`;
  `TPropSpec.read` вызывает его сам;
- либо заменой объекта целиком — layout-плагины (`this._styles = {...}`).

Раньше адаптеры компенсировали протечку клонированием (`cloneValue`) с
эвристиками про `Symbol.iterator`, `constructor === Object` и охранниками
`__v_skip`/`render` под Vue. Клонирование удалено: знание о том, что значение
означает, есть только у ядра, и снимок должен делаться там. Проверяется
`packages/setup/__tests__/value-identity.spec.ts`.

Смежный инвариант: `change:*` эмитится только при реальном изменении. Отсюда же
исправление асимметрии `show()`/`hide()` — `show()` эмитил `show:before` до
собственной проверки, что и вынуждало React ставить guard от бесконечного цикла.

### Доступ к плагинам с обеих сторон (`bundle:create`)

В soldy компонентом управляют двумя способами, и они обязаны быть равнозначны:
декларативно (шаблон) и императивно (инстанс). Для props и событий ядра это
выполняется само; для плагинов — нет, потому что bundle создаёт сборка на
монтирование, а не ядро, и с инстанса до него нет пути.

Эмит живёт в сборке набора `TOwnBundle`
([own-bundle.class.ts](../packages/setup/protected/adapter/context/own-bundle.class.ts)), — там же, где
плагины и создаются:

1. `bundle:create` на `instance.events` — единственной шине, видимой обеим
   сторонам. Объявлено в `EntityDescriptor` рядом с `ctrl`: обе половины
   связки адаптера с инстансом.
2. `create` на каждом плагине — через `bundle.created()`: набор объявляет
   плагины в порядке установки, включая поставленные в обработчике
   `bundle:create`. Плагин, поставленный позже, объявляется сразу в `use()`.

Порядок именно такой: обработчик `bundle:create` должен успеть подписаться на
плагинный `create` и поставить свои плагины.

```ts
// сторона инстанса — ни одного упоминания шаблона
btn.events.on('bundle:create', (b) => b.get(TActionPlugin).events.on('press', h))

// сторона шаблона
<Button :ctrl="btn" @bundle:create="onBundleCreate" />
<Button @action:create="$event.events.on('press', onPress)" />
```

Почему событие, а не свойство `btn.plugins`: до монтирования bundle не
существует, и неизвестно, появится ли. Событие говорит об этом честно, свойство
врало бы `null`.

#### Почему bundle не принимается снаружи

Рассматривался и отвергнут вариант с пропом `plugins`, парным к `ctrl`:

```html
<!-- так НЕ делаем -->
<button :ctrl="btn" :plugins="bundle" />
```

Выглядит симметрично, но симметрии нет. `ctrl` необязателен: компонент умеет
построить рабочий инстанс по умолчанию, и переданный снаружи лишь заменяет одно
рабочее состояние другим. Набор плагинов — не параметр, а **инвариант
компонента**: собственные шаблоны адаптеров опираются на конкретные плагины
(`TElementPlugin` для DOM-биндинга, `TActionPlugin` для событий). Приняв bundle
снаружи, библиотека отдаёт пользователю возможность собрать компонент, который
не заведётся, и перестаёт отвечать за его работоспособность.

Инвариант зафиксирован в коде: набор собирает только сборка, по составу
(`protected/adapter/context/own-bundle.class.ts`), и наружу отдаётся доступ к **уже созданному** —
через `bundle:create` и `<ns>:create`. Плагин из реестра приложения состав
только дополняет: класс, который уже входит в состав компонента, — ошибка
сборки.

`engine` у коллекций, в отличие от bundle, пропом принимается — как `ctrl`:
фасад сам дополняет переданный движок недостающими расширениями
(`resolveEngine` в `core/src/components/base/collection/create/internal.ts`),
так что инвариант держит компонент, а не тот, кто собирал движок.

Отсюда правило: **bundle всегда собирается внутри, наружу отдаётся доступ к уже
созданному.**

Цена — `bundle:create` идёт по шине core, хотя плагины лежат слоем выше. Это
осознанное исключение, а не протечка зависимости: шина работает транспортом,
`packages/core` не импортирует `@soldy-ui/plugins`. Имя события ядро объявляет в
закрытой карте `TComponentEvents` с аргументом `unknown` — тип бандла ему
неизвестен, — а в список событий дескриптора его вносит `EntityDescriptor`
(слой setup).

Почему в сборке набора, а не отдельным шагом в каждом адаптере: параллельный
механизм пришлось бы помнить и вызывать вручную в шести (а дальше — в семи)
местах. Здесь он срабатывает сам, потому что стоит там, где плагины рождаются.

Почему микрозадача, как у `engine:create`: адаптер подписывается на события уже
после того, как получил bundle из `createAdapterContext`, поэтому синхронный
эмит уходит в пустоту. Проверено — при синхронном эмите падают 8 тестов в
setup/vue/svelte/solid.

### Пропсы и события плагина, поставленного снаружи

Поверхность компонента одна на тип, и объявляет её дескриптор. Плагин снаружи
(`usePlugins` при сборке или `bundle.use` позже) в неё не входит: статический
слой Vue, Angular и Web Components объявлен раньше регистрации. Поэтому у всех
компонентов есть один проп и одно событие на все внешние плагины — из
`EntityDescriptor`, рядом с `ctrl` и `bundle:create`:

- `pluginProps` — значения по имени пропа: `{ timer_ms: 500 }`;
- `plugin:event` — конверт `{ name: 'timer:tick', args }` (`TPluginEvent` в
  `TComponentEvents`), на шине инстанса, как `bundle:create`.

Контракт плагина (`definePlugin`) записывается за его классом
(`pluginContractOf`). Связка (`TExternalPlugins` в `protected/adapter/context/`) подписана на `use` и
`remove` набора (`TPluginBundle.events`) и подключает плагин одинаково, когда
бы тот ни встал: значения из `pluginProps` применяются по правилу сборки
(только отличное от умолчания), ключ пропал — проп возвращается к умолчанию,
события плагина уходят конвертом. `pluginProps` — обычное свойство этого
участника: линия обмена пишет в него, а не в инстанс, и на каждый плагин
заводится тот же `TExchange`, что обслуживает компонент. Подробности и правила — AGENTS.md,
«Внешний плагин: пропсы — `pluginProps`, события — `plugin:event`».

Проверяется `packages/setup/__tests__/plugins-access.spec.ts` и
`packages/ui/vue/__tests__/action.spec.ts`.

### Нейминг компонентов: часть или слот

Публичное имя компонента не префиксуется (`Button`, `Tabs`, `TabsItem`):
пространство имён уже даёт npm-скоуп. Префикс `s-`/`soldy-` стоит ровно там,
где пространство имён глобальное и другого способа нет — CSS-классы, теги
Custom Elements, селекторы Angular. `SButton` в стиле PrimeVue дублировал бы
импорт.

Для составных компонентов действует критерий:

> **Часть становится отдельным компонентом, только если её адресует
> потребитель — размещает в разметке или задаёт ей пропсы. Если у неё только
> позиция, это слот или разметка внутри шаблона.**

Формулировка уточнена практикой. Сначала критерий звучал как «сущность в ядре,
собственное состояние **или `id` для ARIA-связки»** — и не выдержал двух
случаев подряд: `id` есть и у панели Accordion, и у списка Select, но
компонентами мы их не сделали. `id` оказался условием необходимым, но не
достаточным: он появляется у всего, на что кто-то ссылается, а компонентом
вещь делает то, что её размещают снаружи.

Критерий выведен из модели soldy, а не взят у Ark UI. Ark-таксономия
(`Root`/`List`/`Trigger`/`Content`/`Indicator`/`Label`/`Positioner`/`Backdrop`)
описывает библиотеку **без слотов**, где композиция возможна только частями. У
soldy слоты есть, поэтому позиционные части избыточны — иначе получилось бы два
способа делать одно и то же.

Второе расхождение важнее: у Ark табы не коллекция, поэтому у них `Trigger`. В
soldy табы — коллекция: владельца в ней представляет `TTabsCollectionFacade`
(`TCollectionComponent`), таб — `TTabsItemCollectionFacade`
(`TCollectionItemComponent`), есть движок с расширениями (`activation`, `order`),
`engine:create` и реестр `TCollectionBundlesPlugin` по `uid`. Здесь часть — это
`Item`; `Trigger` создал бы вечное расхождение публичного API и ядра.

Прогон критерия:

| Часть                                      | Адресует потребитель                   | Решение                     |
| ------------------------------------------ | -------------------------------------- | --------------------------- |
| `Tabs`                                     | да                                     | компонент                   |
| `TabsItem`                                 | да — размещает и задаёт `value`/`text` | компонент                   |
| `TabsContent`                              | да — `<Tabs.Content value="a">`        | компонент                   |
| `SelectItem`                               | да                                     | компонент                   |
| панель Accordion                           | нет — только содержимое в слот         | слот + проп `content_aria`  |
| список Select                              | нет — он всегда один и внутри          | разметка + проп `list_aria` |
| список табов                               | нет                                    | слот                        |
| `CheckBox.Control` / `Indicator` / `Label` | нет                                    | слоты                       |
| `Button.*`                                 | —                                      | частей нет                  |

Следствие для ARIA. У части-компонента есть экземпляр, значит есть и живой
набор `aria`, в который пишут ядро, плагины и расширения. У разметки без
компонента экземпляра нет — писать некуда, и её атрибуты отдаются пропом. Это
не исключение из правила «пишем в набор», а его граница.

Машин состояний это не вводит: части остаются подклассами
`TCollectionItemComponent` / `TComponentView`, проводка идёт через
существующий элеватор и `TCollectionBundlesPlugin`.

#### Точка — основная форма записи

`withParts` ([adapter/common/parts.ts](../packages/setup/protected/adapter/common/parts.ts)) вешает
части на владельца:

```ts
export const Tabs = withParts(TabsComponent, { Item: TabsItem, Content: TabsContent })
```

Плоские имена приходится держать согласованными вручную, и один раз это уже
разъехалось: владелец `Tabs`, а элемент назывался `TabItem` — единственное
число против множественного. `Tabs.Item` / `Tabs.Content` согласованы по
построению, потому что префиксом служит сам владелец.

Плоские экспорты остаются: они нужны в Angular и Web Components, где компонент
адресуется строкой (`<soldy-tabs-item>`), и как запасной путь импорта.
Владелец мутируется намеренно: копия разъехалась бы по идентичности с тем, что
экспортирует файл компонента.

**Ограничение Vue.** Точка резолвится только компилятором SFC, который видит
импорт как биндинг области видимости. Рантайм-компилятор (строковый `template`
и регистрация через `components: {}`) ищет `Tabs.Item` как имя в реестре, не
находит и рендерит пустоту — молча. Проверяется в
`packages/ui/vue/__tests__/parts.spec.ts`, включая сам факт ограничения.

### Нейминг коллекций и их частей

Владелец во множественном числе, если элементов много (`Tabs`), в единственном
— если коллекция сама по себе одна сущность (`ListBox`, `Accordion`). Часть
всегда `Item`, независимо от числа владельца.

| Коллекция   | Части                       | Почему так                                                           |
| ----------- | --------------------------- | -------------------------------------------------------------------- |
| `Tabs`      | `Tabs.Item`, `Tabs.Content` | панель — сосед списка, пишется отдельно, связывается по `value`      |
| `Accordion` | `Accordion.Item`            | панель внутри элемента, отдельно не существует → слот `item-content` |
| `ListBox`   | `ListBox.Item`              | панели нет вовсе: выбор ничего не раскрывает                         |

**Набор частей выводится из критерия, а не копируется между коллекциями.**
Панель есть и у Tabs, и у Accordion, но частью стала только у Tabs: у Accordion
она не имеет собственной идентичности — не существует отдельно от элемента и
не может быть сопоставлена другому. Одинаковый набор частей у всех коллекций
был бы признаком того, что критерий не применяли.

ARIA-связка при этом нужна обеим. У Tabs её потребляют два разных компонента
(`Tabs.Item` и `Tabs.Content`), у Accordion — один шаблон элемента, где рядом
лежат заголовок и панель. Формулу идентификаторов в обоих случаях держит
расширение `content`, и сторону таба или заголовка оно само пишет в `aria`
элемента. Сторону панели отдаёт его item-адаптер: у `Tabs.Content` экземпляр
есть, и в его `aria` её кладёт `TTabsContentBindingExtension`; у панели
Accordion экземпляра нет, и фасад отдаёт её пропом `content_aria`.

#### Слоты элементов: статические имена со scope

Когда элементы заданы пропом `items`, владелец рендерит их сам, а содержимое
берёт из слотов `item-<что>`, передавая элемент через scope:

```html
<slot name="item-leading" :item="item" />
<slot name="item" :item="item" />
<slot name="item-trailing" :item="item" />
<slot name="item-content" :item="item" />
<!-- Accordion: панель -->
```

Динамических имён (`item:${item.value}:leading`, `panel:${value}`) быть не
должно: их резолвит только Vue. Адресация конкретного элемента — условием
внутри слота по `item.value`.

### Коллекции: три слоя и расширения

Самая частая ошибка — смешать слои; она уже приводила к переписыванию.

| Слой            | Отвечает за                                  | Пример                                                          |
| --------------- | -------------------------------------------- | --------------------------------------------------------------- |
| Класс ядра      | собственные props и events                   | `TTabsItem` — `value`, `text`, `closable`                       |
| Фасад коллекции | членство в коллекции                         | `TTabsItemCollectionFacade` — `active`, `order`, `tab_closable` |
| Расширение      | функциональность сверх стандартной коллекции | `TTabsExtension` — закрытие вкладок                             |

**Класс ядра о коллекции не знает.** Ни движка, ни `bindEngine`, ни активности.
Если классу «нужен доступ к коллекции» — логика оказалась не в том слое.
`TTabsContent` держит только `value`; активность держит
`TTabsContentCollectionFacade` (через контекст связанного таба), ровно как
`active`/`order` у элемента держит `TTabsItemCollectionFacade`, а сторону
панели в её `aria` кладёт `TTabsContentBindingExtension`.

#### Базы фасадов: наследуется проекция, а не поведение

Фасады появились потому, что коллекции на классическом ООП перестали
масштабироваться: движок с расширениями заменил иерархию, но под адаптеры
понадобилась обёртка, читаемая как обычный компонент. Когда фасадов стало
пять, они начали дублировать друг друга — и база у них снова наследование.

Ту же ошибку это не повторяет по одной причине: **фасад ничего не делает
сам**. Он выставляет наружу то, что уже умеет расширение, поведение остаётся
в композиции. Отсюда правило: иерархия фасадов повторяет **состав
расширений**, а не таксономию компонентов.

```
TCollectionComponent
└── TBatchCollectionFacade          batch      → Tabs
    └── TSelectionCollectionFacade  + selection → Accordion, Select, ListBox, Tags

TCollectionItemComponent
└── TOrderItemFacade                order      → Tabs.Item
    └── TSelectionItemFacade        + selected → Accordion/ListBox/Select/Tags.Item
```

У табов активность, а не выбор, поэтому базы выборки они не наследуют. Базы
под активацию нет: реализация одна, и заводить её под единственного
потребителя значило бы подстраиваться под неизвестное требование.

Правило держится на типах: дженерик базы сужен до расширения, которое она
потребляет, поэтому наследование без расширения не компилируется. Тип элемента
внутри расширения при этом `any` — расширения инвариантны по элементу
(методы и принимают его, и возвращают), и `TItem` рвал цепочку List → ListBox
(слой `TList` с тех пор слит с ListBox, см. «ListBox (после слияния с `TList`)»).
Требование «расширение должно быть» от этого не слабеет; теряется сверка типа
элемента, которой и раньше не было.

Побочно ушли приведения: `this.extensions.batch as unknown as TBatchExtension<TItem>`
в фасадах List и Select и `adapters as unknown as TListAdapters` в item-фасаде
— проверка в этих местах была просто выключена.

#### Карта событий item-адаптера инвариантна

Последнее приведение (`adapters.list.events as any` в фасаде элемента ListBox)
оказалось не мелочью, а симптомом: **наследник, добавивший своё событие, не
подходил под контракт родителя**. Ниже разбор, потому что то же самое ждёт
каждую следующую коллекцию.

`TListBoxItemEventsExtension` — надмножество `TListItemEventsExtension`, и
интуиция говорит, что «более широкий» эмиттер должен подходить туда, где ждут
узкий. Не подходит ни в одну сторону, потому что в `TEvented<TEvents>` карта
стоит сразу в двух позициях:

```ts
type TEventContext<TEvents, K extends keyof TEvents = keyof TEvents> = {
    event: K                        // выход → ковариантно
    args: Parameters<TEvents[K]>
}
on<K extends keyof TEvents>(event: K, handler: TEvents[K]): void    // вход → контравариантно
```

TypeScript помечает такой параметр **инвариантным**, и отношения «шире/уже»
между `TEvented<A>` и `TEvented<B>` не существует вовсе. Компилятор это и
печатал, докопавшись до `use`:

```
Type 'TEventContext<TListBoxItemEventsExtension, "change:view" | "destroy" | "change:wordWrap">'
  is not assignable to type 'TEventContext<TListItemEventsExtension, "destroy" | "change:wordWrap">'
```

**Что оказалось решением.** Не «параметризовать всё подряд» — базовые
контракты (`IItemExtension`, `IItemExtensionCtor`, `IExtensionItems`) уже были
параметризованы. Ломались **констрейнты**, подставлявшие узкий набор по
умолчанию: `TItemExt extends IListItemExtension<TItem>` требовал ровно
`TListItemEventsExtension`.

Правило: **в констрейнтах `<…, any>`, в инстанцировании — точный набор.**
Констрейнт отвечает на вопрос «есть ли у тебя эмиттер», а не «ровно ли такой»;
сверять там карту не нужно и вредно, потому что инвариантность запрещает любое
расхождение. Точность остаётся там, где от неё есть польза, — в самом
`extends TListItemExtension<TItem, TParent, TListBoxItemEventsExtension>`.

Правок вышло семь: `IItemExtensionCtor`, `IExtensionItems`,
`IBaseOwnerItemExtensionOptions`, `TBaseOwnerItemExtension` в базе плюс
`IListItemExtension`, `IListExtension`/`IListExtensionOptions`,
`TListItemExtension` и `TListExtension` на уровне компонента. После этого
`as any` снялся, а опечатка в имени события снова ловится — вплоть до
подсказки «Did you mean "change:view"?».

> Имена `TList*` здесь исторические: слой `TList` позже слился с `TListBox`
> (см. «ListBox (после слияния с `TList`)»). Правило про констрейнты от этого
> не изменилось — оно и сейчас держит `change:view` у `TListBoxItemExtension`.

**Что нашлось при разборе.** Одно свойство писалось в трёх фасадах по
отдельности, и три копии дали три разных API:

| Фасад                        | `mode`        | `selected`    |
| ---------------------------- | ------------- | ------------- |
| `TAccordionCollectionFacade` | только getter | только getter |
| `TListCollectionFacade`      | get + set     | get + set     |
| `TSelectCollectionFacade`    | get + set     | только getter |

Contributions при этом объявляют `mode` записываемым пропом. Итог:
`<Accordion mode="multiple">` молча не работал — вторая раскрытая секция
закрывала первую. Причём харнесс `Accordion.test.vue` использует
`mode="multiple"` и всё это время проверял поведение, которого не было.

Отсюда `setup/__tests__/facade-props.spec.ts`: у каждого объявленного
записываемого пропа обязан быть сеттер в цепочке прототипов фасада. Проверяется
контракт против класса, а не реализация против самой себя.

#### Когда заводить расширение

Стандартный набор — `core/src/components/base/collection/engine/extension/`
(`plain`, `batch`, `activation`, `selection`, `value`, `order`, `unique`,
`meta`, `factory`, `filter`). Своё
расширение заводится, **когда конкретной коллекции нужна функциональность сверх
стандартной**, а не чтобы куда-то положить код.

Каждое — своя папка в `<component>/collection/extensions/<name>/` и пара внутри:
расширение коллекции (`TBaseOwnerItemExtension`, его `readonly name` становится
ключом в `extensions`) и item-адаптер (`TBaseItemExtension`) в подпапке `item/`.
Подключается в `collection/factory.ts`, объявляется в `collection/types.ts`.

```
tabs/collection/extensions/
  tabs/        закрытие вкладок, hasEnabledTabs
    tabs.extension.ts
    item/item.extension.ts           closable = !disabled && (item ?? parent)
  content/     связка «таб ↔ панель»
    content.extension.ts
    item/item.extension.ts           tabAria и panelAria
```

#### Логика, которой нужен элемент, живёт в item-адаптере

У адаптера есть `_item` и `_parent`, поэтому там считается всё, что зависит от
элемента. **Формула парной связки живёт в одном месте** — в родительском
расширении:

```ts
// TTabsContentExtension
tabId(item)   { return `s-tab-${item.uid}` }
panelId(item) { return `s-tabpanel-${item.uid}` }
```

`aria-controls` таба и `id` панели — один идентификатор. Разнеси формулу по
файлам, и половинки однажды разойдутся; тест на это должен ломать **одну**
сторону, иначе он вакуумный.

Props фасада префиксуются (`tab_closable`): в шаблоне значения двух
adapter-контекстов сливаются в один объект, и одноимённые затирают друг друга.

#### ARIA: что знает элемент, а что коллекция

`TTabsItem` пишет в свой `aria` только `role: 'tab'` — единственное, что таб
знает о себе. `id` и `aria-controls` предполагают существование панели, о
которой знает коллекция: их проставляет `TTabsContentExtension` при добавлении
элемента. `aria-selected` пишет `TTabsExtension` по событию активации — у
неактивных `"false"`, а не отсутствует: скринридер объявляет «1 из 5, не
выбрана», и для этого атрибут нужен на всех табах набора.

Почему не в `TActivationExtension`: оно общее для всех коллекций, а
«выбранность» выражается по-разному — у таба `aria-selected`, у заголовка
Accordion `aria-expanded`. Атрибут знает паттерн, а не механизм активации.

Сторона панели (`role="tabpanel"`, `id`, `aria-labelledby`) пишется
`TTabsContentBindingExtension` в adapter-слое: это единственное место, где
известно, что панель нашла свой таб.

### Слоты — третья категория контракта

Ark UI даёт одинаковую структуру во всех фреймворках через вложенные
compound-компоненты (`Checkbox.Root` / `Checkbox.Control`). soldy сознательно
выбрал плоскую структуру и нативный HTML, но одинаковость структуры сохранить
хочет. Раньше её не было: слоты существовали только как разметка в 15
Vue-шаблонах (41 объявление), и ни один другой слой о них не знал.

Теперь `IContribution` имеет третье поле рядом с `props` и `events`:

```ts
// descriptors/components/button.descriptor.ts
export const ButtonDescriptor = defineDescriptor(() =>
  defineComponent({
    // …
    contribution: {
      slots: {
        leading: { description: 'Перед текстом' },
        default: { scope: { text: defineType<string>(String) } },
        trailing: { description: 'После текста' },
      },
    },
  }),
)

// DescriptorSlots<typeof ButtonDescriptor>
//   → { leading: TEmptySlotScope; default: { text: string }; trailing: TEmptySlotScope }
```

Дескриптор несёт слоты в контракте (`IComponentContract.slots`), отдаёт их
полем `slots`, а тип — extractor `DescriptorSlots<T>`. Слоты наследуются с перекрытием по имени:
`ComponentView` объявляет `default`, а `Button` уточняет его, добавляя scope.

Тип слотов `defineComponent` выводит из самого объявления: свои слоты поверх
слотов `extends`, как `mergeSlots` в рантайме. Значение scope — `defineType<T>`,
из него берётся тип данных слота; значение без типа (`String`) не компилируется.
Раньше рядом с объявлением лежал тип-зеркало `TButtonSlots`, и зеркала
расходились с объявлением молча — у части дескрипторов их не передали вовсе, и
наследники теряли в типах унаследованный `default`.

Слоты **не получают namespace**, в отличие от props и events плагинов: они
принадлежат компоненту, а плагин не рендерит и слотов не имеет.

#### Почему нет универсального `<Slot name>`

Напрашивается единый синтаксис `<Slot name="leading">…</Slot>` во всех
фреймворках. Он невозможен по двум независимым причинам.

**Svelte 5.** `children` — непрозрачная snippet-функция; узлы появляются только
после отрисовки, сканировать нечего. Перенос DOM после монтирования не спасает:
содержимое с `{#if}`/`{#each}` пересоздаётся в исходном контейнере, а не в
перенесённом месте.

**Scoped-слоты.** `<Slot>` с обычным содержимым принципиально не умеет
передавать данные внутрь — содержимое компилируется в области потребителя, где
значений ещё нет. Данные принимает только функция, а это и есть родные
механизмы каждого фреймворка.

Посылка «в других фреймворках нет Slot API» верна лишь про синтаксис:
именованные и scoped-слоты есть везде, кроме Web Components (там нет способа
передать данные в световое содержимое). Поэтому одинаковы **имена, состав и
scope**, а спеллинг остаётся родным:

| Адаптер  | Спеллинг                | scope                         |
| -------- | ----------------------- | ----------------------------- |
| Vue      | `<template #leading>`   | `v-slot="{ text }"`           |
| Svelte 5 | `{#snippet leading()}`  | параметр сниппета             |
| React    | `leading={<Icon/>}`     | `{({ text }) => …}`           |
| Solid    | `leading={<Icon/>}`     | `{({ text }) => …}`           |
| Angular  | `<span slot="leading">` | `<ng-template slot let-text>` |
| WebC     | `<span slot="leading">` | ✗                             |

`default` → `children` в React/Solid/Svelte (`resolveSlotName`), в остальных
сохраняется. Это единственное преобразование имени.

#### Реализация по адаптерам

- **Vue** — ничего не потребовалось: разметка уже верна, а `vue-tsc` выводит
  типы слотов из самого шаблона. Соответствие контракту проверяет тест,
  разбирающий `.vue`-файл.
- **React / Solid** — слоты как props; `renderSlot(content, scope)` разворачивает
  содержимое. В Solid проверка на функцию идёт по арности (`content.length > 0`):
  `JSX.Element` тоже бывает функцией, но вызывается без аргументов.
- **Svelte** — snippet-пропы (`TSnippetSlots`). Сниппет без параметров
  присваивается `Snippet<[Scope]>`, поэтому `<Button>текст</Button>` работает
  без изменений.
- **Angular** — простые слоты проецируются нативно
  (`<ng-content select="[slot=leading]">`), scoped принимает
  `<ng-template slot="default" let-text>` через `SlotDirective` +
  `contentChildren`. `<ng-content>` объявлен один раз и вне `@if`: иначе
  содержимое теряется при смене ветки. Директиву импортирует потребитель.
- **WebC** — Shadow DOM не используется (тема раскладывается глобальными
  BEM-классами и через теневую границу не проходит), поэтому свет
  распределяется вручную по атрибуту `slot`. Шаблон объявляет точки в
  `create()`; режим `before` позволяет обойтись без узлов-обёрток, которых нет
  в остальных пяти адаптерах и которые сломали бы селекторы темы.

Заодно у React появились первые тесты — без них conformance-гарантия на него
не распространялась.

### `aria` — один набор, в который пишут все

Паттерны берутся из **WAI-ARIA Authoring Practices** плюс накопленная практика
обхода багов скринридеров (её же реализует Zag). Ничего не изобретаем.

`TComponentView` держит `_aria: TAria` — живой объект по образцу `_classes`, с
методами `add` / `remove` / `get` / `has`. `add(name, null)` снимает атрибут,
поэтому пишется без ветвления:

```ts
// TControl
protected _syncDisabled(): void {
	this._attrs.add('disabled', this.disabled && hasNativeDisabled(this.tag) ? 'disabled' : null)
	this._aria.add(
		'aria-disabled',
		this.disabled && !hasNativeDisabled(this._ariaTag) ? 'true' : null,
	)
}
```

Нативный `disabled` уходит в набор `attrs` по тегу корня, `aria-disabled` — в
`aria` по тегу элемента, на котором стоит `aria` (`_ariaTag`), и никогда оба на
одном элементе. Пересчёт — на `change:disabled` и `change:tag`.

`protected: true` в `ComponentViewDescriptor`, триггер один — `change:aria`.
За границу core → ui уходит снимок (`valueOf()`), а не ссылка на объект.

**Почему объект, а не вычисляемый геттер.** Сначала было именно так: каждый
источник отдавал свой набор, шаблон складывал их спредом. У элемента таба в
одном `v-bind` сошлись четыре источника — роль от ядра, связка от расширения,
активность от коллекции, имя от плагина, — и каждый новый ARIA-паттерн
добавлял пятый. Собрать это в шести адаптерах невозможно.

Плата видна сразу: вычисляемых записей нет, каждое правило превращается в
подписку плюс вызов для начального состояния. Забыть подписку легче, чем
забыть геттер. Взамен исчез объединённый список триггеров: раньше проп `aria`
перечислял `change:disabled`, `change:tag`, `change:present`, `change:label`
по всей цепочке наследования — включая события, которых у `TComponentView` нет.

**Кто что пишет:**

| Источник              | Что                                | Пример                                             |
| --------------------- | ---------------------------------- | -------------------------------------------------- |
| ядро компонента       | природа элемента                   | `role="tab"`, `role="status"`, `aria-disabled`     |
| `TAriaPlugin`         | имя и описание                     | `aria-label`, `aria-labelledby`                    |
| расширение коллекции  | знание коллекции                   | `aria-selected`, связка `id`/`aria-controls`       |
| плагин поведения      | то, что меняется от взаимодействия | `aria-activedescendant` из `TSelectKeyboardPlugin` |
| проводка adapter-слоя | известное лишь при связывании      | сторона панели `Tabs.Content`                      |

Кроме `aria-*` набор несёт `role` и `tabindex` — без них ARIA-паттерн не
работает: `<div role="button">` без `tabindex` нельзя сфокусировать, а значит
и активировать с клавиатуры.

**Граница набора.** Писать можно только туда, где есть экземпляр. У разметки
без компонента набора не существует, и её атрибуты отдаются пропом:
`content_aria` у панели Accordion, `list_aria` у списка Select. См. критерий
«часть или слот» — это его прямое следствие, а не исключение.

### `dataset` — тот же механизм для контракта с темой

`data-*` жил иначе: его считали шаблоны. Восемь биндингов в Vue — и два из них
уже разошлись, отдавая одно состояние по-разному:

```html
<!-- ListBox/item -->
:data-highlighted="listItem_highlighted"
<!-- Select/item -->
:data-highlighted="String(!!listItem_highlighted)"
```

Работало по случайности: Vue сам приводит `false` к `"false"`, а `undefined`
выбрасывает. Вне Vue эти атрибуты не эмитил никто — при портировании Accordion,
ListBox, Tabs и Select копий стало бы сорок.

Поэтому общая механика набора вынесена в **`TAttributes`** (карта, `null`
снимает, `change` только при настоящем изменении, `valueOf()` — новый объект
на каждое чтение), а наследников двое:

- **`TAria`** — имена целиком, потому что префикс здесь не универсален: `role`
  и `tabindex` лежат в том же наборе. Значения уже строки предметной области,
  и приводить их не из чего;
- **`TDataset`** — подставляет `data-`, приводит булево и число к строке.
  `false` даёт `"false"`, а не снимает атрибут: тема смотрит
  `[data-x='true']`, и «выключено» надо отличать от «неприменимо».

`TClasses` под эту базу не подводили: там список с базовым классом и
вычисляемыми записями, а не карта.

**Кто пишет:** `TSelectionExtension` — `data-selected` всем элементам,
`TActivationExtension` — то же имя при состоянии `active`, `TListBoxExtension` и
`TSelectExtension` — элементам `data-content-fit` (у элемента ListBox — свой
поверх списочного) и `data-indicator`, `TListItemPlugin` — `data-highlighted`,
`TAnchorPlugin` — `data-placement` у Frame, `TControl` — `data-disabled` на
любом теге, сам компонент — своё (`data-open` у `TSelect`, рядом со строкой
`aria-expanded`; `data-content-fit` и `data-indicator` у `TListBox` и `TSelect`).

`data-disabled` пишется отдельной подпиской на `change:disabled`, а не в
`_syncDisabled`: тот пересчитывается и на смену тега, потому что нативный
`disabled` и `aria-disabled` зависят от тега своего элемента. Теме нужно одно
значение на любом теге, иначе её селектор переезжал бы вместе с атрибутом.

**Почему родительское расширение, а не item-расширение.** Первая версия писала
из `TSelectionItemExtension` — там, где `selected` и вычисляется. Тесты сразу
показали пустые атрибуты: item-расширения создаются **лениво**, только когда
адаптер запросит контекст элемента. Атрибут же обязан стоять с первой
отрисовки, включая серверную. Родительское расширение существует сразу и
обходит элементы через `ctx.driver` — тем же способом, каким
`TSelectExtension` проставляет `aria-selected`.

**Почему у таба `data-selected`, а не `data-active`.** `data-*` описывает вид,
а тема красит выделенный элемент одинаково — будь он активным табом, раскрытой
секцией или выбранной опцией. Расходится ARIA (`aria-selected` у опции,
`aria-expanded` у секции), и она остаётся за расширением компонента: общее
внизу, различное наверху.

**Наборы биндятся к разным элементам.** У Select `aria` уходит на поле с
`role="combobox"`, а `dataset` — на корень, потому что тема разворачивает
стрелку селектором `.s-select[data-open='true']`. Пишутся оба рядом, в одном месте;
совпадение точки привязки — не требование.

Исключение одно и оно помечено в разметке: `ListBoxItem` раскладывает набор
**дважды** — на обёртку и на `.s-button`, потому что тема читает
`data-content-fit` с первой, а `data-selected` / `data-highlighted` со второй.
Свести к одному носителю мешает то, что подсветка и выбор у `.s-button`
раскрашены по вариантам, а у элемента списка своих таких правил нет. Чинится
вместе с доступностью ListBox, где ему добавят `role="option"`.

**Готовые паттерны.** Если для виджета есть паттерн WAI-ARIA APG — следуем ему;
расхождения объясняем в комментарии. Реализовано:

| Компонент | Паттерн                                              | Ключевое                                                                                                                                |
| --------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Tabs      | Tabs                                                 | `tablist`/`tab`/`tabpanel`, связка `aria-controls` ↔ `aria-labelledby`; стрелки и `Home`/`End`, одна остановка Tab                      |
| Accordion | Accordion                                            | `aria-expanded` на заголовке, `role="region"` у панели; до переименования компонент назывался `Collapse` — имя не совпадало с паттерном |
| Select    | Combobox (select-only; с `editable` — редактируемый) | `role="combobox"`, `aria-activedescendant`, фокус не уходит с поля                                                                      |
| Switch    | Switch (на `input[type="checkbox"]`)                 | `role="switch"` на вложенном `<input>`, состояние — нативный `checked`                                                                  |

Два правила, общих для трёх коллекций (Tabs, Accordion, Select). `aria-selected="false"` ставится и на
невыбранных: скринридер объявляет «2 из 7, не выбрана», и без атрибута этого
не скажет. Недоступные элементы пропускаются при навигации с клавиатуры —
подсветить то, что нельзя выбрать, значит завести пользователя в тупик.

Плагин, который писал бы атрибуты прямо в DOM после монтирования, дал бы
пустую серверную разметку. `TAriaPlugin` в DOM не ходит — он пишет в тот же
набор, а раскладывает его шаблон, синхронно. По той же причине связка
«таб ↔ панель» проставляется при добавлении элемента в коллекцию, а не при
появлении панели: иначе она не успевала бы к первой отрисовке.

### Доступное имя — опциональный плагин

`label` не в `TComponentView`: имя нужно не всякому компоненту — у кнопки с
текстом и у заголовка оно вычисляется из содержимого само, и лишние
`label`/`labelledBy` на базовом классе были бы мусором в каждом наследнике.

`TAriaPlugin` (`packages/plugins/src/custom/component-view`, namespace `aria`)
подключён к `ControlDescriptor` — у интерактивного элемента имя обязано быть
всегда. Icon, Spinner и Frame получают его поштучно; Skeleton не получает.

Опция `role` значит «без имени элемент декоративен»: плагин ставит
`aria-hidden`, а с именем меняет на эту роль. Обе стороны у одного владельца —
иначе при снятии имени неясно, кому возвращать `aria-hidden`.

Это был первый плагин с пропсами, которые пишутся снаружи; теперь такие есть и
у `TAnchorPlugin` (`anchor_anchor`, `anchor_placement`, `anchor_matchWidth`,
`anchor_flip`) и `TDismissPlugin` (`dismiss_enabled`). Ядро получает
пропсы через конструктор, плагины — нет, поэтому начальные значения доносит
сборка (`createAdapterContext`, правило — `TLine.seed`): пропсы
плагинов — часть состава, и пишет их тот, кто состав собрал.

### CSS не стилизуется по `aria-*`

ARIA — контракт со скринридером, `data-*` — с темой. Повод для правила —
реальная регрессия: `aria-selected` перенесли с обёртки на элемент с ролью, а
тема раскрывала панель Accordion селектором
`.s-accordion-item[aria-selected='true']`. Доступность починили — панели
перестали открываться, и ни один тест не заметил, потому что все проверяли
ARIA. Обёртка теперь отдаёт то же состояние как `data-selected`.

Раскладка по адаптерам: `v-bind="aria"` (Vue), спред объекта (Svelte, Solid),
`toAriaProps(aria)` (React — он ждёт `tabIndex`, а не `tabindex`), `ariaBinding`
(Web Components), директива `[ariaAttrs]` (Angular — единственный, где нет
спреда атрибутов).

### `direction` / `dir` — тот же приём для направления письма

`TComponentView` несёт writable-проп `direction: 'ltr' | 'rtl' | 'inherit'`
(дефолт `'inherit'`, триггер `change:direction`) и сам пишет по нему атрибут
`dir` в набор `attrs` (`_syncDir`): `'inherit'` даёт `null`, и атрибут снимается
— направление наследуется от предка. Отдельного пропа `dir` нет: раньше ядро
отдавало его вычисляемым геттером, и каждый адаптер биндил его на корень сам
(`:dir="dir ?? undefined"` во Vue, `[attr.dir]` в Angular и так далее). Теперь
`dir` доезжает до корня вместе с `attrs`, которые адаптеры и так раскладывают, —
см. AGENTS.md, «Третий набор: `attrs` для нативных HTML-атрибутов».

Почему `'inherit'` — явное значение, а не `undefined`: writable-проп обязан
уметь вернуться в исходное состояние, а когда `direction` вводили, слой
синхронизации во всех адаптерах трактовал `undefined` как «не трогать». С
`undefined` компонент, которому один раз задали `direction`, уже нельзя было бы
отпустить обратно на наследование. С тех пор связка возвращает снятый проп к
умолчанию декларации (AGENTS.md, «Две поверхности управления»), и трёхзначные
пропсы (`closable`, `contentFit`) обходятся `undefined`; у `direction` явное
значение осталось частью публичного API. Перевод `'inherit' → null` живёт в
ядре (`TComponentView._syncDir`), поэтому сентинел не протекает в шесть
шаблонов.

### Граница переиспользования между похожими компонентами

ListBox, список Select, будущие Menu и Popover выглядят одинаково, и напрашивается
`Select = Input + Frame + ListBox`. Разбор показал, что это ловушка.

**Списки одинаковы на вид и различны по семантике:**

|                 | ListBox         | список Select            | Menu               |
| --------------- | --------------- | ------------------------ | ------------------ |
| роль контейнера | `listbox`       | `listbox`                | `menu`             |
| роль элемента   | `option`        | `option`                 | `menuitem`         |
| где DOM-фокус   | на контейнере   | **на поле, не в списке** | на элементе        |
| навигация       | roving tabindex | `aria-activedescendant`  | roving tabindex    |
| элемент         | выбирается      | выбирается               | выполняет действие |
| `aria-selected` | есть            | есть                     | нет                |

Проверка на коде: `ListBox.vue` держит `tabindex="0"` на корне, а
`TListKeyboardPlugin` слушает `keydown` там же — ListBox спроектирован как
самостоятельный фокусируемый виджет. У combobox фокус обязан оставаться на
поле. Вложить готовый ListBox в Select значит снимать ему `tabindex`, глушить
его клавиатурный плагин и перенаправлять подсветку наружу — то есть добавлять
ListBox режимы ради чужого компонента, после чего его тесты начнут охранять
два поведения сразу.

**Поэтому делим по слоям, а не по компонентам:**

| Слой                                                | Общий? | Где                                                         |
| --------------------------------------------------- | ------ | ----------------------------------------------------------- |
| оверлей: якорь, позиционирование, z-index, закрытие | общий  | `TFrame` + `TAnchorPlugin` + `TDismissPlugin`               |
| поведение списка: подсветка, скролл, высота         | общий  | `TListItemPlugin`, `TListScrollPlugin`, `TListHeightPlugin` |
| визуальная строка элемента                          | общий  | `Button` внутри элемента + SCSS                             |
| движок коллекции, `selection`, `order`, `meta`      | общий  | `base/collection`                                           |
| контейнер списка и его ARIA                         | свой   | у каждого компонента                                        |
| модель фокуса и клавиатура                          | своя   | у каждого компонента                                        |

Критерий: **общее — то, что не зависит от роли и модели фокуса.**

Дублирования разметки при этом почти нет, и оно решено давно: `ListBoxItem`,
`TabsItem`, `AccordionItem`, `SelectItem` и `TagsItem` рисуют строку одним и тем же
`Button`. Общая визуальная единица вынесена; различается контейнер — то, что и
обязано различаться.

Отдельного `DropDown` нет намеренно: когда у Frame появился якорь, дропдаун —
это оверлей плюс произвольное содержимое, а не компонент со своим списком.

### Слой оверлея

Три куска, из которых собирается всё, что открывается поверх страницы:

**`TFrame`** — телепорт в `body`, `rendered`/`visible`, стек z-index.

**`TAnchorPlugin`** (`plugins/src/custom/frame/anchor/`, namespace `anchor`) —
привязка к чужому элементу. Считает координаты из `getBoundingClientRect()`
якоря и пишет их во Frame (`x`/`y`, при `matchWidth` ещё `width`); раскладывает
их `TFrameLayoutPlugin`, как любые другие координаты.

Разделение не формальное: раскладка отвечает за собственные пропсы Frame,
привязка — за слежение за посторонним элементом. Раньше это был один плагин, и
в нём же жил баг: слушатели скролла вешались на всех предков якоря, но
снимались по одной переменной цикла, которая к моменту очистки была `null` —
то есть не снимались вовсе.

Выбор потребителя — `placement`: сторона `top` или `bottom` и выравнивание по
якорю — `-start`, `-end` или центр, значением без суффикса (`top`, `bottom`).
Поверх него плагин сам решает две вещи. **flip** переключает
`top`/`bottom`, если на выбранной стороне панель не влезает по высоте окна, а
на противоположной места больше; не влезает нигде — остаётся на стороне
потребителя. Выравнивание, центр в том числе, flip не трогает. Flip
выключается свойством `flip` (`anchor_flip: false`, по умолчанию включён):
сторона потребителя держится, даже если панель там не влезает, — так Select
выражает свои `placement: 'top'` и `'bottom'` (якорю он отдаёт `top-start` и
`bottom-start`, центр тут ни при чём). **shift** сдвигает `x` внутрь окна,
чтобы панель не вылезала за левый и правый край; шире окна — прижимается к
левому. **RTL** (`getComputedStyle(anchor).direction`) разворачивает
выравнивание: в RTL `-start` держит правый край якоря, `-end` — левый, центр
от направления не зависит. Фактическая сторона после flip уходит теме через
`data-placement` на самом Frame — она не всегда совпадает с тем, что задал
потребитель.

Поэтому плагину нужен размер панели: высота — для flip и показа сверху, ширина
— для `*-end`, центра и shift. Размер берётся из `getBoundingClientRect()` панели; при
`matchWidth` ширину даёт якорь, и список под полем не зависит от того, успела
ли панель отрисоваться. Размер якоря и панели плагин узнаёт без scroll/resize
окна: на обоих висит свой `ResizeObserver`, поэтому позиция пересчитывается и
когда меняется только их размер (пропал тег, вырос Popover).

**`TDismissPlugin`** (`plugins/src/custom/dismiss/`, namespace `dismiss`) —
«нажали мимо». Слушает `pointerdown`, а не `click`: клик приходит после
отпускания кнопки, и до него успевает смениться фокус. Касание пальцем —
исключение: с его `pointerdown` начинается и прокрутка страницы, поэтому оно
решается на `pointerup` того же `pointerId`; если палец повёл страницу,
браузер шлёт `pointercancel` вместо `pointerup`.

Перо решается первым из двух событий: `pointerup` того же `pointerId` или
совместимым `mousedown`. По `pointerType` стилус на сенсорном экране не
отличить от пера графического планшета, поэтому устройство не угадывается —
решает порядок событий. Стилус листает страницу, как палец, и совместимые
события мыши получает только после отпускания: его решает `pointerup`, а
прокрутку браузер, как и у пальца, отмечает `pointercancel`. Перо планшета
ведёт себя как мышь: `mousedown`, а с ним и смена фокуса, идёт сразу за
`pointerdown`, и панель закрывается до смены фокуса. Исключение — страница,
отменившая `pointerdown`: совместимых событий нет, и перо решает `pointerup`
и на планшете. Касание `mousedown` не решает, а мышь к нему уже решена на
`pointerdown`.

Плагин сам следит за открытостью владельца (опция `property`, по умолчанию
`open`) — иначе связку «открыто ⇄ слушаем» пришлось бы писать в шаблоне
каждого из шести адаптеров.

Две вещи, которые легко забыть и дорого чинить:

**Открытость — это `visible`, а не `rendered`.** Опции регистрируются в
коллекции при монтировании и выбывают при размонтировании. Спрячь панель через
`v-if` — закрытие вычистит коллекцию, а вместе с ней выбор и значение поля.
Это не гипотеза: ровно так Select и терял значение, пока панель не перевели на
`v-show`.

**Панель помечается владельцем.** Она телепортирована, то есть лежит вне
поддерева владельца, и простой `contains()` счёл бы нажатие внутри неё
нажатием мимо. `TDismissPlugin.ownerAttribute` даёт `data-owner="<uid>"` —
чистый DOM, одинаково во всех шести адаптерах, без проводки между компонентами.

### Select — Combobox по APG

`TSelect extends TInputControl`: `value`/`name`/`readonly`/`required` приходят
готовыми. Коллекция опций живёт в параллельном фасаде, как у Tabs, поэтому
наследование от контрола ей не мешает.

**`value` и выбор — одно и то же.** Значение отдельно от выбора не хранится:
их синхронизирует в обе стороны `TValueSelectionExtension` (расширение движка
`value`, общее с ListBox), флаг разрывает круг. Направление на старте выбирает
тот, кому есть что сказать: задано `value` или выбор пуст — `value → выбор`,
иначе выбор из переданного снаружи движка становится значением.

**Отдельного пропа `multiple` нет** — это `mode: 'single' | 'multiple'`
коллекции, как у ListBox. Два имени для одного состояния однажды разошлись бы.

**Отображаемый текст считает коллекция.** `TTextable` — сестра `TValueControl`,
а не предок (обе от `TControl`), поэтому `text` по наследству недоступен и имя
свободно. Текст выбранного `TSelectExtension` склеивает из текстов выбранных
опций и пишет в поле — `owner.field.value`, экземпляр `TInput`, которым шаблон
рисует поле; в режиме тегов (`multiple`) поле пусто — выбранное рисуют теги.
Почему поле — единственный хранитель видимого текста, — AGENTS.md, «Поле —
один хранитель, не проп ядра».

Клавиатура — `TSelectKeyboardPlugin`. Слушает `keydown` на корне Select, потому
что фокус не уходит с поля; панель при этом может быть телепортирована куда
угодно. Клавишу плагин берёт только с `<input>` поля: клавиши кнопки очистки и
крестиков тегов тоже всплывают до корня, но их обрабатывают сами кнопки.
Открытие стрелками и печатным символом, `Home`/`End`, `Escape`, `Tab`,
набор по буквам с буфером, пропуск недоступных опций, `aria-activedescendant`.
Поведение по режиму — две стратегии (`strategies/`), а не ветки в обработчике:
AGENTS.md, «Клик и клавиатура — режим выбирает стратегию, а не ветка внутри
неё».

Учёт подсветки у него общий с `TListKeyboardPlugin`: оба наследуют
`TListNavigationPlugin` (`plugins/src/custom/list/navigation/`) — `keydown`,
привязка к движку, подсвеченный элемент, сдвиг по кругу и пропуск недоступных
элементов (выключенных, скрытых, не нарисованных). Роль элемента, набор клавиш
и смысл активации остаются у наследников: у ListBox и combobox они разные.

**`editable` + `editableMode` — ввод в поле.** `editable` включает возможность
печатать (снимает `readonly`), `editableMode` — значение с тремя состояниями,
что делает сам ввод: `search` (по умолчанию, совпадение подсвечивается),
`filter` (несовпавшие опции скрываются) и `none` (встроенный поиск выключен —
списком управляет приложение). Оба живут в ядре как обычные props, потому что
это значения, а не операции.

Реакцию на ввод несёт `TEditablePlugin` (`plugins/src/custom/select/editable/`,
namespace `editable`), подключённый после `TSelectKeyboardPlugin`: слушает
`input` вложенного `<input>` (узел ищется как в `TInputPlugin`,
`el.querySelector('input')`), и только пока `editable` включён, а режим не
`none`. В `search` набранное уходит в публичный
`TSelectKeyboardPlugin.highlightByText(needle)` — общий алгоритм с набором по
буквам с клавиатуры, только источник другой (вставка, IME, автозаполнение,
очистка поля — не только нажатия клавиш); в `filter` — в `filter.query`
коллекции. Набранное плагин держит сам (`query`), не в ядре. Возврат поля к
тексту выбранного — одна точка плагина (`_returnField`, пишет
`owner.field.value`, а не DOM), её зовут повторный `Escape` и уход фокуса:
AGENTS.md, «Возврат поля».

`aria-autocomplete` следует той же паре: нет `editable` — атрибута нет вовсе,
`editable` — всегда `"list"`, независимо от режима (панель на вводе
открывается и совпадение объявляется через `aria-activedescendant`, так что
подсказка скринридеру уже есть). Даже при `none`, где встроенный поиск
выключен, список может зависеть от набранного текста — это делает само
приложение (например, серверный поиск).

---

## Layer 6: Vue Adapter (`packages/ui/vue/src`)

### ✅ COMPLETE IMPLEMENTATION

#### Static Layer (`adapter/static/`)

Both read the surface `TSurface.of(descriptor, VueProfile)` at module import (Layer 5b):

- `useProps(descriptor)` - Vue props config: type and declared default of every non-protected prop
- `useEmits(descriptor)` - Vue emits: the surface's `exportEvents`, which already hold `update:<prop>` for every writable prop with triggers (`VueProfile.model`)

#### Runtime Layer (`adapter/runtime/`)

- `useAdapter(adapter, props, emit)` - Main hook over the exchange `adapter.connect(VueProfile)`; дженерики не пишутся: инстанс и выходы плагинов — из контракта контекста, `TProps` — из `props`
  - Returns `TBinding`: `ctrl`, `plugins`, props refs and plugin outputs; `rootElement` — only when the bundle has `TElementPlugin`
  - Core → Vue: a ref per property with triggers. `state.subscribe` hands every property over through the same call a trigger uses — that is how the refs are created; later it calls only on a change
  - Vue → core: `watch` per input prop → the input's `offer`, changes only: the starting values were applied by the assembly — AGENTS.md, «Две поверхности управления»
  - Events: `events.listen` → `emit`, including `update:<prop>` for `v-model` (the binding emits it after the core event)
  - `rootElement` watch → `adapter.bindElement`
  - На `onUnmounted`: снимает подписки связки, затем `adapter.destroy()`
- `useCollectionAdapter()` - То же для контекста фасада коллекции; `ctrl` и `rootElement` не отдаёт — они принадлежат владельцу (AGENTS.md, «Vue collection setup»)

Компоненты передают дженерики `useAdapter` явно, поэтому выходы плагинов из
типа контекста не выводятся: третьим аргументом
`DescriptorPluginOutputs<typeof XDescriptor>` их передаёт компонент, чей шаблон
читает выход (Select, Frame, Icon, Spinner, Skeleton). Граница рантайма и типа
у Vue своя — `toBindingState`: шаблону отдаются рефы, а не `state`.

**Отписка обязательна.** `adapter.destroy()` работает только с собственным
`TEvented` адаптера и не трогает `instance.events`. При внешнем `ctrl`,
переживающем компонент (документированный сценарий), хендлеры копились бы с
каждым монтированием. Отписки отдаёт связка (`state.subscribe`,
`events.listen`), `useAdapter` зовёт их на `onUnmounted`.

**`v-model`.** Профиль Vue объявляет модель (`update:<prop>`) для каждого
записываемого свойства с триггерами, поверхность кладёт её в `exportEvents`,
связка эмитит в `events.listen` (значение перечитывается связкой, а не берётся
из аргумента события: у производных триггеров полезная нагрузка может не
совпадать со свойством).

#### Elevator (`adapter/elevator/`)

- `TVueElevator<T>` - Wraps Vue provide/inject; `VueElevatorFactory` creates it by key

#### Common Utilities (`adapter/common/`)

- `VueProfile` - Vue profile (`naming: VueNaming`): one surface for the static layer and the binding
- `VueNaming` - Vue naming strategy (props `ns_name` as everywhere, events keep the core name: `element:ready`)
- `createVueAdapterContext()` — обёртка над `createAdapterContext`, которая снимает Vue-прокси с `ctrl` и значений `options`; Vue-компоненты создают контекст только через неё. Тип контекста — тот же, что у `createAdapterContext`
- `useIcon(role)` — компонент иконки по роли из реестра. Строит разметку через
  `h('svg', { viewBox, innerHTML })`, а не `template`: последнее требовало бы
  рантайм-компилятор Vue. Роль резолвится на отрисовке, поэтому `setIcons()`
  может быть вызван позже создания компонента
- `useSplitAttrs()` — разделение `useAttrs()` на `{class, style}` и остальное
  (для составных компонентов с `inheritAttrs: false`)

Папки `composables/` больше нет: два оставшихся хелпера переехали сюда, к
остальному общему коду адаптера.

Оба хелпера остаются Vue-специфичными: `useIcon` строит компонент через
`defineComponent`/`markRaw`/`h`, `useSplitAttrs` — через `useAttrs`/`computed`.
Переиспользовать их в других адаптерах напрямую нельзя; общая часть — реестр
иконок (`setIcons`/`getIcon`) — уже живёт в `packages/setup/protected/registry/`, куда
фреймворки не импортируются.

#### Components (`components/`)

**22+ Framework Components** (one per core component):

- Each visual component has: `base.component.ts` (props/emits) + `setup.component.ts` (logic) + `.vue` template; headless layers have only `base.component.ts`
- Pattern:

  ```ts
  // base.component.ts - Static props/emits
  name: 'BaseButton',
  props: useProps(ButtonDescriptor()),
  emits: useEmits(ButtonDescriptor())

  // setup.component.ts - Lifecycle + adapter
  extends: BaseButton,
  setup(props, { emit }) {
    const adapter = createVueAdapterContext(ButtonDescriptor(), { ctrl: props.ctrl, props })
    return useAdapter(adapter, props, emit)
  }
  ```

### Key Files

- [adapter/static/useProps.ts](../packages/ui/vue/src/adapter/static/useProps.ts) - Vue props factory
- [adapter/static/useEmits.ts](../packages/ui/vue/src/adapter/static/useEmits.ts) - Vue emits factory
- [adapter/runtime/useAdapter.ts](../packages/ui/vue/src/adapter/runtime/useAdapter.ts) - Main hook
- [components/button/](../packages/ui/vue/src/components/button/) - Button component example
- [adapter/common/useSplitAttrs.ts](../packages/ui/vue/src/adapter/common/useSplitAttrs.ts) - Разделение сквозных атрибутов

### Component Hierarchy (Vue)

`Base*`-компоненты друг от друга не наследуются: каждый берёт пропсы и эмиты
своего дескриптора целиком (`useProps(XDescriptor())`), а наследование живёт в
дескрипторах (Layer 3). В адаптере одна ступень: `setup.component.ts`
расширяет свой `Base*`, `.vue` добавляет разметку.

- Только `Base*`, без разметки: `BaseComponent`, `BaseInteractive`,
  `BaseStylable`, `BaseControl`, `BaseValueControl`, `BaseInputControl`,
  `BaseTextable`
- Компоненты: Accordion (+ `AccordionItem`), Button, CheckBox, ComponentView,
  DragAndDrop, Frame, Icon, Input, ListBox (+ `ListBoxItem`), Select
  (+ `SelectItem`), Skeleton, Spinner, Switch, Tabs (+ `TabsItem`,
  `TabsContent`), Tags (+ `TagsItem`)
- Коллекция собирает два adapter-контекста на одном bundle — владельца и
  фасад коллекции (AGENTS.md, «Vue collection setup»)

Select стоит здесь особняком: он единственный, кто собирает вместе форменный
контрол (`TInputControl`), коллекцию (параллельный фасад) и слой оверлея
(`TFrame` + `TAnchorPlugin` + `TDismissPlugin`). Порядок сборки описан выше,
в разделах «Граница переиспользования» и «Слой оверлея».

---

## Layer 7: React Adapter (`packages/ui/react/src`)

### ✅ IMPLEMENTED (mirrors Vue `adapter/` architecture)

**Structure (mirrors Vue `adapter/{common,runtime,elevator}`, 3-module component split):**

There is no `adapter/static/`: React takes prop names from the descriptor types, not from runtime declarations.

- `adapter/common/` — `ReactProfile` (`naming: ReactNaming`, `defaultSlot: 'children'`) и `ReactNaming`, который целиком собран из общих стратегий: `prop: underscorePropNaming`, `event: callbackEventNaming`; `toAriaProps` (HTML-имена атрибутов наборов → имена пропов React: `tabindex` → `tabIndex`); `renderSlot` / `TSlotContent`
  - props: same as Vue (`namespace_name`); events: `onXxx` callbacks (`change:visible` → `onChangeVisible`, `element:ready` → `onElementReady`)
  - тип-зеркало `TCallbackEventProps` живёт в `packages/setup/protected/naming` (им же пользуются Svelte и Solid). **Descriptor = единственный источник типов**: React НЕ импортирует `IXxxProps`/`TXxxEvents`/`TXxxPluginEvents` из core/plugins. Component event props = `EventProps<typeof XxxDescriptor>` (`src/types.ts`) = `DescriptorCallbackEvents<typeof XxxDescriptor>` из `@soldy-ui/setup` — `TCallbackEventProps<DescriptorAllEvents<…>>`, где `DescriptorAllEvents` включает свои + namespaced события плагинов из tuple (`TPlugins` phantom на `IComponentDescriptor`).
- `adapter/runtime/` — `useAdapterContext(factory)` (держит adapter-context между рендерами, уничтожает его и собирает заново фабрикой последнего рендера, когда React повторяет установку эффекта; без `ctrl` инстанс при этом новый), `useAdapter(adapter, props)` (main hook over the exchange `adapter.connect(ReactProfile)` — takes a READY adapter)
- `adapter/elevator/` — `TReactElevator` + `ReactElevatorFactory` (React Context; `down`/`up` — collections NOT wired yet)
- `components/` — each component = up to 3 modules: `base.component.ts` (типы/props) + `setup.component.ts` (`useSetupXxx` hook) + view (`*.tsx`)
  - headless layers: `component` — only `base.component.ts`; `stylable`/`control`/`textable` — `base.component.ts` + `setup.component.ts` (no `.tsx` view, like Vue base layers)
  - concrete layers (`component-view`, `button`): `base.component.ts` + `setup.component.ts` + `.tsx` view

**Key design decisions (React-specific):**

- `useSetupXxx(props)` hook doesn't hold the adapter-context itself: it passes the factory `() => createAdapterContext(XxxDescriptor(), { ctrl: props.ctrl, props })` to `useAdapterContext` (`adapter/runtime/`), which calls it once on the first render and returns the same context afterwards (`__tests__/adapter-context.spec.tsx`), then hands the context to `useAdapter`. Components call no React hooks of their own — AGENTS.md, «Механизмы фреймворка — только в адаптерном слое»
- `useAdapterContext` also owns the context's lifetime: its effect cleanup destroys the context (`useAdapter` doesn't). React may set the effects of the same live component up again — StrictMode's extra cycle on mount, `<Activity>` on show. On such a setup the hook builds a new context with the factory from the latest render (`useEffectEvent`: props of the first render may have changed since) and re-renders the component with it. Without `ctrl` the instance is new, as on a fresh mount; with `ctrl` it is the same. Every context is destroyed exactly once, including one built but never rendered because the component unmounted first
- `useAdapter` returns `{ ctrl, plugins, ref, forwardProps, state }` — `state` = exported props (incl. protected `classes`/`present`/`aria`/`dataset`/`attrs`) and plugin outputs, typed `TAdapterState<TInstance, TOutputs>` from the context type; `forwardProps` = `binding.forward(props)`: DOM attrs not consumed by the component (the surface consumes `ctrl`, `embedded`, `children` and prop, trigger, event and slot names)
- `ref` = `adapter.bindElement`: the context itself knows whether the bundle has `TElementPlugin`
- Core → React: `useSyncExternalStore(link.state.subscribe, link.state.getSnapshot)` — the render reads the immutable snapshot, the subscription happens at commit, and React compares the snapshot again after subscribing, so a core change between render and commit is not lost (the snapshot object stays the same while nothing changed, so nothing re-renders). `useEffect(() => link.inputs.full(props), [props, link])` = React → Core: the effect gets the full props set on every parent render, and `inputs.full` writes only the props whose value changed since the previous set (the input cell compares by content with `sameValue`, the same rule as the state: an array literal like `value={['a', 'b']}` is a new object on every render, not a change), so a repeated prop doesn't roll back what the core or code through the instance changed since. The input memory starts from the props the context was assembled with, so the first `inputs.full` writes nothing that the assembly already applied. When the context is rebuilt, `useAdapter` binds the new one (`adapter.connect(ReactProfile)`) and `useSyncExternalStore` switches to its store: a rebuild is a mount like any other, and the assembly applies the props again
- Events: `binding.events.listen` in `useLayoutEffect` (so rAF `ready` from TElementPlugin isn't missed); the callback is read from the latest `props` via `propsRef`
- `{...restProps}` разворачивается ПЕРВЫМ, до `ref`: в React 19 `ref` — обычный проп, и переданный потребителем ref перекрыл бы ref адаптера, тихо сломав привязку к `TElementPlugin`

### Theming (`@soldy-ui/theme-oren`) — foundation REMOVED

- `packages/foundation` deleted. Themes live in `packages/themes/*` (workspace glob `packages/themes/*` added to root).
- `@soldy-ui/theme-oren` = standalone theme package: `src/{index.scss, base.css, tokens.css, tokens-dark.css, utilities.css}`, `src/mixins/` (`_fade.scss`, `_required.scss`), `src/components/<component>/_<component>.scss` (+ `_mixins.scss`) → built to `dist/index.css` (`main`/`style` and the `default` condition of `exports` point to `dist/index.css`, `types` — to `index.d.ts`).
- Theme CSS build = plain Vite build, not lib mode (`build.rollupOptions.input: src/index.scss`, `assetFileNames: 'index.css'`; Vite drops the empty JS chunk of a CSS-only entry itself, while lib mode needs a JS entry — with `.scss` it fails in `vite:css-post` — whose empty chunk used to ship in the package as `dist/theme-oren.js`) + `postcss.config.mjs` (`@tailwindcss/postcss`) + SCSS `additionalData` injecting `@import ".../src/base.css"` (base.css = `@import 'tailwindcss'` + tokens + tokens-dark + utilities). `@apply` resolves because tailwind context is injected.
- **Contract = BEM classes and `data-*`** (`.s-button`, `.s-button--size-*`, `.s-button--view-*`, `[data-selected='true']`). UI packages emit only classes and `data-*`; theme ships their CSS. Values of appearance modifiers (`--view-*`, `--variant-*`, `--shape-*`, `--animation-*`) are declared by the theme in `index.d.ts`, not by the library (AGENTS.md, «Оформление: значения объявляет тема»). Tailwind/SCSS live ONLY in the theme package. Theme rules — `packages/themes/oren/AGENTS.md`.
- **Tokens**: `:root,[data-theme='oren'] { --s-accent-500: oklch(...) }` + `@theme inline { --color-s-accent-500: var(--s-accent-500) }` — utilities reference vars, so runtime theme switching via `data-theme` works without rebuild.
- **Colour schemes**: `tokens-dark.css` (`[data-theme='oren-dark']`) redefines the same scales with roles mirrored; imported AFTER `tokens.css` in `base.css` because both selectors have specificity (0,1,0) and source order decides. See «Тёмная схема» above.
- UI packages (`react`, `vue`) + `core`/`angular`/`solid`/`svelte` dropped `@soldy-ui/foundation` dep. Component styles are no longer in the UI packages: Button styles were removed from React (`button.scss`/`_mixines.scss`), and no Vue component keeps a `<style>` block — the rest (`_fade.scss`/`_required.scss`, CheckBox/Switch/Input) moved to the theme too.
- The playground (`packages/playground/vue`) imports `@soldy-ui/theme-oren` (aliased to the built `dist/index.css`; `npm run dev:vue` runs the theme build in watch mode alongside); its own chrome (`src/styles.css`) uses `--s-*` tokens without Tailwind.

### React package config

- `package.json` deps: `@soldy-ui/core`, `@soldy-ui/icons-material`, `@soldy-ui/plugins`, `@soldy-ui/setup`, `@soldy-ui/theme-oren`, `react`/`react-dom` 19
- No Vite config of its own: `tsconfig.json` `paths` and `vitest.config.ts` aliases point workspaces to sources (`core/src`, `icons/material/src`, `plugins/src`, `setup`); tests run in jsdom

### ⚠️ React pitfall: infinite loop via `visible` setter (fixed in core)

- The `visible` setter calls `show()`/`hide()` (now in `TComponentView`). `show()` used to emit `show:before` before its own «already visible» check (`hide()` checked first), so writing `instance.visible = sameValue` still emitted events, and event-logging demos re-rendered forever. Fixed in core: the check comes before the emit — see Layer 5b, «Контракт границы», and the `change:*` invariant in AGENTS.md, «Контракт границы core → ui».
- The line's `write` does not compare with the getter (`TLine.write`): a property with a resolver returns the resolved value, and a value equal to it but not to the own one was lost. Whether it is the same value is decided by the setter, against its own stored value; `inputs.full`, which runs on every `props` change, skips earlier — every prop whose value is the same as in the previous set.

---

## Layer 8: Angular Adapter (`packages/ui/angular/src`)

### ✅ IMPLEMENTED (ComponentView + Button, как в React)

**Структура** зеркалит Vue/React: `adapter/{common,runtime,elevator}` + `components/*`.

- `adapter/common/` — `AngularProfile` (`naming: AngularNaming`), `AngularNaming`
  (события → camelCase без `on`-префикса, т.к. имя `@Output` обязано быть
  валидным TS-идентификатором), `useInputs`/`useOutputs` (**только для
  кодогенератора**: имена берутся из поверхности
  `TSurface.of(descriptor, AngularProfile)`; `useOutputs` отдаёт выход в паре
  с полным именем события ядра — `actionPress` и `action:press`).
- `adapter/runtime/` — `useAdapter(adapter)` → `TBinding` поверх связки
  `adapter.connect(AngularProfile)`: `state` (сигнал), `syncInputs`
  (`inputs.delta` связки: `ngOnChanges` отдаёт только изменившиеся входы, а
  заданные при монтировании `ngOnInit` отдаёт в сборку контекста), `syncEvents` (`events.listen` →
  `EventEmitter` аутпутов, первым аргументом события ядра), `bindElement`,
  `destroy`; `TInputValue` (тип входа: тип пропа дескриптора по имени входа) и
  `TOutputEmitter` (тип выхода: эмиттер первого аргумента события
  дескриптора); `TComponentBase` (общий жизненный цикл), `AriaDirective`
  (`[ariaAttrs]`, `[attrs]`, `[dataset]` — раскладка наборов ядра),
  `SlotDirective` (`<ng-template slot>`).
- `adapter/elevator/` — `TAngularElevator` + `AngularElevatorFactory`.
- `codegen/` — `collect-manifests` + `generate` → `src/generated/*.metadata.ts`:
  массивы имён и поверхность `T<Имя>Surface` — абстрактная директива, которая
  объявляет входы и выходы компонента вместе с их типами.

### Почему Angular нужен кодогенератор

Angular AOT статически анализирует декоратор: `inputs`/`outputs` обязаны быть
литеральными массивами на этапе компиляции. Имена же живут в рантайм-дескрипторах
(`@soldy-ui/setup`), поэтому вычислить их внутри декоратора нельзя — в отличие от Vue,
где `props: useProps(ButtonDescriptor())` вычисляется при инициализации модуля.
Имена считаются заранее и сериализуются в `as const`-массивы.

`manifest.ts` каждого компонента объявляет `name` + фабрику `descriptor`;
`generate` прогоняет их через `useInputs`/`useOutputs`. Файлы закоммичены и
обновляются вручную — `npm run generate --workspace=@soldy-ui/angular` после
правки дескриптора; CI проверяет дрейф.

Имён мало для строгого шаблона потребителя. `strictTemplates` — умолчание
новых приложений Angular — проверяет привязку `(actionPress)="…"` обращением к
полю класса (`_t1["actionPress"].subscribe(($event) => …)`), а эмиттеры
`TComponentBase` ставит в конструкторе по массиву имён, и в типе класса их
нет: привязка не компилировалась (TS7053). Значение привязки входа
(`_t1.text = 42`) она сверяет с полем входа, а вход без поля пропускает молча,
с любым значением. Поэтому рядом с массивами генератор пишет абстрактную
директиву `T<Имя>Surface extends TComponentBase` —
`@Directive({ standalone: true, inputs: [...], outputs: [...] })`, — и
компонент наследует её, а своих `inputs` и `outputs` не объявляет. Поля в
ней — `declare <вход>: TInputValue<typeof descriptor, '<вход>'>` (тип пропа
дескриптора со служебными `embedded` и `pluginProps`) и
`declare readonly <выход>: TOutputEmitter<typeof descriptor, '<событие>'>`
(эмиттер первого аргумента события ядра, его шлёт `syncEvents`). Имя входа и
пара «выход — событие» — из той же записи поверхности, что имя в массиве, а
вход вне пропсов дескриптора и событие вне его карты (`DescriptorAllEvents`)
не компилируются. Входы объявляет тот же класс, что их поля: поле входа
проверка ищет среди собственных членов класса, чей декоратор объявил вход, и
вход из `@Component` наследника остался бы без сверки даже с полем в базе.
Поле входа — без `readonly`: с ним привязка при `strictInputAccessModifiers`
была бы ошибкой. `declare`, а не поле с `!`: при `useDefineForClassFields`
такое поле затёрло бы эмиттер базы. Декоратор нужен и метаданным базы: на
классе без него компилятор их обрывает, и вход `ctrl` пропал бы из шаблона
потребителя (`[ctrl]="btn"` — NG8002). Тип фабрики берётся из манифеста,
поэтому `descriptor` в нём — реэкспорт из `@soldy-ui/setup`: декларации пакета
называют его по имени (`typeof ButtonDescriptor`), а выведенный тип `const`
выписать не смогли бы (TS2883, TS7056).

### Реактивность

Состояние — сигнал: `useAdapter` держит `signal<Record<string, unknown>>` и
отдаёт `computed` типа `Signal<TInstanceState<TInstance>>`, шаблон читает
`state()['x']`. Раньше было поле + `cdr.markForCheck()`: `markForCheck`
помечает путь грязным, но не планирует проверку, поэтому работало только под
Zone.js и молча ломалось бы под `provideZonelessChangeDetection`. Сигнал
уведомляет шаблон сам.

### DOM-биндинг

Корень связывает с `TElementPlugin` базовый `TComponentBase` — по стратегии,
которую компонент передаёт в конструктор. По умолчанию (`'view'`) корень в
шаблоне помечен `#root`. Сигнальный запрос `viewChild('root', { read: ElementRef })`
объявлен полем базы, а `effect` читает его и переустанавливает связь при
пересоздании узла (переключение `rendered`, смена `tag` между веткой
`<button>` и `<div>`). Обычный `@ViewChild` + `ngAfterViewInit` читается один
раз и после пересоздания указывает на мёртвый элемент.

Запрос — именно поле: сигнальные запросы, как и `input`/`output`/`model`,
компилятор Angular распознаёт только в инициализаторе поля. Вызов внутри
метода проходит `tsc`, но роняет AOT с NG8110 — поэтому «Типы — Angular» в CI
гоняет `ngc`, а не `tsc`.

`TComponentViewComponent` — исключение (`'host'`): его корень это хост-элемент,
который живёт всё время, поэтому узел берётся из `inject(ElementRef)` один раз,
а наборы ядра (`aria`, `attrs`, `dataset`) раскладываются на хост в том же
`effect` — шаблона с `[ariaAttrs]` у хоста нет.

### Известные ограничения

- `tag` схлопывается до двух веток: `<button>` либо `<div>`. Произвольный тег
  (`a`, `span`) отрендерится как `<div>` — Angular не умеет менять имя тега.
- Нет двусторонней привязки: `[(text)]` требует аутпут `textChange`, а стратегия
  именования даёт `changeText`.
- Elevator (`TAngularElevator`) реализован, но никуда не подключён и передаёт
  значение через приватное поле, а не через DI — понадобится доработка, когда
  дойдёт до коллекций.

## Layer 8b: Svelte Adapter (`packages/ui/svelte/src`)

### ✅ IMPLEMENTED (Component / ComponentView / Stylable / Control / Textable / Button)

Svelte 5 на рунах. Структура зеркалит React, потому что механика событий та же —
колбэк-пропы:

- `adapter/common/` — `SvelteProfile` (`naming: SvelteNaming`,
  `defaultSlot: 'children'`), `SvelteNaming` (`prop` = `underscorePropNaming`,
  `event` = `callbackEventNaming` — обе стратегии общие с React).
- `adapter/runtime/` — `useAdapter.svelte.ts`: `useAdapter` поверх связки
  `adapter.connect(SvelteProfile)`. Расширение `.svelte.ts` обязательно
  там, где используются руны (`$state`, `$effect`, `$derived`).
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

- `adapter/common/` — `SolidProfile` (`naming: SolidNaming`,
  `defaultSlot: 'children'`), `SolidNaming` целиком собран из общих стратегий
  (`prop: underscorePropNaming`, `event: callbackEventNaming` — **третий**
  потребитель после React и Svelte), `renderSlot`.
- `adapter/runtime/` — `useAdapter` поверх связки
  `adapter.connect(SolidProfile)`.
- `adapter/elevator/` — `TSolidElevator` через `createContext`/`useContext`.

### Solid-специфика

- **Состояние — `createStore`, а не сигнал.** Store даёт реактивность на уровне
  отдельных свойств, поэтому изменение одного пропа не перерисовывает всё, что
  читает остальные. Запись — merge-формой `setState({ [name]: value })`:
  путевая форма `setState(name, value)` трактовала бы значение-функцию как updater.
- **props не деструктурируются** — это объект геттеров. Несъеденные пропсы
  отбирает `forward` связки, общий с React и Svelte (здесь — в `createMemo`),
  остальное читается напрямую. Поэтому проброс событий не нуждается в обёртке
  вроде `propsRef` из React: колбэк читается из `props` в момент события.
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

- `adapter/common/` — `WebcProfile` (`naming: WebcNaming`), `WebcNaming`
  (`prop` = общий `underscorePropNaming`, `event` = имя как в ядре: двоеточия в
  CustomEvent легальны, так же как во Vue), `attributes` (карта «атрибут →
  проп» по поверхности + коэрция).
- `adapter/runtime/` — `useAdapter` поверх связки
  `adapter.connect(WebcProfile)`, `TSoldyElement` (базовый класс),
  `defineProps`, `defineElement`.
- `adapter/template/` — `ITemplate`, `bind`, готовые привязки наборов ядра
  `ariaBinding` / `datasetBinding`.

### Чем Web Components проще Angular

`observedAttributes` — статический геттер, вычисляемый в рантайме при
регистрации класса, а не декоратор, который анализирует компилятор. Дескриптор
доступен на уровне модуля, поэтому **кодогенерация не нужна**:

```ts
static get observedAttributes() { return useAttributes(ButtonDescriptor()) }
```

### Чем сложнее всех остальных

**Готового примитива реактивности нет.** У пяти других адаптеров есть `ref`,
`useSyncExternalStore`, `signal`, `$state` или `createStore`. Здесь `useAdapter` держит
обычный объект, который заполняет подписка на связку, — и на каждое изменение зовёт
колбэк `onUpdate`.

Но информация об изменениях есть: `onUpdate(name, value)` сообщает, КАКОЙ проп
изменился. Поэтому Proxy не нужен — нужна связь «проп → DOM-операция», и она
задаётся шаблоном:

```ts
// button.template.ts
export const buttonTemplate: ITemplate<IButton> = {
	tag: (state) => String(state.tag ?? 'button'),
	create: (root) => { /* строит span, возвращает точки слотов leading/default/trailing */ },
	bindings: [
		ariaBinding,
		datasetBinding,
		bind('text', ({ content, state, hasSlot }) => { ... }),
	],
}
```

`TSoldyElement` копит имена изменившихся props в `_dirty`, откладывает флаш в
микротаску (одно изменение в ядре часто даёт несколько триггеров) и применяет
только те привязки, чьи props изменились. Смена `text` не трогает `className`.

Структурные props — `rendered`, `tag`, `classes`, `visible`, `attrs` (в нём и
`dir`, и нативный `disabled`) — применяет сама база: они одинаковы у всех
визуальных компонентов. Поэтому у шаблона ComponentView только две готовые
привязки — `ariaBinding` и `datasetBinding`, а класс элемента состоит только из
дескриптора, setup и ссылки на шаблон.

**Два входных канала.** Атрибуты (строки, для HTML) и свойства (любые значения,
для JS) — оба кормят `syncProps` адаптера, а тот — `inputs.delta` связки:
элемент отдаёт не полный набор пропсов, а то, что задано, — по одному атрибуту
или свойству. Выставленное до подключения уходит в сборку контекста. Атрибут
приводится к типу декларации; для Boolean действует HTML-семантика: значимо
наличие атрибута, поэтому `disabled="false"` это `true`, а снять флаг можно
только его удалением. Снятый атрибут другого типа приходит `undefined`, и
связка возвращает заданный раньше проп к умолчанию декларации.

### Решения по DOM

**Light DOM с внутренним элементом.** Классы из ядра остаются обычными
глобальными BEM-классами, поэтому тема работает без изменений — в отличие от
Shadow DOM, куда её пришлось бы вносить через `adoptedStyleSheets`, ломая
контракт «UI отдаёт классы, тема отдаёт CSS».

Внутри хоста рендерится настоящий `<button>` — сохраняются клавиатура, фокус и
участие в форме, которых у кастомного элемента самого по себе нет.

Плата: `<slot>` недоступен, поэтому пользовательское содержимое снимается с
хоста в `connectedCallback` и раскладывается вручную — по атрибуту `slot` в
точки, которые объявляет `create()` шаблона.

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
definePlugin({ ctor, namespace, contribution })   — контракт плагина, один раз; опции — .with(options) в дескрипторе
  ↓
defineDescriptor(() => defineComponent({ ctor, extends, contribution, plugins }))
  ↓
Descriptor (props, events, slots, plugins) — built once per type
  ↓
TSurface.of(descriptor, profile) — names in the framework: Vue props/emits,
  Web Components observedAttributes, Angular codegen of inputs/outputs
```

### Runtime (Component Initialization)

```
setup(props, { emit }) {
  1. createVueAdapterContext(Descriptor(), { ctrl, props })  // → createAdapterContext
     ↓
     six steps in one function (setup/protected/adapter/context):
     - instance (TButton), unless ctrl is passed
     - bundle tenancy: TOwnBundle (descriptor plugins, TExternalPlugins) or TSharedBundle
     - members of the exchange: instance, descriptor plugins, the binding (pluginProps)
     - initial values of props (TLine.seed, common naming)
     - registry plugins (usePlugins, useTheme); bundle:create and plugin create on a microtask
     ↓
  2. useAdapter(adapter, props, emit)
     ↓
     - adapter.connect(VueProfile): the exchange (TExchange)
     - state.subscribe: every property, then each change → Vue refs
     - watch per input prop → input.offer (changes only)
     - events.listen → emit, update:<prop> for v-model included
     - rootElement watch → adapter.bindElement → TElementPlugin
     - onUnmounted: unsubscribe, adapter.destroy()
     ↓
  3. Return { ctrl, plugins, rootElement, ...refs }
     ↓
     Template accesses: ref.value, @event, :prop
}
```

### Collection Pattern (Parent-Child)

```
Parent (TCollectionExtension, in setup layer; context.instance — фасад, владеющий engine):
  - elevator(ITEM_CONTEXT_ELEVATOR).down(engine)
  - context.bundle.get(TCollectionBundlesPlugin).bindEngine(engine)  // ссылка на движок в плагин, эмит 'engine:bound'
  - elevator(COLLECTION_ENGINE_ELEVATOR).down(register)
  ↓
  Child (TCollectionItemExtension, in setup layer; context.instance — фасад элемента):
    - elevator(ITEM_CONTEXT_ELEVATOR).up() → setContext(TItemContext элемента)
    - elevator(COLLECTION_ENGINE_ELEVATOR).up() → register(item, bundle)
    - Parent: 1) plain.push(item) — только для элемента из разметки; элемент из `items` уже в коллекции
              2) bundles.register(bundle, item)  // key = item.uid
    - meta: engine.extensions.meta.apply(item, props элемента)
    - Cleanup (destroy): plain.remove(item) для элемента из разметки → item:removed → реестр bundles чистится по событию

TCollectionBundlesPlugin (plugins layer):
  - хранит ссылку на движок (engine) + Map<uid, IPluginBundle> (только bundles, НЕ instances)
  - подписан на engine.extensions.plain.events: 'item:removed' (delete), 'reset' (clear)
  - порядок bundles всегда берётся из engine.extensions.batch.items → 'item:moved' не требует обработки
  - query: getByUid / getByItem / getAll / engine (полный доступ к состоянию коллекции)
```

Key files:

- `packages/plugins/src/custom/collection/bundles.plugin.ts` — TCollectionBundlesPlugin (+ TBundlesEvents) — реестр item-bundles + ссылка на движок; эмитит `engine:bound` при bindEngine, `bundle:registered` / `bundle:unregistered`
- `packages/plugins/src/custom/collection/collection-bundles-access.plugin.ts` — TCollectionBundlesAccess (abstract, доступ к bundles по uid/item/index)
- `packages/plugins/src/custom/collection/collection-elements.plugin.ts` — TCollectionElements (доступ к DOM-элементам через bundle.get(TElementPlugin))
- `packages/plugins/src/custom/tabs/` — TTabsLayoutPlugin / TTabsActiveTabPlugin (мигрированы из \_plugins), TTabsContentWarnPlugin, TTabsKeyboardPlugin (клавиатура APG Tabs: стрелки, Home/End, Delete). `TTabsViewPlugin` — плагин темы oren (`@soldy-ui/theme-oren/setup`), ставится её регистрацией `useTheme`
- `packages/plugins/src/custom/drag-and-drop/` — TDragPlugin (мигрирован из \_plugins; activate(engine), использует TCollectionElements + TCollectionBundlesPlugin)
- `packages/setup/content/extensions/collection/collection.extension.class.ts` — TCollectionExtension (движок берёт у фасада, передаёт его детям, bindEngine + push/register)
- `packages/setup/content/extensions/drag-and-drop/drag-and-drop*.extension.class.ts` — TDragAndDropExtension (down(true)), TDragAndDropCollectionExtension (up() → TDragPlugin.activate(context.instance.engine))
- `packages/setup/content/extensions/collection/collection-item.extension.class.ts` — TCollectionItemExtension (TItemContext через ITEM_CONTEXT_ELEVATOR + регистрация через COLLECTION_ENGINE_ELEVATOR + meta через `engine.extensions.meta`)
- `packages/setup/content/extensions/tabs/tabs-content-binding.extension.class.ts` — TTabsContentBindingExtension (панель находит таб по `value`, сторона панели в `aria`)
- `packages/setup/content/descriptors/plugins/` — CollectionBundlesPluginDescriptor, CollectionElementsPluginDescriptor (wired into Tabs, Accordion, ListBox, Select, Tags), TabsLayoutPluginDescriptor, TabsActiveTabPluginDescriptor, TabsKeyboardPluginDescriptor (Tabs), DragPluginDescriptor (Tabs, Accordion, ListBox)

---

## Key Architectural Patterns

### 1. **Descriptor Pattern**

Single source of truth for metadata. Enables:

- Inheritance (TextableDescriptor → ButtonDescriptor)
- Plugin composition
- Static framework declarations from the surface (`TSurface.of`)

### 2. **Exchange Pattern (Value Exchange per Mount)**

One exchange of values between the core and a framework (`TExchange`), shared by all six adapters. Enables:

- Framework-agnostic property/event access: state out (`state.subscribe` / `state.getSnapshot`), props in (`inputs.full` / `inputs.delta`), events out (`events.listen`)
- One write rule per property (`TLine`) for the instance, descriptor plugins and external plugins alike
- Namespace prefixing for plugins (`ns_name`) in the surface, through the profile's naming

Prop/event names per framework come from the surface (`TSurface.of(descriptor, profile)`), and the exchange (`adapter.connect`) connects them to the owners on mount — Layers 2 and 5b.

### 3. **Plugin System**

Extensibility via namespaced plugins:

- Each plugin = isolated behavior
- Props/events added via contribution
- Lifecycle: install → destroy

### 4. **Adapter Context (Registry)**

Container for:

- The component assembled on mount (`adapter/context/`): instance + bundle + members of the exchange
- Extensions (behavior customization)
- Root node binding (`bindElement`) and lifecycle management via events

### 5. **Elevator Pattern (Parent-Child Context)**

Framework-agnostic dependency injection:

- Vue: provide/inject
- React: React.Context
- Abstracts framework differences

### 6. **Headless + Renderer Separation**

- **Core** (@soldy-ui/core) - Business logic, no UI
- **Adapter** (@soldy-ui/vue) - Framework binding only
- Each framework can implement independently

---

## Missing/Incomplete Areas

Что готово в каждом адаптере — в [README, раздел Components](../README.md#components). Статус
ведётся там в одном месте: копия здесь устаревала отдельно от кода. Ограничения адаптеров —
в их разделах выше (Layer 7–8d).

---

## Package Exports

Собрано по бочкам: `index.ts` пакетов `core` (`src/`), `setup`, `plugins` (`src/`) и `src/index.ts` адаптеров. Точка входа у пакета одна — `.`; сверх неё только `@soldy-ui/theme-oren/setup`.

| Package                  | Main Exports                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| @soldy-ui/core           | Headless components: bases (`TEntity`, `TComponent`, `TComponentView`, `TControl`, `TValueControl`, …) and components (`TButton`, `TSelect`, `TTabs`, …) with their interfaces and props; collection engine (`TCollectionEngine`, standard extensions, commands, `TItemContext`), facades (`TCollectionComponent`, `TCollectionItemComponent`, `TBatchCollectionFacade`, …), `createEngine` / `createEngineActivation` / `createEngineSelection` and component builders (`createEngineTabs`, …); `TEvented`, `TStateUnit`; attribute sets `TAttributes`, `TAria`, `TDataset`, `TClasses`; theme registries (`TThemeRegistry`, `IComponentVariants`, `IButtonViews`, …); `shiftSize`, `frameDebounce`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| @soldy-ui/setup          | Описание: `defineDescriptor`, `defineComponent`, `definePlugin`, `defineType`, `IComponentDescriptor`, `IPluginDefinition`, контракты `IComponentContract` / `IPluginContract`, extractors (`DescriptorAllProps`, `DescriptorAllEvents`, `DescriptorPluginOutputs`, …). Дескрипторы компонентов (`ButtonDescriptor`, `TabsCollectionDescriptor`, …; типы их слотов — `DescriptorSlots`) и плагинов (`ElementPluginDescriptor`, …). Реестр: `usePlugins`, `useExtensions`, `defineTheme`, `useTheme`, `setIcons` / `getIcon` / `ICON_ROLES`; контракт внешнего плагина — `pluginContractOf`, типы `pluginProps` — `IExternalPluginProps` / `TExternalPluginProps`. Адаптер: `createAdapterContext`, `IAdapterContext`, `TInstanceContext`, `IAdapterContextOptions`, `IAdapterContextConfig`; `IAdapterProfile`, `CommonProfile`, `TSurface`, `TExchange`, `TMember`; описание свойства — `TName`, `TPropSpec`, `IContribution`, `IPropDefinition`, `ISlotDefinition` / `ISlotDeclaration`, `INamingStrategy`, `IContextElevator`; `toInstanceState`, `TInstanceState`, `TAdapterState`; `TAdapterProps`, `DescriptorComponentProps`, `DescriptorCallbackEvents`; slots (`resolveSlotName`, `DEFAULT_SLOT`, `TSlotProps`), `withParts`; extensions (`TCollectionExtension`, …), `TElevator` and elevator keys. Имена: `underscorePropNaming`, `callbackEventNaming`, `TCallbackEventProps`, `PLUGIN_PROPS`. |
| @soldy-ui/plugins        | `TBasePlugin`, `TPluginBundle`, `PLUGIN_EVENTS`, `IPlugin`, `IPluginContext`, `IPluginBundle`; plugin classes (`TElementPlugin`, `TReadyPlugin`, `TActionPlugin`, `TAriaPlugin`, `TAnchorPlugin`, `TDismissPlugin`, list, select, tabs and collection plugins, …); `toCssValue`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| @soldy-ui/vue            | Vue components (`Button`, `CheckBox`, …; collections with parts — `Tabs` with `Tabs.Item` / `Tabs.Content` and flat `TabsItem` / `TabsContent`; `Base*` declarations) + adapter (`createVueAdapterContext`, `useAdapter`, `useCollectionAdapter`, `useProps`, `useEmits`, `VueProfile`, `VueNaming`, `useIcon`, `useSplitAttrs`, `TVueElevator`, `VueElevatorFactory`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| @soldy-ui/react          | `Button`, `ComponentView`, `useSetupXxx` hooks, `useAdapterContext`, `useAdapter`, `ReactProfile`, `ReactNaming`, `TReactElevator`, `ReactElevatorFactory`, `renderSlot`, `toAriaProps`, prop types (`UseProps`, `UseDomProps`, `EventProps`, `SlotProps`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| @soldy-ui/angular        | `TButtonComponent`, `TComponentViewComponent`, `TComponentComponent`, `setupXxx`, generated names and surfaces (`ButtonInputNames` / `ButtonOutputNames` / `TButtonSurface`, …), `useAdapter`, `TInputValue` / `TOutputEmitter`, `TComponentBase`, `AriaDirective`, `SlotDirective`, `AngularProfile`, `AngularNaming`, `useInputs` / `useOutputs`, `TAngularElevator`, `AngularElevatorFactory`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| @soldy-ui/svelte         | `Button`, `ComponentView`, `setupXxx`, `useAdapter`, `SvelteProfile`, `SvelteNaming`, `TSvelteElevator`, `SvelteElevatorFactory`, prop types (`UseProps`, `UseDomProps`, `EventProps`, `SlotProps`, `TSnippetSlots`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| @soldy-ui/solid          | `Button`, `ComponentView`, `setupXxx`, `useAdapter`, `SolidProfile`, `SolidNaming`, `TSolidElevator`, `SolidElevatorFactory`, `renderSlot`, prop types (`UseProps`, `UseDomProps`, `EventProps`, `SlotProps`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| @soldy-ui/webc           | `<soldy-button>` (`TButtonElement`), `<soldy-component-view>` (`TComponentViewElement`), `setupXxx`, templates (`buttonTemplate`, `componentViewTemplate`), `TSoldyElement`, `defineElement`, `defineProps`, `useAdapter`, `useAttributes`, `bind` / `ariaBinding` / `datasetBinding`, `WebcProfile`, `WebcNaming`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| @soldy-ui/theme-oren     | CSS: `dist/index.css` (built by `npm run build --workspace=@soldy-ui/theme-oren`); types: `index.d.ts` — theme values of the appearance registries; `@soldy-ui/theme-oren/setup` — the theme object for `useTheme` and `TTabsViewPlugin`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| @soldy-ui/icons-material | Icons as data (`TIconSource`), a named export per icon — every role of `ICON_ROLES` and more; the app registers them via `setIcons`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

---

## Accordion ↔ Tabs parity (post collection-refactor)

Accordion is now a 1:1 mirror of Tabs. Only differences: component props (`view` vs orientation/alignment/position/view/closable) and the state extension (`selection` → `selected` vs `activation` → `active`).

- Core: `packages/core/src/components/custom/accordion/` — `TAccordion` (view only), `TAccordionItem` (text + arrowPlacement), `collection/` with `AccordionFactory` + `TAccordionExtension`/`TAccordionItemExtension` (item adapter exposes `view`, the item facade gives it as the `view` prop) + `TAccordionContentExtension` (header ↔ panel link, `aria-expanded`), like `TTabsContentExtension` at Tabs.
- Custom item classes removed (`TAccordionItemCustom`, `AccordionItemCustomDescriptor`, `AccordionItemCustomContribution`, `BaseAccordionItemCustom`) — single `TAccordionItem` remains, same in UI.
- Selection default mode is `'single'` (TSelectionExtension default); old Accordion default `'multiple'` is set explicitly by callers (e.g. `packages/ui/vue/__tests__/Accordion.test.vue` passes `mode="multiple"`).
- Vue: `Accordion.vue` renders `AccordionItem` for `shown` when items come from the `items` prop (fallback content of the default slot); `accordion/item/Item.vue` toggles via `context.adapters.selection.toggle()`, button view via `view`, header ARIA from the item's own `aria` set, panel side via `content_aria`, open state for the theme via `data-selected`.

---

## ListBox (после слияния с `TList`)

`TList` был headless-моделью списка, от которой рос `TListBox`. Слоя больше нет:
наследник у него был один, а второй потребитель раскладки — `TSelect` — растёт
от `TInputControl` и наследоваться от списка не мог в принципе.

- Core: `TListBox extends TValueControl` (+ `view` и списочные свойства), `TListBoxItem extends TValueControl` (`text` + свой `contentFit` без `expand`, где `undefined` = «взять у списка»). `value` списка — проекция выбора, её держит `TValueSelectionExtension`.
- Списочные свойства (`maxRows`, `contentFit`, `scrollBehavior`, `indicator`) — у самого компонента, по общему контракту `IList` (`packages/core/src/components/custom/list/types.ts`: только контракт, класса там нет) и общей декларации `LIST_PROPS` (`packages/setup/content/descriptors/components/list.ts`). Реализация у ListBox и Select своя — общего предка у них нет; расхождение копий стережёт `packages/core/__tests__/list-contract.spec.ts`. Раньше свойства лежали в плагине `TListLayoutPlugin` с `flatProps`; почему вернулись в ядро — комментарий в `list/types.ts`.
- Collections: `ListBoxFactory`. `TListBoxExtension` (`size`/`variant`/`view` элемента — списка; `disabled` элемента — своё или списка; `data-content-fit` и `data-indicator` элементам) ← `TBaseOwnerItemExtension`; item-адаптер `TListBoxItemExtension` (`view`, `indicator`) ← `TBaseItemExtension`.
- List-плагины живут в `packages/plugins/src/custom/list/` и типизированы по `IControl`, а не по элементу конкретного списка: навигации нужны только `uid`, `disabled`, `rendered`, `visible`, а опции Select и элементы ListBox общего предка ниже не имеют.
- Плагины: `TListItemPlugin` (только `highlighted`), `TListHeightPlugin` (высота по `maxRows`), `TListNavigationPlugin` (общая база навигации) → `TListKeyboardPlugin`, `TListScrollPlugin` (читает `scrollBehavior` у инстанса).
- Дескрипторы: `ListItemPluginDescriptor` (namespace `listItem` → `listItem_highlighted`), `ListHeight/Keyboard/ScrollPluginDescriptor`. ListBoxDescriptor подключает CollectionBundles + CollectionElements + ListHeight + ListKeyboard + ListScroll + Drag.
- `TListHeightPlugin` ограничивает высоту **родителя элементов**, а не корня компонента: у Select корень — поле, а список лежит в телепортированной панели.
