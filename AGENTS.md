# AGENTS.md

Guidance for AI coding agents working in the **soldy** monorepo.

## What this is

A headless UI component framework. Core business logic is **framework-agnostic**; each UI framework (Vue, React, Angular, Solid, Svelte) is a thin adapter package. Components are described by build-time metadata (descriptors) and wired to a framework at runtime through an adapter context.

## Commands

```bash
npm run dev:vue      # Vue demo (Vite)
npm run dev:react    # React demo
npm run dev:angular  # Angular demo (ng serve; predev прогоняет codegen)
npm run dev:svelte   # Svelte demo (Vite)
npm run dev:solid    # Solid demo (Vite)
npm run dev:webc     # Web Components demo (Vite, без фреймворка)
npm run test:core    # Vitest — @soldy/core
npm run test:setup   # Vitest — @soldy/setup
npm run test:accessor
npm run test:vue
npm run lint         # ESLint (auto-fix)
npm run format       # Prettier

# Тема отдаёт dist/index.css, который подключает сборка Angular (dist в .gitignore)
npm run build --workspace=@soldy/theme-oren

# Angular: перегенерировать статические inputs/outputs после правки дескриптора
npm run generate --workspace=@soldy/ui-angular
```

CI (`.github/workflows/ci.yml`) гоняет тесты, типы трёх пакетов, проверку дрейфа
`packages/ui/angular/src/generated` и сборки. Линт пока не блокирует.

- Node `^20.19.0 || >=22.12.0`, TypeScript 6 in **strict** mode, ESLint 10, Vitest 3, Vite 6.
- npm workspaces: `packages/*` and `packages/ui/*`.

## Layer boundaries (critical)

| Package | Responsibility |
|---|---|
| `packages/core` | Headless, framework-agnostic component models (`TEntity`, `TComponent`, `TCollectionEngine`, collection facades, extensions). |
| `packages/accessor` | Runtime reflection (`TComponentAccessor`, `TDescriptorInspector`). |
| `packages/setup` | Build-time metadata: `contributions/`, `descriptors/`, `adapter/`, `common/`. |
| `packages/plugins` | Runtime behavior extenders installed into `TPluginBundle`. |
| `packages/ui/*` | Framework adapters — the **only** place framework imports are allowed. |

**Rule:** `core`, `accessor`, `setup`, and `plugins` must **not** import `vue`, `react`, `solid`, `svelte`, `@angular/*`, `Ref`, or `PropType`. Framework-specific code belongs only in `packages/ui/*`.

## Naming conventions

- `T` prefix → type alias (e.g. `TCollectionEngine<TItem, TExtensions>`).
- `I` prefix → interface (e.g. `IComponent`, `IExtension`).
- Expose collection state through **facade getters** (`TCollectionComponent` / `TCollectionItemComponent` subclasses) — do not intersect separate input/output interfaces.

## Project-specific patterns

- **Contributions** are arrow-function factories returning an `IContribution` dictionary:
  ```ts
  export const ButtonContribution = (): IContribution => ({
    props: { view: { type: String, triggers: ['change:view'] } },
    events: ['click'],
  })
  ```
  `props` is a `Record<string, IPropDefinition>` — the prop name is the dictionary key, not a field.

- **Descriptors** are arrow-function factories too. Call them when used as `extends` / options (do not pass the function reference):
  ```ts
  export const ButtonDescriptor = () => defineComponent({ extends: TextableDescriptor(), ... })
  ```

- **Types live in `types.ts`**: type aliases and interfaces (`T*`, `I*`, `*Options`, `*Props`) belong in a `types.ts` file, never alongside the class implementation. Example: `TListCollectionFacadeOptions` lives in `collection/types.ts`, while `facade.ts` holds only the `TListCollectionFacade` class.

- **Branded prop types**: use `defineType<T>(ctor)` from `@soldy/setup` for phantom-typed contribution props (e.g. `defineType<TSelectionMode>(String)`).

- **Collections use facades**: the owner is a `TCollectionComponent` subclass (e.g. `TTabsCollectionFacade`) that owns a `TCollectionEngine` and exposes getters (`items`, `trackBy`, `activeItem`); the item is a `TCollectionItemComponent` subclass (e.g. `TTabItemCollectionFacade`) holding a `TItemContext`. Both are wired through `defineComponent` descriptors — there is no `defineCollection`/`defineExtension`.

- **Vue collection setup** creates two adapter contexts sharing one bundle: the owner component (`TabsDescriptor`) and the collection facade (`TabsCollectionDescriptor`, `{ bundle: adapter.bundle, defaultExtensions: [] }`), calls `useAdapter` on each and merges `{ ...refs, ...refsCollection }`. Items register through `TCollectionExtension`/`TCollectionItemExtension` over the elevator (provide/inject).

## Что общее, а что специфично для фреймворка

`packages/setup/common/` — поведение, одинаковое во всех адаптерах. Прежде чем
писать что-то в `packages/ui/*/adapter/common/`, проверь, не место ли этому здесь:

- `underscorePropNaming` — имя пропа одинаково везде (`ns_name`).
- `callbackEventNaming` — `element:ready` → `onElementReady`; общая стратегия
  для React, Svelte и Solid, где события это колбэк-пропы. Тип-зеркало —
  `TCallbackEventProps`. Своё именование событий остаётся только у Vue
  (`element:ready`) и Angular (`elementReady`) — по одному потребителю на каждое,
  поэтому они живут в своих адаптерах.
- `createInspectorFactory(naming)` — адаптер связывает со своей стратегией один раз.
- `collectEventBindings(accessor, inspector)` — дедуплицированный список подписок
  для проброса событий. **Дедупликация обязательна**: один raw-триггер объявлен у
  нескольких пропов (`present` в `ComponentContribution` повторяет триггеры
  `rendered` и `visible`), иначе потребитель получает два эмита на одно изменение.
  Дедуплицировать можно только проброс событий — синхронизацию состояния нельзя,
  `present` обязан пересчитываться на обоих триггерах.
- `resolveDefaultExtensions` (в `adapter/extensions/`) — уже применяется по
  умолчанию внутри `createAdapterContext`, передавать его вручную не нужно.

**Правило:** починил баг в одном адаптере — проверь остальные два. Исторически
исправления уезжали в React/Angular и не возвращались во Vue.

## Невизуальное против визуального

`TComponent` — база для **всего**, включая то, что не рендерится
(`TDragAndDrop`, фасады коллекций). Он даёт только события и реестр состояний.

`TComponentView` — визуальный слой: `rendered`/`visible`/`present`,
`show()`/`hide()`, `tag`, `classes`, `ready` + плагины element/ready.

**Новый компонент наследует `TComponentView`, если он рендерит элемент.** От
`TComponent` — только если он не имеет представления вообще. Раньше видимость
лежала в `TComponent`, и невизуальные компоненты получали ненужные им свойства;
подробности в `docs/architecture.md` (раздел Base Component Hierarchy).

## Контракт границы core → ui (критично)

**Внутри объекта мутируйте сколько угодно. Но то, что пересекает границу через
геттер, обязано быть значением, а не ручкой на живое состояние.**

Причина: адаптер узнаёт об изменении по смене идентичности. Если геттер отдаёт
объект, который мутировали на месте, ссылка та же — и ни Vue, ни React, ни
Angular изменения не увидят. Раньше это компенсировалось клонированием в
адаптере (`cloneValue`) с эвристиками и своей реализацией на каждый фреймворк;
теперь ответственность там, где есть знание о смысле значения — в ядре.

Два допустимых способа, оба уже применяются:

```ts
// 1. valueOf() отдаёт снимок — accessor.getValue делает val?.valueOf?.() ?? val
valueOf(): string[] { return this.toArray() }          // TClasses
public valueOf(): T[] { return [...this._storage.items] }  // драйвер коллекции

// 2. Объект заменяется целиком, а не мутируется
this._styles = { ...this._styles, [key]: value }       // layout-плагины
```

Антипаттерн, который это ломает:

```ts
this._styles[key] = value        // ❌ мутация на месте
get styles() { return this._styles }   // ❌ наружу уходит живой объект
```

Ловится тестами в `packages/setup/__tests__/value-identity.spec.ts`.

Смежное правило: **`change:*` эмитится только при реальном изменении.** Сеттеры
обязаны проверять текущее значение до эмита (сравни `show()` и `hide()` в
`component.class.ts` — асимметрия здесь однажды уже приводила к бесконечному
циклу ре-рендеров в React).

## Две поверхности управления (критично)

Компонентом управляют с двух сторон, и они обязаны быть равнозначны:

```ts
<Button text="x" @change:text="..." />          // декларативно, из шаблона
const btn = new TButton(); btn.text = 'x'       // императивно, из инстанса
btn.events.on('change:text', ...)
```

Для props и событий ядра это выполняется само. Для **плагинов** — нет: bundle
создаёт адаптер (`createAdapterContext`), и с инстанса до него не дотянуться.
Поэтому появилось `bundle:create` — эмитится на `instance.events`, то есть на
единственной шине, видимой обеим сторонам:

```ts
btn.events.on('bundle:create', (b) => b.get(TActionPlugin).events.on('press', h))
<Button :ctrl="btn" @bundle:create="onBundleCreate" />
<Button @action:create="$event.events.on('press', onPress)" />   // сахар
```

Свойством (`btn.plugins`) это выразить нельзя: до монтирования bundle не
существует.

### Почему bundle не принимается снаружи (уже пройденный путь)

Напрашивается симметрия с `ctrl`: раз готовый инстанс можно передать пропом,
почему не передать и готовый bundle — `<Button :ctrl="btn" :plugins="bundle">`?
Тогда подписаться на плагины можно было бы до первого рендера, без события и
без участия ядра. **Это обсуждалось и отвергнуто; не предлагайте снова.**

Симметрии здесь нет. `ctrl` необязателен, потому что компонент умеет построить
рабочий инстанс по умолчанию — передача своего лишь заменяет одно рабочее
состояние другим. Bundle так не работает: набор плагинов — это **инвариант
компонента, а не его параметр**. Приняв bundle снаружи, мы отдаём пользователю
возможность собрать компонент, который не заведётся, и перестаём отвечать за
его работоспособность.

Инвариант зафиксирован в коде: `TPluginsBindingExtension` **бросает
исключение**, если в bundle нет `TElementPlugin`. То же самое было бы с
`engine` у коллекций.

Поэтому bundle всегда собирается внутри (`createBundle`), а наружу отдаётся
доступ к **уже созданному** — через `bundle:create` и `<ns>:create`.

Цена решения: `bundle:create` идёт по шине core, хотя плагины — слой над core.
Это осознанное исключение, а не протечка. Шина используется как транспорт, не
как зависимость: `packages/core` не импортирует `@soldy/plugins` и не объявляет
`bundle:create` — событие живёт в `EntityContribution` (setup).

Эмит живёт там же, где плагины создаются, — в `createBundle`
(`descriptors/base/define-component.ts`). Не заводите для этого отдельный шаг,
который каждый адаптер обязан помнить и вызывать: седьмой адаптер про него
забудет.

Отложен на микрозадачу **по той же причине, что и `engine:create` в
`engine.class.ts`**: адаптер подписывается на события уже после того, как
получил bundle из `createAdapterContext`. Синхронный эмит проверен — ломает
8 тестов в setup/vue/svelte/solid.

`create` объявлен в слое плагинов (`PLUGIN_EVENTS` в
`packages/plugins/src/base/events.ts`) и подмешивается в contribution каждого
плагина **явно**. Не добавляйте его автоматически внутри `definePlugin`.

## Слоты — третья категория контракта

Рядом с `props` и `events` в `IContribution` есть `slots`. До их объявления
слоты жили только в разметке Vue-шаблонов, и «одна структура во всех
фреймворках» ничем не гарантировалась.

```ts
export type TButtonSlots = { leading: {}; default: { text: string }; trailing: {} }

export const ButtonContribution = (): IContribution => ({
	slots: {
		leading: { description: 'Перед текстом' },
		default: { scope: { text: defineType<string>(String) } },
		trailing: { description: 'После текста' },
	},
})
```

Тип-зеркало лежит рядом с contribution и меняется синхронно с ней — как
`TCallbackEventProps` для событий. Живёт в `setup`, **не в core**: у ядра
понятия слота нет, оно ничего не рендерит.

**`scope` — это данные внутрь слота, а не тип содержимого.**
`default: { text: string }` читается как «слот получает переменную `text`», а не
«в слот кладётся строка». Содержимое любого слота произвольно: текст, иконка,
таблица — компонент от этого не перестаёт быть собой. Ограничений на содержимое
контракт сейчас не выражает; если появится слот, где посторонняя разметка ломает
поведение, поле для этого добавляется в `ISlotDefinition` отдельно. Сторожит
`describe('слот не ограничивает содержимое')` в vue/react-тестах.

**Универсального компонента `<Slot name>` не будет.** В Svelte 5 `children` —
непрозрачная snippet-функция, сканировать до отрисовки нечего; перенос DOM
после монтирования ломается на `{#if}`/`{#each}`. И `<Slot>` с обычным
содержимым принципиально не умеет scoped-слоты: данные внутрь можно передать
только функции. Одинаковы имена, состав и scope — не синтаксис.

| Адаптер | Спеллинг | scope |
|---|---|---|
| Vue | `<template #leading>` | `v-slot="{ text }"` |
| Svelte 5 | `{#snippet leading()}` | параметр сниппета |
| React | `leading={<Icon/>}` | `{({ text }) => …}` |
| Solid | `leading={<Icon/>}` | `{({ text }) => …}` |
| Angular | `<span slot="leading">` | `<ng-template slot let-text>` |
| WebC | `<span slot="leading">` | ✗ нет механизма |

Единственное преобразование имени — `default` → `children` в React/Solid/Svelte
(`resolveSlotName` из `@soldy/setup/common`). Остальные имена одинаковы везде.

Особенности, о которые легко споткнуться:

- **Angular**: `<ng-content>` объявляется один раз и **вне `@if`** — иначе
  содержимое теряется при смене ветки. `SlotDirective` импортирует потребитель,
  а не компонент soldy.
- **WebC**: Shadow DOM не используется (тема — глобальные BEM-классы), свет
  распределяется вручную по атрибуту `slot`. Шаблон объявляет точки в
  `create()`; режим `before` нужен, чтобы обойтись без узлов-обёрток, которых
  нет в остальных адаптерах.
- **Solid**: `renderSlot` отличает функцию слота от ленивого мемо по арности
  (`content.length > 0`) — `JSX.Element` тоже бывает функцией, но без аргументов.

Расхождение разметки и контракта ловят conformance-тесты:
`packages/ui/vue/__tests__/slots.spec.ts` разбирает `.vue`-файл,
`packages/ui/webc/__tests__/button.spec.ts` сверяет ключи `template.create()`.

## DOM-события и доступность

Ядру DOM недоступен, но из этого не следует, что всё связанное с DOM обязано
жить в плагине. Правило простое: **значение — в ядро, операция — в плагин.**

`aria` — значение. Вычисляется в ядре ровно как `classes`: protected-проп,
геттер отдаёт свежий объект, шаблон раскладывает спредом (`v-bind="aria"`,
`{...toAriaProps(aria)}`, `[ariaAttrs]` в Angular — там нет спреда атрибутов).
Плагин на эту роль не годится: он пишет атрибуты после монтирования, и в
серверной разметке их не будет. `null` в значении означает «атрибут не ставить».

`TActionPlugin` (namespace `action`, подключён к `ControlDescriptor`) — операции:
слушатели, `focus()`, нормализация активации. Элемент берёт у `TElementPlugin`
через `ctx.get(...)` — композиция плагинов, а не наследование (тот же приём, что
в `TListKeyboardPlugin`).

- `action:press` — нормализованная активация: клик или Enter/Space, не приходит
  на `disabled`, одинакова на любом теге
- `action:click` — сырой DOM-клик; нужен стороне инстанса, потому что в шаблоне
  DOM-события и так доступны через fallthrough (`<Button @click="...">`)
- `focused` связан с настоящим фокусом в обе стороны

Слушатели цепляются по `element:ready`, а тот приходит через
`requestAnimationFrame` — в тестах ждите кадр, а не `nextTick`.

## Angular-специфика

- Angular AOT требует статические массивы в `@Component({ inputs, outputs })`,
  поэтому имена генерируются в `src/generated/*.metadata.ts` из `manifest.ts`
  каждого компонента. Файлы закоммичены; после правки дескриптора нужен
  `npm run generate` (CI проверяет дрейф).
- Состояние — сигнал (`state()` в шаблонах), а не поле + `markForCheck()`:
  `markForCheck` не планирует проверку и работал только благодаря Zone.js.
- Корень компонента живёт внутри `@if`, поэтому DOM-биндинг делается через
  `bindElementFrom(viewChild(...))` — обычный `@ViewChild` читается один раз в
  `ngAfterViewInit` и после пересоздания узла указывает на мёртвый элемент.
- `<ng-content>` объявляется ровно один раз и подставляется через
  `ngTemplateOutlet`: два слота во взаимоисключающих ветках теряют содержимое.

## Pitfalls

- `vue-tsc` requires exported, named types for portability. Use `ReadonlyArray<T>` instead of intersection types like `ReadonlyArray<T> & ICollectionStorageDriver<T>` when a type may leak into inferred types.
- `packages/setup/descriptors/base/compile-contribution.ts` exports `normalizeContribution` (not `compileContribution`) — check imports in specs that reference it.
- Tailwind `@apply` directives in `.vue` `<style>` blocks may produce CSS-parser warnings — pre-existing, not a code error.

## Docs

- `docs/architecture.md` — full adapter architecture overview (layers, descriptors/plugins/accessor, collection pattern, per-framework notes). Read it before touching adapter/descriptor/plugin code.
- `packages/ui/vue/demo/README.md` — Vue playground structure and usage.
