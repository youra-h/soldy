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
- **TBasePlugin**: Provides events, install/destroy/created lifecycle
  - Namespace is declared in the plugin descriptor (`definePlugin({ namespace })`), not on the class
  - Can add props/events via contribution

### Доступ к плагинам снаружи

Каждый плагин отдаёт событие `create` с самим собой. Список базовых событий
плагина объявлен **в слое плагинов** — `PLUGIN_EVENTS` в
[base/events.ts](packages/plugins/src/base/events.ts) — и подмешивается в
contribution каждого плагина явно:

```ts
export const ElementContribution = (): IContribution => ({
	events: [...PLUGIN_EVENTS, 'ready', 'removed'],
})
```

Так плагин остаётся единственным источником истины о собственных событиях.
Автоматическая подстановка внутри `definePlugin` (слой setup) была бы магией в
чужом слое, которой нельзя управлять из места объявления.

`install` и `destroy` наружу не выходят — это внутренняя механика bundle.
`create` эмитится не в `install`, а из `createBundle` и с задержкой на
микрозадачу: на момент установки подписчиков ещё нет, bundle собирается раньше,
чем фреймворк привязывает обработчики. См. Layer 5b.

### Plugin Examples
- `TElementPlugin` - Stores DOM element reference, emits 'ready'
- `TActionPlugin` (`custom/action/`, namespace `action`, на `ControlDescriptor`) - взаимодействие
  с пользователем: `press` (нормализованная активация: клик или Enter/Space, с гейтом по
  `disabled`), сырой `click`, `focus`/`blur` и двусторонняя связь `focused` с DOM-фокусом.
  Элемент берёт у `TElementPlugin` через `ctx.get(...)` — композиция, а не наследование
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
| `setIcons` / `getIcon` / `ICON_ROLES` | Реестр и контракт пакетов иконок. |

### Пакеты иконок — контракт, а не мешок SVG

Иконки устроены как темы: библиотека объявляет, что ей нужно, а пакет это
реализует. Контракт — закрытый список ролей `ICON_ROLES`
(`check`, `checkIndeterminate`, `close`, `arrowDown`, `arrowRight`); пакет
обязан закрыть их все, это проверяет conformance-тест.

Иконка приходит **данными**, не разметкой:

```ts
export type TIconSource = {
	viewBox: string   // система координат
	body: string      // содержимое <svg>, без самого тега
}
```

`body` без корневого `<svg>` — потому что корень строит адаптер: только так он
может задать размер, `aria-hidden` и классы.

Формат выбран под два ограничения, оба вскрылись на разборе прежнего решения:

**Никакой магии сборщика.** `@soldy/icons` экспортировал
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
setIcons({ close: myCloseIcon })   // точечно, поверх
```

Незарегистрированная роль даёт пустую заглушку и одно предупреждение в консоль.
Исключение бросать нельзя: из-за одной иконки упало бы всё приложение.

Пакет (`packages/icons/material/`): SVG в `src/*.svg` правятся глазами,
`src/index.ts` генерируется и коммитится — как метаданные Angular. Генератор
снимает `fill="#…"`, иначе иконка не наследует `currentColor`.

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

### Доступ к плагинам с обеих сторон (`createBundle`)

В soldy компонентом управляют двумя способами, и они обязаны быть равнозначны:
декларативно (шаблон) и императивно (инстанс). Для props и событий ядра это
выполняется само; для плагинов — нет, потому что bundle создаёт адаптер, а не
ядро, и с инстанса до него нет пути.

Эмит живёт в `createBundle`
([define-component.ts](packages/setup/descriptors/base/define-component.ts)) —
там же, где плагины и создаются:

1. `bundle:create` на `instance.events` — единственной шине, видимой обеим
   сторонам. Объявлено в `EntityContribution` рядом с `ctrl`: обе половины
   связки адаптера с инстансом.
2. `create` на каждом плагине bundle (через `plugin.created()`).

Порядок именно такой: обработчик `bundle:create` должен успеть подписаться на
плагинный `create`.

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
<Button :ctrl="btn" :plugins="bundle" />
```

Выглядит симметрично, но симметрии нет. `ctrl` необязателен: компонент умеет
построить рабочий инстанс по умолчанию, и переданный снаружи лишь заменяет одно
рабочее состояние другим. Набор плагинов — не параметр, а **инвариант
компонента**: собственные шаблоны адаптеров опираются на конкретные плагины
(`TElementPlugin` для DOM-биндинга, `TActionPlugin` для событий). Приняв bundle
снаружи, библиотека отдаёт пользователю возможность собрать компонент, который
не заведётся, и перестаёт отвечать за его работоспособность.

Инвариант уже зафиксирован в коде: `TPluginsBindingExtension` бросает
исключение, если в bundle нет `TElementPlugin`. Ровно та же логика относится к
`engine` у коллекций — его тоже не следует принимать пропом.

Отсюда правило: **bundle всегда собирается внутри, наружу отдаётся доступ к уже
созданному.**

Цена — `bundle:create` идёт по шине core, хотя плагины лежат слоем выше. Это
осознанное исключение, а не протечка зависимости: шина работает транспортом,
`packages/core` не импортирует `@soldy/plugins` и само событие не объявляет
(оно живёт в `EntityContribution`, слой setup).

Почему в `createBundle`, а не отдельным шагом в каждом адаптере: параллельный
механизм пришлось бы помнить и вызывать вручную в шести (а дальше — в семи)
местах. Здесь он срабатывает сам, потому что стоит там, где плагины рождаются.

Почему микрозадача, как у `engine:create`: адаптер подписывается на события уже
после того, как получил bundle из `createAdapterContext`, поэтому синхронный
эмит уходит в пустоту. Проверено — при синхронном эмите падают 8 тестов в
setup/vue/svelte/solid.

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
случаев подряд: `id` есть и у панели Collapse, и у списка Select, но
компонентами мы их не сделали. `id` оказался условием необходимым, но не
достаточным: он появляется у всего, на что кто-то ссылается, а компонентом
вещь делает то, что её размещают снаружи.

Критерий выведен из модели soldy, а не взят у Ark UI. Ark-таксономия
(`Root`/`List`/`Trigger`/`Content`/`Indicator`/`Label`/`Positioner`/`Backdrop`)
описывает библиотеку **без слотов**, где композиция возможна только частями. У
soldy слоты есть, поэтому позиционные части избыточны — иначе получилось бы два
способа делать одно и то же.

Второе расхождение важнее: у Ark табы не коллекция, поэтому у них `Trigger`. В
soldy `TTabs` наследует `TCollectionComponent`, `TTabsItem` —
`TCollectionItemComponent`, есть `engine.driver`, `extensions.selection`,
`engine:create` и реестр `TCollectionBundlesPlugin` по `uid`. Здесь часть — это
`Item`; `Trigger` создал бы вечное расхождение публичного API и ядра.

Прогон критерия:

| Часть | Адресует потребитель | Решение |
|---|---|---|
| `Tabs` | да | компонент |
| `TabsItem` | да — размещает и задаёт `value`/`text` | компонент |
| `TabsContent` | да — `<Tabs.Content value="a">` | компонент |
| `SelectItem` | да | компонент |
| панель Collapse | нет — только содержимое в слот | слот + проп `content_aria` |
| список Select | нет — он всегда один и внутри | разметка + проп `list_aria` |
| список табов | нет | слот |
| `CheckBox.Control` / `Indicator` / `Label` | нет | слоты |
| `Button.*` | — | частей нет |

Следствие для ARIA. У части-компонента есть экземпляр, значит есть и живой
набор `aria`, в который пишут ядро, плагины и расширения. У разметки без
компонента экземпляра нет — писать некуда, и её атрибуты отдаются пропом. Это
не исключение из правила «пишем в набор», а его граница.

Машин состояний это не вводит: части остаются подклассами
`TCollectionItemComponent` / `TComponentView`, проводка идёт через
существующий элеватор и `TCollectionBundlesPlugin`.

#### Точка — основная форма записи

`withParts` ([common/withParts.ts](packages/setup/common/withParts.ts)) вешает
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
+ `components: {}`) ищет `Tabs.Item` как имя в реестре, не находит и рендерит
пустоту — молча. Проверяется в `packages/ui/vue/__tests__/parts.spec.ts`,
включая сам факт ограничения.

### Нейминг коллекций и их частей

Владелец во множественном числе, если элементов много (`Tabs`), в единственном
— если коллекция сама по себе одна сущность (`ListBox`, `Collapse`). Часть
всегда `Item`, независимо от числа владельца.

| Коллекция | Части | Почему так |
|---|---|---|
| `Tabs` | `Tabs.Item`, `Tabs.Content` | панель — сосед списка, пишется отдельно, связывается по `value` |
| `Collapse` | `Collapse.Item` | панель внутри элемента, отдельно не существует → слот `item-content` |
| `ListBox` | `ListBox.Item` | панели нет вовсе: выбор ничего не раскрывает |

**Набор частей выводится из критерия, а не копируется между коллекциями.**
Панель есть и у Tabs, и у Collapse, но частью стала только у Tabs: у Collapse
она не имеет собственной идентичности — не существует отдельно от элемента и
не может быть сопоставлена другому. Одинаковый набор частей у всех коллекций
был бы признаком того, что критерий не применяли.

ARIA-связка при этом нужна обеим. У Tabs её потребляют два разных компонента
(`Tabs.Item` и `Tabs.Content`), у Collapse — один шаблон элемента, где рядом
лежат заголовок и панель. Считает её в обоих случаях item-адаптер расширения
`content`, фасад отдаёт готовые наборы (`tab_aria` / `header_aria` +
`content_aria`).

#### Слоты элементов: статические имена со scope

Когда элементы заданы пропом `items`, владелец рендерит их сам, а содержимое
берёт из слотов `item-<что>`, передавая элемент через scope:

```html
<slot name="item-leading" :item="item" />
<slot name="item" :item="item" />
<slot name="item-trailing" :item="item" />
<slot name="item-content" :item="item" />   <!-- Collapse: панель -->
```

Динамических имён (`item:${item.value}:leading`, `panel:${value}`) быть не
должно: их резолвит только Vue. Адресация конкретного элемента — условием
внутри слота по `item.value`.

### Коллекции: три слоя и расширения

Самая частая ошибка — смешать слои; она уже приводила к переписыванию.

| Слой | Отвечает за | Пример |
|---|---|---|
| Класс ядра | собственные props и events | `TTabsItem` — `value`, `text`, `closable` |
| Фасад коллекции | членство в коллекции | `TTabsItemCollectionFacade` — `active`, `order`, `tab_aria` |
| Расширение | функциональность сверх стандартной коллекции | `TTabsExtension` — закрытие вкладок |

**Класс ядра о коллекции не знает.** Ни движка, ни `bindEngine`, ни активности.
Если классу «нужен доступ к коллекции» — логика оказалась не в том слое.
`TTabsContent` держит только `value`; активность и ARIA-связку держит
`TTabsContentCollectionFacade`, ровно как `active`/`order` у элемента держит
`TTabsItemCollectionFacade`.

#### Когда заводить расширение

Стандартный набор — `core/components/base/collection/engine/extension/`
(`plain`, `batch`, `activation`, `order`, `unique`, `meta`, `factory`). Своё
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
    item/item.extension.ts           closable = item ?? parent
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
Collapse `aria-expanded`. Атрибут знает паттерн, а не механизм активации.

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
// contributions/components/button.ts
export type TButtonSlots = { leading: {}; default: { text: string }; trailing: {} }

export const ButtonContribution = (): IContribution => ({
	slots: {
		leading: { description: 'Перед текстом' },
		default: { scope: { text: defineType<string>(String) } },
		trailing: { description: 'После текста' },
	},
})
```

Дескриптор получил четвёртый фантомный параметр `TSlots` (с дефолтом `{}`,
поэтому существующие дескрипторы не переписывались), `getSlots()` и extractor
`DescriptorSlots<T>`. Слоты наследуются с перекрытием по имени: `ComponentView`
объявляет `default`, а `Button` уточняет его, добавляя scope.

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

| Адаптер | Спеллинг | scope |
|---|---|---|
| Vue | `<template #leading>` | `v-slot="{ text }"` |
| Svelte 5 | `{#snippet leading()}` | параметр сниппета |
| React | `leading={<Icon/>}` | `{({ text }) => …}` |
| Solid | `leading={<Icon/>}` | `{({ text }) => …}` |
| Angular | `<span slot="leading">` | `<ng-template slot let-text>` |
| WebC | `<span slot="leading">` | ✗ |

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
protected _syncDisabledAria(): void {
	const nativeDisabled = /* тег со своим disabled */
	this._aria.add('aria-disabled', this.disabled && !nativeDisabled ? 'true' : null)
}
```

`protected: true` в `ComponentViewContribution`, триггер один — `change:aria`.
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

| Источник | Что | Пример |
|---|---|---|
| ядро компонента | природа элемента | `role="tab"`, `role="status"`, `aria-disabled` |
| `TAriaPlugin` | имя и описание | `aria-label`, `aria-labelledby` |
| расширение коллекции | знание коллекции | `aria-selected`, связка `id`/`aria-controls` |
| плагин поведения | то, что меняется от взаимодействия | `aria-activedescendant` из `TSelectKeyboardPlugin` |
| проводка adapter-слоя | известное лишь при связывании | сторона панели `Tabs.Content` |

Кроме `aria-*` набор несёт `role` и `tabindex` — без них ARIA-паттерн не
работает: `<div role="button">` без `tabindex` нельзя сфокусировать, а значит
и активировать с клавиатуры.

**Граница набора.** Писать можно только туда, где есть экземпляр. У разметки
без компонента набора не существует, и её атрибуты отдаются пропом:
`content_aria` у панели Collapse, `list_aria` у списка Select. См. критерий
«часть или слот» — это его прямое следствие, а не исключение.

**Готовые паттерны.** Если для виджета есть паттерн WAI-ARIA APG — следуем ему;
расхождения объясняем в комментарии. Реализовано:

| Компонент | Паттерн | Ключевое |
|---|---|---|
| Tabs | Tabs | `tablist`/`tab`/`tabpanel`, связка `aria-controls` ↔ `aria-labelledby` |
| Collapse | Accordion | `aria-expanded` на заголовке, `role="region"` у панели |
| Select | Combobox (select-only) | `role="combobox"`, `aria-activedescendant`, фокус не уходит с поля |

Два правила, общих для всех трёх. `aria-selected="false"` ставится и на
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

Это единственный плагин с пропсами, которые пишутся снаружи. Ядро получает
пропсы через конструктор, плагины — нет, поэтому начальные значения доносит
`TPluginPropsExtension` (подключается, только если у плагина есть непротектед
пропсы).

### CSS не стилизуется по `aria-*`

ARIA — контракт со скринридером, `data-*` — с темой. Повод для правила —
реальная регрессия: `aria-selected` перенесли с обёртки на элемент с ролью, а
тема раскрывала панель Collapse селектором
`.s-collapse-item[aria-selected='true']`. Доступность починили — панели
перестали открываться, и ни один тест не заметил, потому что все проверяли
ARIA. Обёртка теперь отдаёт то же состояние как `data-selected`.

Раскладка по адаптерам: `v-bind="aria"` (Vue), спред объекта (Svelte, Solid),
`toAriaProps(aria)` (React — он ждёт `tabIndex`, а не `tabindex`), `ariaBinding`
(Web Components), директива `[ariaAttrs]` (Angular — единственный, где нет
спреда атрибутов).

### `direction` / `dir` — тот же приём для направления письма

`TComponentView` несёт writable-проп `direction: 'ltr' | 'rtl' | 'inherit'`
(дефолт `'inherit'`) и вычисляемый `get dir(): 'ltr' | 'rtl' | null` рядом с
`classes`/`aria`: ядро отдаёт готовое к разметке значение, адаптер только
биндит его на корень каждого визуального компонента (`:dir="dir ?? undefined"`
во Vue — vue-tsc типизирует `dir` у intrinsic-элементов как `string | undefined`
и не принимает `null`; спред/`?? undefined` в React/Svelte/Solid; `setAttribute`
в webc; `[attr.dir]` в Angular). `protected: true` в `ComponentViewContribution`,
триггер — `change:direction`.

Во Vue привязка добавлена во все 15 визуальных компонентов (всё, кроме
headless `DragAndDrop`); остальные адаптеры пока покрывают `ComponentView` и
`Button` — механика отрабатывается во Vue, потом переносится.

Почему `'inherit'` — явное значение, а не `undefined`: writable-проп обязан
уметь вернуться в исходное состояние, а слой синхронизации во всех адаптерах
трактует `undefined` как «не трогать» (`bindInput`: `if (value === undefined)
continue`). С `undefined` компонент, которому один раз задали `direction`, уже
нельзя было бы отпустить обратно на наследование. Перевод `'inherit' → null`
живёт в `get dir()`, поэтому сентинел не протекает в шесть шаблонов.

### Граница переиспользования между похожими компонентами

ListBox, список Select, будущие Menu и Popover выглядят одинаково, и напрашивается
`Select = Input + Frame + ListBox`. Разбор показал, что это ловушка.

**Списки одинаковы на вид и различны по семантике:**

| | ListBox | список Select | Menu |
|---|---|---|---|
| роль контейнера | `listbox` | `listbox` | `menu` |
| роль элемента | `option` | `option` | `menuitem` |
| где DOM-фокус | на контейнере | **на поле, не в списке** | на элементе |
| навигация | roving tabindex | `aria-activedescendant` | roving tabindex |
| элемент | выбирается | выбирается | выполняет действие |
| `aria-selected` | есть | есть | нет |

Проверка на коде: `ListBox.vue` держит `tabindex="0"` на корне, а
`TListKeyboardPlugin` слушает `keydown` там же — ListBox спроектирован как
самостоятельный фокусируемый виджет. У combobox фокус обязан оставаться на
поле. Вложить готовый ListBox в Select значит снимать ему `tabindex`, глушить
его клавиатурный плагин и перенаправлять подсветку наружу — то есть добавлять
ListBox режимы ради чужого компонента, после чего его тесты начнут охранять
два поведения сразу.

**Поэтому делим по слоям, а не по компонентам:**

| Слой | Общий? | Где |
|---|---|---|
| оверлей: якорь, позиционирование, z-index, закрытие | общий | `TFrame` + `TAnchorPlugin` + `TDismissPlugin` |
| поведение списка: подсветка, скролл, высота | общий | `TListItemPlugin`, `TListScrollPlugin`, `TListLayoutPlugin` |
| визуальная строка элемента | общий | `Button` внутри элемента + SCSS |
| движок коллекции, `selection`, `order`, `meta` | общий | `base/collection` |
| контейнер списка и его ARIA | свой | у каждого компонента |
| модель фокуса и клавиатура | своя | у каждого компонента |

Критерий: **общее — то, что не зависит от роли и модели фокуса.**

Дублирования разметки при этом почти нет, и оно решено давно: `ListBoxItem`,
`TabsItem`, `CollapseItem` и `SelectItem` рисуют строку одним и тем же
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

Стороны считаются через `left`/`right`/`top`/`bottom` от прямоугольника якоря,
поэтому самый частый случай (список под полем по левому краю) не требует знать
размер панели и не зависит от того, успела ли она отрисоваться. `flip`/`shift`
и уход от края экрана — отдельная задача, их здесь нет.

**`TDismissPlugin`** (`plugins/src/custom/dismiss/`, namespace `dismiss`) —
«нажали мимо». Слушает `pointerdown`, а не `click`: клик приходит после
отпускания кнопки, и до него успевает смениться фокус. Сам следит за
открытостью владельца (опция `property`, по умолчанию `open`) — иначе связку
«открыто ⇄ слушаем» пришлось бы писать в шаблоне каждого из шести адаптеров.

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
`TSelectExtension` синхронизирует их в обе стороны, флаг разрывает круг. При
установке расширения работает только направление `value → выбор`: на старте
выбор пуст, и обратный проход затёр бы значение, заданное пропом.

**Отдельного пропа `multiple` нет** — это `mode: 'single' | 'multiple'`
коллекции, как у ListBox. Два имени для одного состояния однажды разошлись бы.

**Отображаемый текст считает коллекция.** `TTextable` — сестра `TValueControl`,
а не предок (обе от `TControl`), поэтому `text` по наследству недоступен.
`valueText` — проп фасада, склеенный из текстов выбранных опций.

Клавиатура — `TSelectKeyboardPlugin`. Слушает `keydown` на корне Select, потому
что фокус не уходит с поля; панель при этом может быть телепортирована куда
угодно. Открытие стрелками и печатным символом, `Home`/`End`, `Escape`, `Tab`,
набор по буквам с буфером, пропуск недоступных опций, `aria-activedescendant`.

Он повторяет учёт подсветки из `TListKeyboardPlugin` — сорок строк из трёхсот.
Свести их в общий базовый плагин имеет смысл, когда обе реализации устоятся:
делать это авансом значит менять работающий ListBox под ещё неизвестное
требование.

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
- `useIcon(role)` — компонент иконки по роли из реестра. Строит разметку через
  `h('svg', { viewBox, innerHTML })`, а не `template`: последнее требовало бы
  рантайм-компилятор Vue. Роль резолвится на отрисовке, поэтому `setIcons()`
  может быть вызван позже создания компонента
- `useSplitAttrs()` — разделение `useAttrs()` на `{class, style}` и остальное
  (для составных компонентов с `inheritAttrs: false`)

Папки `composables/` больше нет: два оставшихся хелпера переехали сюда, к
остальному общему коду адаптера. Прочие (`useComponentSetup`, `useInstance`,
`useInheritProps`, `useEventState`, `composables/useSyncProps`) были удалены
раньше как мёртвый код поколения до адаптера; последний вдобавок коллидировал
по имени с `adapter/runtime/useSyncProps`, и наружу экспортировался именно
мёртвый.

Оба хелпера остаются Vue-специфичными: `useIconImport` строит компонент через
`defineComponent`/`markRaw`, `useSplitAttrs` — через `useAttrs`/`computed`.
Переиспользовать их в других адаптерах напрямую нельзя; общей была бы только
выжимка (поиск SVG по имени и правило разделения атрибутов), и её место —
`packages/setup/common/`, куда фреймворки не импортируются.

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
- [adapter/common/useSplitAttrs.ts](packages/ui/vue/src/adapter/common/useSplitAttrs.ts) - Разделение сквозных атрибутов

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
├── BaseTabs / BaseTabsItem
├── BaseListBox / BaseListBoxItem
├── BaseList / BaseListItem
├── BaseSelect / BaseSelectItem
├── BaseCollection / BaseCollectionItem
├── BaseFrame
├── BaseDragAndDrop
└── BaseInput
```

Select стоит здесь особняком: он единственный, кто собирает вместе форменный
контрол (`TInputControl`), коллекцию (параллельный фасад) и слой оверлея
(`TFrame` + `TAnchorPlugin` + `TDismissPlugin`). Порядок сборки описан выше,
в разделах «Граница переиспользования» и «Слой оверлея».

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

**Готового примитива реактивности нет.** У четырёх других адаптеров был `ref`,
`useState`, `signal`, `$state` или `createStore`. Здесь `useSyncProps` держит
обычный объект и зовёт колбэк.

Но информация об изменениях есть: `onUpdate(name, value)` сообщает, КАКОЙ проп
изменился. Поэтому Proxy не нужен — нужна связь «проп → DOM-операция», и она
задаётся шаблоном:

```ts
// button.template.ts
export const buttonTemplate: ITemplate = {
	tag: (state) => String(state.tag ?? 'button'),
	create: (root) => { /* строит span, возвращает узел для света */ },
	bindings: [
		bind(['disabled', 'tag'], ({ root, state }) => { ... }),
		bind('text', ({ content, state, hasLight }) => { ... }),
	],
}
```

`TSoldyElement` копит имена изменившихся props в `_dirty`, откладывает флаш в
микротаску (одно изменение в ядре часто даёт несколько триггеров) и применяет
только те привязки, чьи props изменились. Смена `text` не трогает `className`.

Структурные props — `rendered`, `tag`, `classes`, `visible` — применяет сама
база: они одинаковы у всех визуальных компонентов. Поэтому у шаблона
ComponentView привязок ноль, а класс элемента состоит только из дескриптора,
setup и ссылки на шаблон.

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
