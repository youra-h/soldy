# Soldy — Project Guidelines

## Overview

Monorepo (npm workspaces) headless UI-компонентной системы. Проект разрабатывает универсальные компоненты, которые работают под разные фреймворки: **Vue, React, Solid, Svelte, Angular**.

```
Core (бизнес-логика, headless)
  ↓
Accessor (контракты, TComponentAccessor, TDescriptorInspector)
  ↓
Setup (contributions, defineComponent/definePlugin, bindPlugins)
  ↓
Plugins (DOM-логика)
  ↓
UI (Vue / React / Solid / Svelte / Angular)
```

---

## Package Structure

| Пакет | Путь | Назначение |
|-------|------|------------|
| `@soldy/core` | `packages/core/` | Headless-ядро: классы компонентов, стейты, события |
| `@soldy/accessor` | `packages/accessor/` | Контракты (IContribution, ICompiledProp), TComponentAccessor (runtime-доступ), TDescriptorInspector (статический анализ имён) |
| `@soldy/setup` | `packages/setup/` | Конкретные contributions, defineComponent/definePlugin, bindPlugins |
| `@soldy/plugins` | `packages/plugins/` | DOM-плагины (element, instance, ready и др.) |
| `@soldy/foundation` | `packages/foundation/` | CSS-токены, Tailwind-тема, стили |
| `@soldy/icons` | `packages/icons/` | SVG-иконки (raw импорт) |
| `@soldy/ui-vue` | `packages/ui/vue/` | Vue-обёртки |
| `@soldy/ui-react` | `packages/ui/react/` | React-обёртки (частично) |
| `@soldy/ui-solid` | `packages/ui/solid/` | Solid-обёртки (пусто) |
| `@soldy/ui-svelte` | `packages/ui/svelte/` | Svelte-обёртки (пусто) |
| `@soldy/ui-angular` | `packages/ui/angular/` | Angular-обёртки (пусто) |

---

## Layer 1: Core (`packages/core/`)

Headless-ядро. Все компоненты — pure TypeScript, без DOM-зависимостей.

### Иерархия базовых классов

```
TEntity (абстракт)
  └── TComponent
        ├── rendered: TStateUnit<boolean>
        ├── visible: TVisibilityState
        ├── present (computed: rendered && visible)
        ├── show() / hide() — с событиями show/hide/show:before/after/hide:before/after
        └── events: show, hide, change:rendered, change:visible, change:present
        │
        └── TComponentView
              ├── tag: string | object
              ├── classes: TClasses
              ├── ready: boolean
              └── events: change:tag, change:classes, ready
              │
              ├── TStylable
              │     ├── size: TStateUnit<TComponentSize>
              │     ├── variant: TStateUnit<TComponentVariant>
              │     └── CSS-классы --size-*, --variant автоматически
              │
              ├── TInteractive (disabled, focused без Stylable)
              └── TControl extends TStylable
                    ├── disabled: TStateUnit<boolean>
                    ├── focused: TStateUnit<boolean>
                    └── events: change:disabled, change:focused
                    │
                    ├── TTextable extends TControl — text: TStateUnit<string>
                    └── TValueControl<TValue> extends TControl
                          ├── value: TStateUnit<TValue>
                          ├── name: string
                          └── events: change:value, input:value, change:name
                          │
                          └── TInputControl extends TValueControl
```

### Custom-компоненты (`packages/core/src/components/custom/`)

Каждый в своей папке: `button/`, `check-box/`, `switch/`, `icon/`, `spinner/`, `skeleton/`, `input/`, `tabs/`, `tree/`, `collapse/`, `list/`, `list-box/`, `drag-and-drop/`, `frame/`.

### Ключевые паттерны Core

- **TStateUnit<TValue, TEvents>** — значение + resolver + событие `change` с `TValuePayload`. Все изменяемые свойства компонента оборачиваются в `TStateUnit`.
- **TEvented<TEvents>** — обёртка над `TEventEmitter`. Ключевой метод: `relay()` — декларативный проброс событий из другого `TEvented` с переименованием (`as`) и pre-хуками (`then`). Это основной паттерн композиции.
- **TVisibilityState** extends `TStateUnit<boolean>` — show()/hide() с life cycle событиями.
- **TClasses** — управление CSS-классами: base (статический), statics (Set), dynamics (функции). Методы: add, remove, toggle, swap, swapClass, has, get, toArray.
- **TConstructor<T>**, **TAbstractConstructor<T>** — обобщённые конструкторы.
- **TComponentVariant**: `'normal' | 'accent' | 'positive' | 'negative' | 'caution'`
- **TComponentSize**: `'sm' | 'normal' | 'lg' | 'xl' | '2xl'`
- **TValuePayload<TValue>**: `{ newValue: TValue; oldValue: TValue }`

---

## Layer 2: Plugins (`packages/plugins/`)

Уровень пользовательской/доменной логики. Плагины добавляют поведение, связанное с DOM и жизненным циклом.

### Базовые понятия

- **TBasePlugin<TCustomEvents>** — абстракт: `key`, `events` (TEvented), `install(bundle)`, `destroy()`
- **TPluginBundle** — контейнер: `use(PluginCtor)`, `get(key/Ctor)`, `remove(Ctor)`
- **IPlugin<TEvents>** — интерфейс: `key`, `events`, `install()`, `destroy()`
- **TPluginConstructor<P>** — `{ new(): P, readonly key: symbol }`

### Основные плагины (`packages/plugins/src/common/`)

| Плагин | Ключ | Назначение |
|--------|------|------------|
| `TElementPlugin` | `'element'` | Управление HTMLElement. Методы: `element`, `ready(): Promise<HTMLElement>`. События: `ready` (после rAF), `removed` |
| `TInstancePlugin` | `'instance'` | Ссылка на core-инстанс. События: `ready`, `removed` |
| `TReadyPlugin` | `'ready'` | Мост: подписывается на `TElementPlugin.ready/removed` → устанавливает `instance.ready` |

Остальные плагины: `Spinner`, `Skeleton`, `Icon`, `Tabs` (active-tab, view, layout), `Collection`, `List`, `Collapse`, `DragAndDrop`, `InputControl`, `InputBool`, `Input`, `Frame`.

### Бандлы (`packages/plugins/src/bundles/`)

Фабрики предопределённых наборов плагинов:
- `createComponentViewBundle()` — TElementPlugin + TInstancePlugin + TReadyPlugin
- `createControlBundle()`, `createTabsBundle()`, `createCollapseBundle()`, `createListBundle()`, `createListItemBundle()`, `createCollectionBundle()`, `createInputControlBundle()`, `createInputBoolBundle()`, `createInputBundle()`, `createFrameBundle()`

---

## Layer 3: Accessor (`packages/accessor/`)

Чистые абстракции — контракты, доступ к свойствам/событиям, статический анализ имён. Без привязки к конкретным классам и фреймворкам.

### Контракты (`contract/types.ts`)

```ts
IPropContribution {           // Вход: декларация свойства в контрибуции
    name: string
    protected?: boolean
    triggers?: string[]
}

IContribution {               // Вход: декларация контрибуции
    props?: IPropContribution[]
    events?: string[]
}

ICompiledItem {               // Базовый скомпилированный элемент
    name: string
    namespace?: string         // undefined = компонент, string = плагин
}

ICompiledProp extends ICompiledItem {
    protected: boolean         // всегда нормализован
    triggers: string[]         // с префиксом namespace, если есть
}

ICompiledEvent extends ICompiledItem {}

IComponentSchema {            // Схема: props + events (контракт для TDescriptorInspector)
    props: ICompiledProp[]
    events: ICompiledEvent[]
}
```

### TComponentAccessor (`accessor.ts`)

Единая точка runtime-доступа к свойствам и событиям. Делегирует форматирование имён `TDescriptorInspector`'у.

```ts
class TComponentAccessor {
    constructor(props: ICompiledProp[], events: ICompiledEvent[], instance: any, pluginsMap: Map<string, any>)

    getProps(includeProtected?: boolean): ICompiledProp[]
    getEvents(): ICompiledEvent[]
    getExportName(item: ICompiledItem): string        // 'tag' или 'element:ready'
    getTriggers(prop: ICompiledProp): string[]         // с префиксами namespace
    getEventSource(item: ICompiledItem): any           // events объекта
    getValue(prop: ICompiledProp): any                 // читает из instance или плагина
    setValue(prop: ICompiledProp, value: any): void    // пишет (только не-protected)
}
```

### TDescriptorInspector (`inspector.ts`)

Статический анализатор схемы. Кэширует результаты. Используется UI-адаптерами на уровне модуля (без instance).

```ts
class TDescriptorInspector {
    constructor(schema: IComponentSchema)

    getExportName(item): string                        // namespace:name
    getExportTriggers(prop): string[]                   // триггеры с namespace
    getExportEvents(): string[]                         // события + триггеры (без update:*)
    getExportProps(defaultValues?): Record<string, any> // публичные пропы (без ctrl/plugins)
}
```

**Важно:** `getExportEvents()` не содержит `update:*` — это Vue-специфика, добавляется в `useEmits`. `getExportProps()` не содержит `ctrl/plugins` — их добавляет UI-слой.

### track (`runtime/track.ts`)

Односторонняя синхронизация: `Object.defineProperty` + callback. Используется для синхронизации props → instance.

---

## Layer 4: Setup (`packages/setup/`)

Конкретные реализации — связывает классы с абстракциями accessor'а.

### Структура

```
contributions/
  components/
    entity.ts              ← ctrl, plugins (protected)
    component.ts           ← rendered, visible, present
    component-view.ts      ← tag, classes
    icon.ts                ← size, width, height
  plugins/
    element.ts             ← TElementPlugin (ready, removed)
    instance.ts            ← TInstancePlugin (ready, removed)

descriptors/
  base/
    types.ts               ← IPluginDefinition, IComponentDescriptor
    compile-contribution.ts ← compileContribution(contribution?, namespace?)
    define-plugin.ts        ← definePlugin({ ctor, contribution? })
    define-component.ts     ← defineComponent({ ctor?, extends?, contribution?, plugins? })
  components/
    entity.descriptor.ts
    component.descriptor.ts
    component-view.descriptor.ts
    icon.descriptor.ts

adapter/
  createAdapter.ts          ← создаёт instance, bundle, accessor (без сайд-эффектов)
  bind-plugin.ts            ← bindPlugins(bundle, instance) → { bindElement }
```

### Ключевые функции

- **`compileContribution(contribution?, namespace?)`** — компилирует сырую контрибуцию. Если есть namespace — добавляет префикс к каждому триггеру (`'change:visible'` → `'element:change:visible'`).
- **`definePlugin({ ctor, contribution? })`** — создаёт определение плагина. Namespace извлекается из `ctor.key.description`.
- **`defineComponent({ ctor?, extends?, contribution?, plugins? })`** — создаёт дескриптор. Объединяет props/events/plugins от родителя (`extends`), свои и плагинов. Возвращает `{ ctor, props, events, plugins, createBundle(), createAccessor() }`.
- **`createAdapter(descriptor, { ctrl?, plugins?, props? })`** — создаёт `{ instance, bundle, accessor }`. Чистая функция, без сайд-эффектов.
- **`bindPlugins(bundle, instance)`** — устанавливает `instance` в TInstancePlugin, возвращает `{ bindElement(el) }` для TElementPlugin. Framework-agnostic.

### Паттерн наследования дескрипторов

```ts
EntityDescriptor        → ctrl, plugins
ComponentDescriptor     → extends: EntityDescriptor    + rendered, visible, present
ComponentViewDescriptor → extends: ComponentDescriptor + tag, classes, element, instance, ready
IconDescriptor          → extends: ComponentViewDescriptor + size, width, height
```

---

## Layer 5: Foundation (`packages/foundation/`)

Дизайн-токены и стили:
- `src/tailwind/index.css` — `@import "tailwindcss"` + тема
- `src/theme/default.css` — CSS-токены в `oklch()` для accent, positive, negative, caution, neutral (по 10 оттенков) + semantic token `--s-component-text`
- `src/styles/utilities.css` — вспомогательные утилиты

---

## Layer 6: Icons (`packages/icons/`)

SVG-иконки, импортируемые как raw: `arrowRight`, `check`, `checkIndeterminate`, `close`, `home`.

Использование: `import { arrowRight } from '@soldy/icons'`.

---

## Layer 7: UI Frameworks (`packages/ui/`)

### Vue (`packages/ui/vue/`) — реализован

Адаптеры (`ui/vue/src/adapter/`):

- **`useEmits(descriptor)`** — `new TDescriptorInspector(descriptor).getExportEvents()` + `update:*` для v-model
- **`useProps(descriptor)`** — `new TDescriptorInspector(descriptor).getExportProps(defaultValues)` + `ctrl`/`plugins`
- **`useRuntime(accessor, externalProps, emit?)`** — создаёт реактивные refs, подписывается на события/триггеры, синхронизирует props → accessor
- **`useAdapter(descriptor, props, emit?)`** — композиция: `createAdapter` + `useRuntime` + `bindPlugins` + Vue ref для element

Структура Vue-компонента:
```
{name}.vue              — шаблон + импорт setup
base.component.ts       — emits/props через useEmits/useProps (module-level, статика)
```

### React (`packages/ui/react/`) — частично

Реализованы: `Component.tsx`, `ComponentView.tsx`. Использует ручную подписку через `useEffect` + `instance.events.on()`.

### Solid, Svelte, Angular — не реализованы

---

## Data Flow

```
Vue Template
    │ props (вход от пользователя)
    ▼
useRuntime: watch external props → accessor.setValue(prop, value)
    │
    ▼
Core class (TStateUnit меняет значение)
    │ instance.events.emit('change:*')
    ▼
useRuntime: подписан на eventSource через accessor.getEventSource()
    │ получает событие → emit() в шаблон
    ▼
useRefs → реактивные refs → шаблон
```

**Ключевые потоки:**
1. **Props → Core:** `watch` → `accessor.setValue()` → пишет в instance или плагин
2. **Core → View:** события instance → `useRuntime` через `eventSource.on()` → `emit()` → шаблон
3. **Plugin lifecycle:** `bindPlugins(bundle, instance)` — instance после подписок → `TReadyPlugin` слушает element → `instance.ready = true`
4. **DOM → Plugin:** `bindPlugins.bindElement(el)` → `TElementPlugin.element = el`

---

## Conventions

- **Имена файлов**: kebab-case для файлов (`button.spec.ts`), PascalCase для классов (`TButton`, `TComponentView`)
- **Имена типов и интерфейсов**: префикс `I` для interface (`IContribution`, `ICompiledProp`), `T` для type и class (`TComponent`, `TStateUnit`, `TComponentAccessor`, `TDescriptorInspector`). Правило: класс — всегда `T`, интерфейс — всегда `I`.
- **События**: `change:{propName}`, `input:{propName}`, `{action}`, `{action}:before`, `{action}:after`
- **Тесты**: Vitest, файлы `*.spec.ts` в `__tests__/` рядом с исходниками
- **Стиль кода**: ESLint + Prettier (см. `eslint.config.ts`, `.prettierrc.json`)
- **Сборка**: TypeScript через tsc, каждый пакет имеет свой `tsconfig.json` (базовый — `tsconfig.base.json`)
