# Soldy — Project Guidelines

## Overview

Monorepo (npm workspaces) headless UI-компонентной системы. Проект разрабатывает универсальные компоненты, которые работают под разные фреймворки: **Vue, React, Solid, Svelte, Angular**.

```
Core (бизнес-логика, headless)
  ↓
Host (адаптационный слой: контракты, компиляция, Runtime)
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
| `@soldy/host` | `packages/host/` | Адаптационный слой: контракты (Contribution), компилятор (compileComponent), Runtime, AccessorProvider |
| `@soldy/plugins` | `packages/plugins/` | DOM-плагины (element, instance, ready-bridge и др.) |
| `@soldy/foundation` | `packages/foundation/` | CSS-токены, Tailwind-тема, стили |
| `@soldy/icons` | `packages/icons/` | SVG-иконки (raw импорт) |
| `@soldy/ui-vue` | `packages/ui/vue/` | Vue-обёртки (полноценно реализованы) |
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
        └── events: created, show, hide, change:rendered, change:visible, change:present
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
- **TPluginConstructor<P>** — `{ new(): P, readonly key: string }`

### Основные плагины (`packages/plugins/src/common/`)

| Плагин | Ключ | Назначение |
|--------|------|------------|
| `TElementPlugin` | `'element'` | Управление HTMLElement. Методы: `element`, `ready(): Promise<HTMLElement>`. События: `ready` (после rAF), `removed` |
| `TInstancePlugin` | `'instance'` | Ссылка на core-инстанс. События: `ready`, `removed` |
| `TReadyBridgePlugin` | `'ready-bridge'` | Мост: подписывается на `TElementPlugin.ready/removed` → устанавливает `instance.ready` |

Остальные плагины: `Spinner`, `Skeleton`, `Icon`, `Tabs` (active-tab, view, layout), `Collection`, `List`, `Collapse`, `DragAndDrop`, `InputControl`, `InputBool`, `Input`, `Frame`.

### Бандлы (`packages/plugins/src/bundles/`)

Фабрики предопределённых наборов плагинов:
- `createComponentViewBundle()` — TElementPlugin + TInstancePlugin + TReadyBridgePlugin
- `createControlBundle()`, `createTabsBundle()`, `createCollapseBundle()`, `createListBundle()`, `createListItemBundle()`, `createCollectionBundle()`, `createInputControlBundle()`, `createInputBoolBundle()`, `createInputBundle()`, `createFrameBundle()`

---

## Layer 3: Host (`packages/host/`)

Новый адаптационный слой, заменяющий старый `schema`. Архитектура:

```
Contribution (декларация свойств/событий)
  ↓
compileComponent() → ComponentModel (immutable DTO)
  ↓
Runtime (живая система: Accessor + подписки)
  ↓
useComponentRuntime() → reactive refs для шаблона
```

Ключевые концепции:
- **Contribution** — вклад от источника (компонент/плагин) с `ownerId` (symbol) и списком `events` и `props`
- **ComponentModel** — immutable DTO: `props: IContractProp[]`. События — такие же свойства с `kind: 'event'`
- **IContractProp** — `{ name, kind: 'state'|'computed'|'event', mutable, ownerId }`
- **Accessor** — интерфейс `{ get?, set?, subscribe }` — единый доступ к свойствам и событиям
- **AccessorProvider** — создаёт Accessor по IContractProp, фильтруя по `ownerId`. Для событий (`kind: 'event'`) Accessor имеет только `subscribe`, для свойств — ещё `get` (+ `set` если `mutable`)
- **AggregateAccessorProvider** — композит из нескольких провайдеров
- **Runtime** — единый механизм: для каждого свойства получает Accessor у провайдера, подписывается и нотифицирует подписчиков. Не различает свойства и события — всё через Accessor

Структура:
- `contract/` — `IContribution`, `IComponentModel`, `IContractProp`, `TPropKind`
- `compiler/` — `compileComponent()` — чистая функция, собирает модель из IContribution. События contribution превращает в свойства с `kind: 'event'`
- `runtime/` — `TRuntime`, `TAccessor`, `IAccessorProvider`, `TAggregateEventProvider`, `track()`
- `contributions/` — `IComponentContribution`, `IElementContribution`, `IInstanceContribution`
- `providers/` — `TComponentAccessorProvider`, `TElementPluginAccessorProvider`, `TInstancePluginAccessorProvider`

---

## Layer 4: Foundation (`packages/foundation/`)

Дизайн-токены и стили:
- `src/tailwind/index.css` — `@import "tailwindcss"` + тема
- `src/theme/default.css` — CSS-токены в `oklch()` для accent, positive, negative, caution, neutral (по 10 оттенков) + semantic token `--s-component-text`
- `src/styles/utilities.css` — вспомогательные утилиты

---

## Layer 5: Icons (`packages/icons/`)

SVG-иконки, импортируемые как raw: `arrowRight`, `check`, `checkIndeterminate`, `close`, `home`.

Использование: `import { arrowRight } from '@soldy/icons'`.

---

## Layer 6: UI Frameworks (`packages/ui/`)

### Vue (`packages/ui/vue/`) — полноценно реализован

Два подхода:
1. **`useRuntimeComponent(runtime, props, emit)`** — новый Runtime-based адаптер. Работает с `@soldy/host`. Создаёт реактивные refs из ComponentModel + Runtime, подписывается на изменения свойств и событий.
2. **`useComponentSetup({ Ctor, plugins, sync })`** — упрощённый вариант (без Runtime, прямая работа с core-классами).

Адаптеры (`ui/vue/src/adapter/`):
- **`useEmits(model)`** — генерирует Vue emits из ComponentModel: события как есть, свойства как `change:{name}` (+ `update:{name}` для mutable)
- **`useProps(model, ctor)`** — генерирует Vue props из ComponentModel + defaultValues конструктора

Модель компонента выносится в отдельный файл (`component-view.model.ts`), используется и для emits/props, и для Runtime.

Ключевые composables: `useEventState()`, `useSyncProps()`, `useElementBinding()`, `useComponentRuntime()`.

Структура Vue-компонента:
```
{name}.vue          — шаблон + импорт setup
{name}.model.ts     — compileComponent(...) — один источник модели
{name}.component.ts — опции (name, extends, emits, props) + sync-функция
```

### React (`packages/ui/react/`) — частично

Реализованы: `Component.tsx`, `ComponentView.tsx`. Использует ручную подписку через `useEffect` + `instance.events.on()`. Runtime-based адаптер (`useComponentRuntime`) пока не реализован.

### Solid, Svelte, Angular — не реализованы

Директории существуют, содержимое пустое (`export {}`).

---

## Data Flow (как это работает)

```
Vue/React Template
    │ props (вход от пользователя)
    ▼
runtime.setValue(name, value) ← watch external props
    │
    ▼
Core class (TStateUnit меняет значение)
    │ instance.events.emit('change:*')
    ▼
Accessor подписан на instance.events → Runtime.notify()
    │ EmitPayload { type: 'property' | 'event' }
    ▼
useRuntimeComponent → реактивные refs → шаблон
```

**Двунаправленная синхронизация:**
1. Props → Core: `watch` → `runtime.setValue()` → воздействует на instance через Accessor
2. Core → View: события instance → Accessor.subscribe → Runtime → useRuntimeComponent → реактивные refs
3. Plugin → Core: TReadyBridgePlugin слушает TElementPlugin → устанавливает `instance.ready`
4. DOM → Plugin: useElementBinding синхронизирует `$el` → TElementPlugin.element

---

## Conventions

- **Имена файлов**: kebab-case для файлов (`button.spec.ts`), PascalCase для классов (`TButton`, `TComponentView`)
- **Типы и интерфейсы**: префикс `T` или `I` (`TStateUnit`, `IEventSource`)
- **События**: `change:{propName}`, `input:{propName}`, `{action}`, `{action}:before`, `{action}:after`
- **Тесты**: Vitest, файлы `*.spec.ts` в `__tests__/` рядом с исходниками
- **Стиль кода**: ESLint + Prettier (см. `eslint.config.ts`, `.prettierrc.json`)
- **Сборка**: TypeScript через tsc, каждый пакет имеет свой `tsconfig.json` (базовый — `tsconfig.base.json`)
