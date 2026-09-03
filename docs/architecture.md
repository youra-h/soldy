# Soldy UI Component Adapter Architecture Overview

## Project Structure
Multi-package monorepo with framework adapters for Vue, React, Angular, Solid, Svelte.
Core business logic is **framework-agnostic** in `packages/core/src`.

---

## Layer 1: Core Components (`packages/core/src`)

### Role
Defines **headless (framework-agnostic)** component models with:
- Event emission via `TEvented`
- State management via `TStateUnit`
- Property tracking without UI binding

### Base Component Hierarchy
```
TEntity (base, property tracking)
├── TComponent (rendered, visible, events)
│   ├── TComponentView (tag, classes)
│   │   ├── TControl (disabled, focused)
│   │   │   ├── TInputControl (value tracking)
│   │   │   │   ├── TCheckBox
│   │   │   │   └── TSwitch
│   │   │   └── TValueControl (generic value)
│   │   ├── TTextable (text, size, variant)
│   │   │   └── TButton (view)
│   │   └── Other UI mixins
```

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
- `IComponentDescriptor` - Metadata contract
- `defineComponent(options)` - Create descriptor
- `definePlugin(options)` - Create plugin definition

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

## Layer 6: Vue Adapter (`packages/ui/vue/src`)

### ✅ COMPLETE IMPLEMENTATION

#### Static Layer (`adapter/static/`)
- `useProps(descriptor)` - Generate Vue props config from descriptor
- `useEmits(descriptor)` - Generate Vue emits array + update:prop triggers

#### Runtime Layer (`adapter/runtime/`)
- `useVue<TProps, TInstance>()` - Main hook (syncs props, events, DOM)
  - Returns TVueBinding with `ctrl`, `plugins`, `rootElement`, props refs
  - Subscribed to all events, syncs DOM via ref watchers
  - Calls adapter.destroy() on unmount
- `useSyncProps()` - Two-way prop binding
- `useSyncEvents()` - Event forwarding

#### Elevator (`adapter/elevator/`)
- `TVueElevator<T>` - Wraps Vue provide/inject

#### Common Utilities (`adapter/common/`)
- `createInspector()` - Unified TDescriptorInspector factory
- `VueNaming` - Vue naming strategy (camelCase props, dash-case events)

#### Composables (`composables/`)
- `useComponentSetup()` - Automated setup() generator
- `useSyncProps()`, `useSyncEvents()` - Prop/event sync
- `useBundle()`, `useInstance()` - Plugin bundle & instance injection
- `useInjectCollectionItem()`, `useProvideCollection()` - Collection patterns
- `useEventState()`, `useIconImport()` - Helpers

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
    return useVue<IButtonProps, IButton>(adapter, props, emit)
  }
  ```

### Key Files
- [adapter/static/useProps.ts](packages/ui/vue/src/adapter/static/useProps.ts) - Vue props factory
- [adapter/static/useEmits.ts](packages/ui/vue/src/adapter/static/useEmits.ts) - Vue emits factory
- [adapter/runtime/useVue.ts](packages/ui/vue/src/adapter/runtime/useVue.ts) - Main hook
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
- `adapter/common/` — `createInspector` (TDescriptorInspector + `ReactNaming`), `ReactNaming`, `resolveDefaultExtensions` (`[TPluginsBindingExtension]` only when descriptor has `TElementPlugin`, else `[]`), `naming.types.ts` (type-level mirror of `ReactNaming` for auto-derived event props)
  - props: same as Vue (`namespace_name`); events: `onXxx` callbacks (`change:visible` → `onChangeVisible`, `element:ready` → `onElementReady`)
  - `naming.types.ts` = PURE type transformers (`ReactEventName`, `ReactEventProps<T>`, `NamespacedEvents<T, N>`, `MergeEvents<T[]>`, `TDescriptorNamespace<T>`) mirroring `ReactNaming.event`; `plugins.types.ts` = per-plugin event props (`TElementEventProps`, `TFrameLayoutEventProps`, `TIconLayoutEventProps`, `TListItemEventProps`, `TSkeletonLayoutEventProps`, `TSpinnerLayoutEventProps`). **Namespace — единственный источник истины**: `IPluginDefinition<N>` + `definePlugin<N>` пробрасывают literal-namespace в тип дескриптора, а `TDescriptorNamespace<typeof XxxDescriptor>` выводит его оттуда (НЕ дублируется строкой в plugins.types.ts). Component event props derived from core types (`ReactEventProps<TButtonEvents> & TElementEventProps`), NOT hand-written
- `adapter/runtime/` — `useReact(adapter, props)` (main hook — takes a READY adapter, аналог `useVue`), `useSyncProps` (Core↔React state), `useSyncEvents` (event forwarding)
- `adapter/elevator/` — `TReactElevator` (React Context; `down`/`up` — collections NOT wired yet)
- `components/` — each component = 3 modules: `base.component.ts` (типы/props) + `setup.component.ts` (`useSetupXxx` hook, calls `createAdapterContext` directly) + view (`*.tsx`)
  - headless layers (`component`/`stylable`/`control`/`textable`): `base.component.ts` + `setup.component.ts` (no `.tsx` view, like Vue base layers)
  - concrete layers (`component-view`, `button`): `base.component.ts` + `setup.component.ts` + `.tsx` view

**Key design decisions (React-specific):**
- `useSetupXxx(props)` hook creates `IAdapterContext` once via lazy `useRef` (StrictMode-safe) and passes it to `useReact` — `createAdapterContext` is called DIRECTLY in setup hooks (not hidden in `useReact`), so users can pass custom `defaultExtensions`
- `useReact` returns `{ ctrl, plugins, ref, forwardProps, state }` — `state` = exported props (incl. protected `classes`/`present`), `forwardProps` = DOM attrs not consumed by the component (`ctrl`/`plugins`/`children` + prop/event names are consumed)
- DOM binding goes directly through `adapter.bundle.get(TElementPlugin).element` (not `TPluginsBindingExtension`) so it survives `adapter.destroy()` on StrictMode remount
- `useSyncProps` returns `{ state, bindOutput, bindInput, cleanup }` (mirrors Vue): `bindOutput()` = Core → React (subscribes to triggers, returns unsubscribe), `bindInput(props)` = React → Core (syncs props with `getValue === value` guard). `useReact` wires them via `useEffect(() => bindOutput(), [adapter, inspector])` + `useEffect(() => bindInput(props), [props, adapter, inspector])`
- `useSyncEvents`: `useLayoutEffect` (so rAF `ready` from TElementPlugin isn't missed); reads latest `props` via `propsRef`
- React naming quirk (same as Vue): protected `present` prop has triggers `change:rendered`+`change:visible`, so `onChangeVisible` fires TWICE per visible change

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
- `package.json` deps: `@soldy/accessor`, `@soldy/setup` added (Vue package.json is missing `@soldy/setup` by mistake)
- `tsconfig.json` paths + `vite.config.ts` aliases for `@soldy/accessor`, `@soldy/setup` added

### ⚠️ React pitfall: infinite loop via `visible` setter
- Core `TComponent.visible` setter calls `show()`/`hide()`, which emit `show:before`/`hide:before` **unconditionally** (before the `if (this.visible) return` guard). So writing `instance.visible = sameValue` still emits events.
- Fix in `useSyncProps.bindInput`: guard `if (accessor.getValue(prop) === value) continue` before `setValue`. Without it, event-logging demos re-render forever (Vue avoids it because `watch` only fires on actual value change).

---

## Layer 8: Angular & Svelte/Solid Adapters

### Current State
- **Angular**: Empty barrel export
- **Svelte**: Only index.ts (empty)
- **Solid**: Only index.ts (empty)

No implementation started.

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
  2. useVue(adapter, props, emit)
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
- Hooks (`useReact`, `useSyncProps`, `useSyncEvents`), elevator (`TReactElevator`), DOM/plugin binding — done
- [ ] All 20+ component implementations (only `component-view`, `button` done)
- [ ] Collection support (owner/item registration over the elevator)

### Angular (Not Started)
- [ ] Dependency injection adapter
- [ ] Component decorator integration
- [ ] Lifecycle hooks (ngOnInit, ngOnDestroy)
- [ ] Change detection synchronization
- [ ] All component implementations

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
| @soldy/setup | createAdapterContext, IAdapterContext, defineComponent, definePlugin |
| @soldy/plugins | TPluginBundle, TBasePlugin, TElementPlugin, IPlugin |
| @soldy/ui-vue | Vue components (Button, CheckBox, etc.), useVue, useProps, useEmits |
| @soldy/ui-react | Button, ComponentView, useReact, useSyncProps/useSyncEvents, useSetupXxx hooks, naming/plugins type transformers |
| @soldy/ui-angular | Empty (export {}) |
| @soldy/ui-svelte | Empty |
| @soldy/ui-solid | Empty |


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
