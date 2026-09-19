# AGENTS.md

Guidance for AI coding agents working in the **soldy** monorepo.

## What this is

A headless UI component framework. Core business logic is **framework-agnostic**; each UI framework (Vue, React, Angular, Solid, Svelte) is a thin adapter package. Components are described by build-time metadata (descriptors) and wired to a framework at runtime through an adapter context.

## Commands

```bash
npm run dev:vue      # Vue demo (Vite)
npm run test:core    # Vitest — @soldy/core
npm run test:setup   # Vitest — @soldy/setup
npm run test:accessor
npm run test:vue
npm run test:theme   # Vitest — инварианты токенов темы oren
npm run test:layout  # раскладка и действия браузера в настоящем Chromium (сам собирает тему)
npm run lint         # ESLint (auto-fix)
npm run format       # Prettier; CI проверяет `prettier --check .` в задаче `lint`
npm run changeset -- --patch @soldy/core -m "…"  # changeset для PR, см. «Версии пакетов»
npm run changeset:version  # выпуск: версии, CHANGELOG.md, package-lock (программист, /release)

# Тема отдаёт dist/index.css, который подключает стенд Vue (dist в .gitignore)
npm run build --workspace=@soldy/theme-oren

# Angular: перегенерировать статические inputs/outputs после правки дескриптора
npm run generate --workspace=@soldy/ui-angular
```

CI (`.github/workflows/ci.yml`) гоняет тесты всех пакетов (включая
`test:plugins`), типы по шагам «Типы — Core», «Типы — Setup», «Типы — Vue»,
«Типы — Plugins», «Типы — Playground», «Типы — React», «Типы — Svelte», «Типы —
Solid», «Типы — Web Components», «Типы — Angular», проверку дрейфа
`packages/ui/angular/src/generated` и сборки. «Типы — Angular» — это `ngc` без
эмита, а не `tsc`: кроме TS он проверяет шаблоны `@Component`
(`strictTemplates`) и ограничения AOT, которых `tsc` не видит (NG8110 и
подобные). `noEmit` стоит в самом `packages/ui/angular/tsconfig.json`: пакет
отдаётся исходниками, а без него `ngc -p` писал бы `.js` рядом с исходниками
`core`, `setup` и `plugins`. Сборки Angular в CI нет — у пакета пока нет
стенда. Линт и форматирование (`prettier --check .`) роняют CI отдельной
задачей `lint`. Задача `changeset` идёт только на PR и
требует changeset от PR, который меняет библиотечный пакет (см. «Версии
пакетов»). Отступы и ширину строки Prettier берёт из `.editorconfig`, в
`.prettierrc.json` их не дублировать.

Тесты `packages/core/__tests__`, `packages/plugins/__tests__` и
`packages/ui/vue/__tests__` тоже проверяются типами: «Типы — Core» гоняет
`tsc --noEmit` по `packages/core/tsconfig.json` (include `src` + `__tests__`),
«Типы — Plugins» — `tsc --noEmit` по `packages/plugins/tsconfig.json` (include
`src` + `__tests__`), «Типы — Vue» гоняет `vue-tsc` по
`packages/ui/vue/tsconfig.json` (включает `__tests__/**/*`), а не только по
`tsconfig.lib.json`, как раньше. Приведение вроде `as never` там больше не
спрячет несовпавший контракт компонента или плагина.

### Браузерный прогон (`test:layout`)

jsdom не считает раскладку (`getBoundingClientRect()` там всегда нули), поэтому
всё, что зависит от flex, ширин и переносов, проверяется в
`packages/playground/vue/browser/*.spec.ts` через `@vitest/browser` +
Playwright (конфиг `vitest.browser.config.ts`).

Туда же идут действия браузера по умолчанию: ввод символа, переключение
чекбокса, клик из Enter или пробела на `<button>`. jsdom их не выполняет, и
отменённое действие там не видно: корень контрола глушил Enter и пробел
вложенных полей и кнопок, а тесты оставались зелёными. Сторожит
`keyboard-activation.spec.ts`.

- Браузер — **Chromium, который ставит Playwright**, закреплённый ревизией из
  `package-lock.json`. Системный Chrome (`channel: 'chrome'`) не использовать:
  у каждого своя версия, расхождения выглядят как плавающие тесты.
- Перед первым прогоном на машине: `npx playwright install chromium`. Ставится
  в `%LOCALAPPDATA%\ms-playwright` (Windows) или `~/.cache/ms-playwright`.
  После апгрейда Playwright ревизия меняется — установить заново.
- Если загрузчик Playwright падает (`Download failure`, соединение с
  `cdn.playwright.dev` висит без данных), это его сетевой стек, а не сеть:
  скачать архивы curl-ом по URL из лога и распаковать в
  `ms-playwright/chromium-<rev>/chrome-win64/` и
  `ms-playwright/chromium_headless_shell-<rev>/chrome-headless-shell-win64/`,
  положив рядом пустой файл `INSTALLATION_COMPLETE`. Нужны **оба**: headless
  идёт через headless-shell.
- CI ставит Chromium сам: кэш `~/.cache/ms-playwright` по `package-lock.json`,
  `playwright install chromium` при промахе, `install-deps` всегда.

**Событие `error` на `window` роняет тест.** Хук
`packages/playground/vue/browser/setup.ts` (подключён в `setupFiles` конфига,
общий для всех браузерных спеков) слушает `error` у `window` на время каждого
теста, после двух кадров снимает слушателя и роняет тест с текстами пришедших
событий. Сам Vitest событие без поля `error` только печатает: так прогон
оставался зелёным при `ResizeObserver loop completed with undelivered
notifications`. Фильтра по тексту в стороже нет и быть не должно: пока на
`window` висит чужой слушатель `error`, Vitest ошибки окна не считает вовсе, и
отфильтрованное сторожем не увидел бы никто. Сторож красный — чинится причина,
а не он.

- Node `^22.12.0 || ^24 || >=26`, TypeScript 6 in **strict** mode, ESLint 10, Vitest 4, Vite 8.
- npm workspaces: patterns are in `workspaces` of the root `package.json`.

## Версии пакетов

Библиотечные пакеты `@soldy/*` — ядро, `accessor`, `setup`, `plugins`,
адаптеры `ui-*`, тема и иконки — идут **одной версией**. Адаптеры жёстко
привязаны к контракту `core` и `setup`: отдельные версии пакетов дали бы только
таблицу совместимости.

Версии и `CHANGELOG.md` ведёт [changesets](https://changesets.dev), конфиг —
`.changeset/config.json`:

- **общую версию задаёт группа `fixed`** — в ней все библиотечные пакеты, и
  выпуск поднимает их вместе. У корневого `package.json` версии нет: changesets
  двигает только пакеты воркспейса, и версия корня после первого же выпуска
  стала бы устаревшей копией;
- **стенд (`@soldy/playground-*`) — в `ignore`**: это инструмент, а не
  библиотека, он не выпускается и метаданных пакета не несёт. Новый стенд
  вносится в `ignore`, новый библиотечный пакет — в `fixed`. В обоих списках
  имена, а не glob: сторож сверяет их поимённо;
- пакеты `private`, публикации в npm нет. `privatePackages.version: true`
  обязателен: без него changesets private-пакеты не версионирует вовсе.
  Диапазоны `"@soldy/*": "*"` выпуск не переписывает
  (`bumpVersionsWithWorkspaceProtocolOnly`).

**PR, который меняет файлы библиотечного пакета, несёт changeset** —
`.changeset/<имя>.md`, иначе задача CI `changeset` красная. Правке вне
библиотечных пакетов — `AGENTS.md`, CI, `tools/`, стенд — changeset не нужен.
В changeset — пакеты, чьи файлы менялись, и уровень:

- ломающее изменение — `minor` (`0.1.0` → `0.2.0`), остальное — `patch`;
  `major` до `1.0` не бывает;
- выпускать нечего — поменялись только тесты или инструменты разработки
  пакета — пустой changeset.

Файл пишет команда. С флагами она ничего не спрашивает, без флагов уходит в
интерактивные вопросы:

```bash
npm run changeset -- --patch @soldy/core,@soldy/setup -m "Что изменилось для потребителя"
npm run changeset -- --minor @soldy/ui-vue -m "Что сломалось и как обновиться"
npm run changeset -- --empty
```

Описание попадает в `CHANGELOG.md` пакета как есть. Проверка CI локально —
`npx changeset status --since=origin/main`; новый changeset она видит только
после `git add`.

**Выпуск** — по команде владельца `/release`: программист от свежего `main`
запускает `npm run changeset:version` и открывает PR `Выпуск <версия>` из
ветки `release/v<версия>`, мержит его владелец (порядок —
`.claude/agents/developer.md`, «Выпуск»). Команда поднимает версию группы,
собирает `CHANGELOG.md` из changeset'ов, удаляет их и обновляет
`package-lock.json`: версии воркспейсов записаны и там. Задача CI `changeset`
на ветках `release/*` не запускается — changeset'ы в выпуске уже удалены, и
она бы его уронила; поэтому ветка `release/*` — только для выпуска. Версии и
`CHANGELOG.md` руками не правятся, PR задачи версию не трогает.

Сторожит `packages/setup/__tests__/workspace-manifests.spec.ts`. Библиотечные
пакеты для него — пакеты из `workspaces` корневого манифеста, кроме `ignore`;
у каждого непустой `description`, `license` — `MIT`, `repository.directory`
совпадает с путём пакета, `version` задана. Цели `main`, `types`, `style` и
`exports` (вглубь) — файлы пакета, а цель, которую игнорирует git, — выход
сборки: она допустима, только если у пакета есть скрипт `build`. Версия у всех
одна, у корня её нет; `fixed` — одна группа ровно из библиотечных пакетов;
каждое имя из `ignore` — пакет воркспейса; ни один changeset не объявляет
`major`, пока версия `0.x`. Новый пакет попадает под проверку сам.

## Никаких костылей (критично)

Костыль — это решение, которое **обходит** проблему вместо того, чтобы её
убрать. Оно дешевле в моменте и всегда дороже потом: за ним никто не следит, а
следующий человек читает его как норму. Запрет распространяется и на код, и на
тесты, и на конфиги.

Чего делать нельзя:

- **Ветвление в общем методе ради частного случая.** Если операция ведёт себя
  иначе — это отдельный метод, а не флаг или `if` внутри. Чтение и запись
  состава коллекции поэтому разведены: `driver.execute()` меняет хранилище и
  шлёт `change:items`, `driver.query()` возвращает выборку и не шлёт ничего.
  Один метод с режимом внутри был бы ровно таким костылём.
- **Приведение типа, чтобы заткнуть несоответствие.** `as any`,
  `as unknown as X` и `!` вместо проверки прячут ошибку, а не чинят её. Если
  типы не сходятся — неверен контракт, править надо его. Во всём репозитории
  это стережёт eslint (`eslint.config.ts`, блок `soldy/no-casts`): `as never`,
  `as unknown as X`, `as TEvented<…>`, угловое приведение `<T>x`, `x!`
  (`@typescript-eslint/no-non-null-assertion`), `@ts-ignore` и `@ts-nocheck`
  роняют CI. Definite assignment у поля (`protected _x!: boolean`) — не
  приведение, правило его не ловит. В тестах ядра блок `soldy/core-tests-no-any`
  запрещает ещё и `any` в любом типе. Что блоки включены на своих путях,
  проверяет `npm run test:eslint`. Честный `@ts-expect-error` с пояснением не
  запрещён. Блок действует и на `<script lang="ts">` компонентов `.vue` и
  `.svelte`. Исключённых путей у блока нет.
- **Второй путь к тем же данным.** Свой кэш «чтобы не дёргать расширение»,
  дубль геттера, копия состояния рядом с источником. Два пути неизбежно
  расходятся, и расхождение всплывает не там, где сделано.
- **Временное исключение без срока.** Allow-путь в стороже, отключённый тест,
  `eslint-disable` — только вместе с заведённой задачей на снятие, и
  комментарий должен говорить «временно, до <задача>», а не объяснять, почему
  так правильно.
- **Документация авансом.** Не описывать в этом файле правило, гарантии
  которого ещё нет в коде: запись и сторож появляются одним коммитом.

Если правильное решение выходит за рамки задачи — **не делать половину молча**.
Сказать, что упёрлись, и получить решение: сузить задачу или расширить. Тихо
поставленный костыль хуже и невыполненной задачи, и прямого отказа.

## Layer boundaries (critical)

| Package             | Responsibility                                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `packages/core`     | Headless, framework-agnostic component models (`TEntity`, `TComponent`, `TCollectionEngine`, collection facades, extensions). |
| `packages/accessor` | Runtime reflection (`TAccessor`): свойства и события компонента, привязанные к своим владельцам.                              |
| `packages/setup`    | What all adapters share: describe, assemble and wire a component — see «Структура `packages/setup`».                          |
| `packages/plugins`  | Runtime behavior extenders installed into `TPluginBundle`.                                                                    |
| `packages/ui/*`     | Framework adapters — the **only** place framework imports are allowed.                                                        |

**Rule:** `core`, `accessor`, `setup`, and `plugins` must **not** import `vue`, `react`, `solid`, `svelte`, `@angular/*`, `Ref`, or `PropType`. Framework-specific code belongs only in `packages/ui/*`.

### В адаптере не должно быть логики (критично)

Обратное правило к предыдущему, и нарушают его чаще. `packages/ui/*` — это
**проводка**: два адаптерных контекста, ссылка на DOM-узел, раскладка набора
атрибутов в разметке. Всё остальное — поведение, и ему место ниже.

Признак нарушения простой: если написанное придётся повторить в пяти других
адаптерах — оно написано не там. Поменяешь в одном, забудешь в остальных.

Так делать нельзя:

```ts
// packages/ui/vue/.../setup.component.ts
watch(
  () => instance.open,
  (open) => {
    dismiss.enabled = open
  },
)
dismiss.events.on('dismiss', () => {
  instance.open = false
})
```

Связка «открыто ⇄ слушаем нажатия мимо» одинакова для Select, Menu и Popover
во всех шести адаптерах — значит живёт в `TDismissPlugin`, который сам следит
за свойством владельца.

Куда класть поведение: **плагин** (работа с DOM и жизненный цикл),
**расширение коллекции** (то, что требует владельца и списка сразу),
**расширение адаптера** (`setup/adapter/extensions/` — проводка, общая для
всех фреймворков), **событие или триггер** (если нужно просто сообщить).

### Механизмы фреймворка — только в адаптерном слое (критично)

`packages/ui/<fw>` состоит из двух частей, и правила у них разные:

- **адаптерный слой** `src/adapter/**` — единственное место, где работают
  внутренние механизмы фреймворка: реактивность, хуки жизненного цикла,
  контекст. Каждый фреймворк реализует адаптер по-своему, но отдаёт
  компонентам одно и то же. Норма: `rootElement = ref<Element | null>(null)`
  и `watch(rootElement, (el) => pluginsExt.bindElement(el))` в
  `ui/vue/src/adapter/runtime/useAdapter.ts`, `provide` в
  `ui/vue/src/adapter/elevator/`;
- **компоненты** `src/components/**` — только проводка того, что отдал
  адаптер: контексты из `createAdapterContext`/`useAdapter`, привязка
  `rootElement` в разметке, раскладка набора (`v-bind`, спред), регистрация
  дочерних компонентов.

В компоненте **нельзя** заводить свои механизмы фреймворка:

| Фреймворк | Чего нет в компоненте                                                                                           |
| --------- | --------------------------------------------------------------------------------------------------------------- |
| Vue       | `ref`, `shallowRef`, `reactive`, `computed`, `watch`, `watchEffect`, `on*`-хуки, `nextTick`, `provide`/`inject` |
| React     | `useState`, `useEffect`, `useLayoutEffect`, `useMemo`, `useCallback`, `useRef`, `useContext`                    |
| Solid     | `createSignal`, `createMemo`, `createEffect`, `onMount`, `onCleanup`, `useContext`                              |
| Svelte    | `$state`, `$derived`, `$effect`, `onMount`, `onDestroy`, `getContext`/`setContext`                              |
| Angular   | `signal`, `computed`, `effect`, `ngOnChanges`/`ngAfterViewInit` и прочие хуки                                   |

Если компоненту понадобился такой механизм, значит адаптер не справляется, а
обход в компоненте это прячет и расходится между шестью фреймворками. Реальный
случай (PR #47): `TAnchorPlugin` требовал `HTMLElement`, `rootElement` адаптера
типизирован `Element`, и в Vue Select появилось
`anchorElement: computed(() => rootElement.value as HTMLElement | null)`.
Исправлено в контракте: якорю хватает `Element`, и Select отдаёт
`rootElement` напрямую.

Что делать вместо обхода — по порядку:

1. поправить контракт (тип пропа плагина, типы адаптера), если несовпадение в нём;
2. положить поведение в плагин, расширение коллекции или расширение адаптера;
3. если существующей механики не хватает — **остановиться и сообщить**:
   программист отдаёт задачу владельцу (OVERVIEW) с предложением новой
   механики адаптера. Решать молча нельзя.

Vue-компоненты снимают Vue-прокси с `ctrl`/`engine` не сами: контекст создают
через `createVueAdapterContext` (`packages/ui/vue/src/adapter/common/`), она
и вызывает `toRaw`. Сторож — блок eslint `soldy/vue-components-no-framework`
(`eslint.config.ts`): запрещает импорт `'vue'` и `createAdapterContext` из
`@soldy/setup` в `packages/ui/vue/src/components/**`.

Тот же контроль для Solid, Svelte и Angular, у которых такого eslint-блока
нет: `packages/setup/__tests__/framework-mechanisms-components.spec.ts`
сканирует `packages/ui/{solid,svelte,angular}/src/components/**` на имена из
таблицы выше.

React-компоненты держат adapter-context между рендерами не сами: вместо
своего `useRef` они зовут `useAdapterContext` (`packages/ui/react/src/adapter/runtime/`)
с фабрикой, которая создаёт контекст. Сторож — блок eslint
`soldy/react-components-no-framework` (`eslint.config.ts`): запрещает
значения из `'react'` (в том числе `React.useRef` через namespace-импорт) в
`packages/ui/react/src/components/**`, `import type` пропускает.

### `setup/adapter/extensions/` — тоже не место для операций над DOM

Расширение адаптера — проводка, общая для всех фреймворков, но это не
индульгенция на поведение. Правило «значение — в ядро, операция — в плагин»
(см. «Доступность (a11y)», раздел «Прочее») действует и здесь: расширение
адаптера **читает и связывает значения** (props, `aria`, элементы коллекции),
но не читает DOM-узел и не решает, что с ним делать.

Реальный случай: диагностика «`Tabs.Content` оказался внутри
`[role="tablist"]`» сначала легла в `TTabsContentBindingExtension`
(`setup/adapter/extensions/tabs/`) — расширение само брало
`TElementPlugin` из bundle и проверяло `el.closest('[role="tablist"]')`.
Код не импортировал `vue`/`react`/итд, поэтому формально не нарушал главное
правило границы — но `el.closest(...)` это операция над DOM, а не проводка,
и ей место в плагине. Исправлено переносом в `TTabsContentWarnPlugin`
(`packages/plugins/src/custom/tabs/content-warn/`), подключённый через
`TabsContentDescriptor`.

**Правило:** как только в коде `setup/adapter/extensions/` появляется
`el.closest`, `el.querySelector`, `el.getAttribute`, обход `childNodes`,
`console.warn`/`console.error` по результату такой проверки или любое другое
чтение живого DOM-узла — это плагин, а не расширение адаптера. Расширению
можно передать сам DOM-узел или значение, полученное от плагина, но не
вычислять факты о нём самостоятельно.

## Структура `packages/setup`

Setup — всё, что у шести адаптеров общее: описание компонента, его сборка на
монтирование и проводка к фреймворку. Слой разложен по стадиям жизни
компонента, у каждой стадии свои папки:

1. **Описание** (`define/`, `descriptors/`) работает с типом компонента,
   инстанса ещё нет: дескриптор и определение плагина. Один файл на компонент —
   наследование, пропсы, события, слоты и плагины вместе. Дескриптор строится
   один раз на тип — `defineDescriptor` кэширует фабрику.
2. **Сборка** (`assemble/`) — на одно монтирование: инстанс (`ctrl` или
   `ctor`), признак `embedded`, состав компонента, набор плагинов (свой или
   общий), аксессор и начальные значения пропсов — единственная точка
   инициализации «фреймворк → ядро» для всех адаптеров (`applyInitialProps`).
3. **Связывание** (`adapter/`) — то, что зовут адаптеры: контекст, его
   расширения, лифт и общие функции. Связка отдаёт фреймворку состояние
   подпиской (`subscribe`) — это и есть инициализация «ядро → фреймворк».

Рядом со стадиями — `registry/`, регистрации приложения, которые сборка и
расширения коллекций читают, и `naming/`, имена, нужные и описанию, и
адаптерам.

| Модуль         | Что в нём                                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `naming/`      | Имена публичного API — проп `ns_name` и событие-колбэк `onElementReady` — и их тип-зеркала.                                 |
| `define/`      | Как строится дескриптор: декларации, наследование, умолчания, `defineType`, вывод типов.                                    |
| `descriptors/` | Дескрипторы компонентов и определения плагинов: объявления прямо в них, по файлу на компонент.                              |
| `assemble/`    | Компонент на одно монтирование: инстанс, `embedded`, состав, набор с `bundle:create`, аксессор, начальные значения пропсов. |
| `registry/`    | Что приложение регистрирует на все компоненты типа: плагины, расширения коллекций, тема, иконки.                            |
| `adapter/`     | Связывание с фреймворком: контекст (с плагинами снаружи), поверхность и связка, расширения, лифт, общие функции.            |

**Рантайм-импорт между модулями — только по таблице.** `import type` не
ограничен: связи в рантайме он не создаёт.

| Модуль                         | Импортирует в рантайме                     |
| ------------------------------ | ------------------------------------------ |
| `naming`, `registry`, `define` | ничего из setup                            |
| `assemble`                     | `registry`, `naming`                       |
| `descriptors`                  | `define`                                   |
| `adapter`                      | `assemble`, `registry`, `naming`, `define` |
| `index.ts` пакета              | всё, кроме `assemble`                      |

Почему так:

- **Описание не знает о сборке.** Дескриптор — декларации и состав библиотеки,
  и только они; собирает по нему компонент `assemble/`, а сборка знает о
  дескрипторе лишь его контракт (`define/types.ts`). Методов `createBundle` и
  `createAccessor` у дескриптора нет: их звала одна сборка, а описание из-за
  них зависело от неё.
- **Состав — один список на монтирование** (`assemble/composition.ts`): плагины
  дескриптора, затем регистрации приложения. По нему строятся набор и units
  аксессора, по нему же контекст находит плагины, поставленные снаружи, —
  каждый из них больше не выясняет состав сам.
- **Контракт внешнего плагина `adapter` читает из `define`**
  (`pluginContractOf`): его записывает `definePlugin` за классом плагина, а
  подключает контекст — когда бы плагин ни встал (см. «Внешний плагин:
  пропсы — `pluginProps`, события — `plugin:event`»).
- Реестры и тема ни о ком не знают: их зовут сборка состава
  (`assemble/composition.ts`) и `TCollectionExtension`. Правило «`instanceof` +
  `scope` + `embedded`» одно на оба реестра — `createRegistrations`
  (`registry/registrations.ts`).
- **Регистрации действуют там, где набор создаётся.** Пришедший в конфиге набор
  собран по составу своего владельца, и второй раз состав не пересматривается:
  так фасад коллекции, делящий набор с компонентом, не получает его дважды.
- Сборка и `TAdapterContext` наружу не выходят: адаптер получает интерфейс
  `IAdapterContext`. Публичный интерфейс не наследует внутренний тип сборки —
  declaration emit Vue его не назовёт.
- Внутри пакета `@soldy/setup` не импортируется, только относительные пути.

Builder и pipeline для дескриптора не нужны: части дескриптора независимы и
после создания не меняются. Builder добавил бы изменяемое состояние, pipeline —
порядок, которого нет; хватает чистых функций (`define/inherit.ts`,
`assemble/`).

**Файлы.** Предложение о модуле — строка первой таблицы, предложение о файле —
первая строка его шапки.

- `types.ts` папки — контракты и опции её рантайма, включая опции расширений.
- `<тема>.types.ts` — типы без рантайма: вывод для адаптеров и тип-зеркала
  (`naming.types.ts`, `define/inference.types.ts`, `registry/plugins.types.ts`).
- Файл с рантаймом типов не экспортирует. Исключение — `registry/icons.ts`:
  его типы выведены из `ICON_ROLES`.
- Бочка (`index.ts`) перечисляет имена файлов явно, `export *` — только из
  подпапки.
- У `descriptors/` соглашения о файлах свои: тип слотов лежит рядом с
  дескриптором, который их объявляет.

**Куда класть новое:**

- правило построения дескриптора (наследование, умолчание) — `define/`;
- что происходит с компонентом при монтировании до фреймворка, включая
  начальные значения пропсов, — `assemble/`;
- когда и в каком порядке значения ходят между ядром и фреймворком — связка
  `adapter/binding/`, одна на шесть адаптеров, а не цикл одного фреймворка;
- регистрация приложения на тип компонента — `registry/`, выбор подходящих —
  через `createRegistrations`, а не своим циклом по `instanceof`;
- проводка, общая для всех фреймворков, — расширение в
  `adapter/extensions/<тема>/`; то, что шесть адаптеров делают с аксессором, —
  связка `adapter/binding/`; прочая функция, которую зовут адаптеры, —
  `adapter/common/`;
- новая папка верхнего уровня — со строкой в обеих таблицах и в
  `RUNTIME_IMPORTS` сторожа.

Сторож — `packages/setup/__tests__/setup-structure.spec.ts`: рантайм-импорт вне
таблицы, папка верхнего уровня без строки, импорт `@soldy/setup` внутри пакета
и нарушение соглашений о файлах роняют тест.

## Naming conventions

- `T` prefix → type alias (e.g. `TCollectionEngine<TItem, TExtensions>`).
- `I` prefix → interface (e.g. `IComponent`, `IExtension`).
- Expose collection state through **facade getters** (`TCollectionComponent` / `TCollectionItemComponent` subclasses) — do not intersect separate input/output interfaces.

### Префикс — только в глобальном пространстве имён

| Где                    | Пример               | Почему                                               |
| ---------------------- | -------------------- | ---------------------------------------------------- |
| CSS-класс              | `s-button`           | каскад глобален, `.button` столкнётся с приложением  |
| Тег Custom Element     | `soldy-button`       | реестр элементов глобален, дефис обязателен по спеке |
| Селектор Angular       | `soldy-button`       | шаблонное пространство имён глобально                |
| **Экспорт компонента** | `Button`, `TabsItem` | **без префикса** — namespace уже дал npm-скоуп       |

`SButton`/`STabs` не вводим: `import { Button } from '@soldy/ui-vue'` уже
однозначен, префикс дублировал бы то, что делает импорт.

### Часть или слот

**Часть становится отдельным компонентом, только если её адресует потребитель
— размещает в разметке или задаёт ей пропсы. Если у неё только позиция, это
слот или просто разметка внутри шаблона.**

Раньше критерий был сформулирован как «есть сущность в ядре, собственное
состояние **или `id` для ARIA-связки**». Формулировка не выдержала практики:
`id` есть и у панели Accordion, и у списка Select, но компонентами мы их не
сделали — и правильно. `id` — условие необходимое, не достаточное.

| Часть            | `id` есть | Адресует потребитель            | Решение                     |
| ---------------- | --------- | ------------------------------- | --------------------------- |
| `Tabs.Content`   | да        | да — `<Tabs.Content value="a">` | компонент                   |
| панель Accordion | да        | нет — только содержимое в слот  | слот + проп `content_aria`  |
| список Select    | да        | нет — он всегда один и внутри   | разметка + проп `list_aria` |
| список табов     | нет       | нет                             | слот                        |

Следствие для ARIA: у части-компонента есть экземпляр, значит есть и набор
`aria`, в который пишут ядро, плагины и расширения. У разметки экземпляра нет,
поэтому её атрибуты отдаются пропом (`content_aria`, `list_aria`). Это не
исключение из правила «пишем в набор», а его граница.

Этот критерий про то, становится ли часть **компонентом для потребителя**.
Отдельный вопрос — нужен ли части **внутри** компонента собственный экземпляр
(так у Select устроены `field` и `tags`, хотя потребитель их не адресует):
критерий и разбор на примере Select —
[Complex component reference](.github/skills/add-soldy-component/references/complex-component.md).

Критерий выведен из модели soldy, а не заимствован. Ark-таксономия
(`Root`/`Trigger`/`Indicator`/`Label`/`Positioner`) кодирует чужую модель: там
нет слотов и табы не коллекция. В soldy табы — коллекция: `TTabs` наследует
`TControl`, а членство в ней выставляют фасады — `TTabsCollectionFacade`
(`TCollectionComponent`) у владельца и `TTabsItemCollectionFacade`
(`TCollectionItemComponent`) у таба. Поэтому часть называется `Item`, а не
`Trigger`; иначе публичное API разъедется с ядром.

### Составные компоненты: точка — основная форма

`withParts` из `@soldy/setup` вешает части на владельца:

```ts
export const Tabs = withParts(TabsComponent, { Item: TabsItem, Content: TabsContent })
```

Точка решает согласованность имён: `Tabs` + `TabsItem` + `TabsContent` надо
держать в согласии вручную (и один раз уже разъехалось до `TabItem`), а
`Tabs.Item` / `Tabs.Content` согласованы по построению — префиксом служит сам
владелец. Плоские имена продолжают экспортироваться: они нужны там, где точки
нет (Angular, Web Components), и как запасной путь импорта.

**Ограничение Vue, о которое легко споткнуться:** точка резолвится только
компилятором SFC (`<script setup>`, импорт как биндинг). В строковом
`template` с регистрацией через `components: {}` рантайм-компилятор ищет
`Tabs.Item` как имя в реестре, не находит и молча рендерит пустоту. Сторожит
`packages/ui/vue/__tests__/parts.spec.ts`.

### Правила нейминга коллекций

**Владелец во множественном числе, если элементов много** (`Tabs`), в
единственном — если коллекция сама по себе одна сущность (`ListBox`,
`Accordion`). Часть всегда `Item`, независимо от числа владельца.

| Коллекция   | Части                       | Почему так                                                           |
| ----------- | --------------------------- | -------------------------------------------------------------------- |
| `Tabs`      | `Tabs.Item`, `Tabs.Content` | панель — сосед списка, пишется отдельно, связывается по `value`      |
| `Accordion` | `Accordion.Item`            | панель внутри элемента, отдельно не существует → слот `item-content` |
| `ListBox`   | `ListBox.Item`              | панели нет вовсе: выбор ничего не раскрывает                         |

**Набор частей выводится из критерия, а не копируется между коллекциями.**
Панель есть у Tabs и Accordion, но частью стала только у Tabs — потому что у
Accordion она не имеет собственной идентичности. У ListBox панели нет вообще.
Одинаковый набор частей у всех коллекций — признак того, что критерий не
применяли.

Плоские имена: `<Owner><Part>` — `TabsItem`, `TabsContent`, `ListBoxItem`,
`AccordionItem`. В Angular и Web Components — `soldy-tabs-item`.

### Переменная — `engine`, а не `collection` (критично)

**Ни одна переменная, ни один параметр и ни одно поле не называется
`collection`.** Держите `TCollectionEngine` — имя `engine`, поле `_engine`,
событие `engine:bound`, метод `bindEngine`, хук `onEngineBound`.

Причина не в краткости. «Коллекция» в этом проекте — не массив: это движок с
драйвером и расширениями. Имя `collection` заставляет читателя думать про
список элементов, тогда как в руках у него объект, у которого элементы —
только одна из граней.

```ts
// ❌ читается как «массив элементов»
bundles.events.on('engine:bound', (collection) => {
  this._collection = collection
})

// ✅
bundles.events.on('engine:bound', (engine) => {
  this._engine = engine
})
```

**Держите фасад — это `facade`, а не `engine`.** `TListBoxCollectionFacade` не
движок, а именованный доступ к нему; назвать его `engine` — такая же подмена,
от которой правило и защищает.

**Имена классов, типов, папок и contribution `Collection` сохраняют**:
`TCollectionEngine`, `TListBoxCollectionFacade`, `CollectionDescriptor`,
`base/collection/`. Там слово стоит на месте — оно называет слой, а не
конкретный объект в руках.

### Слоты элементов: статические имена со scope

Владелец рендерит элементы сам, когда их задали пропом `items`. Слоты для их
содержимого называются `item-<что>` и **получают элемент через scope**:

```html
<slot name="item-leading" :item="item" />
<slot name="item" :item="item" />
<slot name="item-trailing" :item="item" />
<slot name="item-content" :item="item" />
<!-- Accordion: панель -->
```

Динамических имён (`item:${item.value}:leading`, `panel:${value}`) быть не
должно — их резолвит только Vue, в остальных пяти адаптерах они недостижимы.
Адресация конкретного элемента делается условием внутри слота по `item.value`.

## Коллекции: слои и расширения (критично)

Самая частая ошибка в этом коде — смешать слои. Она уже приводила к переписыванию.

### Три слоя, и они не пересекаются

| Слой                | Отвечает за                                   | Пример                                                          |
| ------------------- | --------------------------------------------- | --------------------------------------------------------------- |
| **Класс ядра**      | собственные props и events                    | `TTabsItem` — `value`, `text`, `closable`                       |
| **Фасад коллекции** | членство в коллекции                          | `TTabsItemCollectionFacade` — `active`, `order`, `tab_closable` |
| **Расширение**      | функциональность поверх стандартной коллекции | `TTabsExtension` — закрытие вкладок                             |

**Класс ядра не знает о коллекции.** Ни движка, ни `bindEngine`, ни активности.
Если классу «нужен доступ к коллекции» — значит логика не в том слое.

```ts
// ❌ так нельзя
class TTabsContent extends TComponentView {
	bindEngine(engine) { ... }        // ядро полезло в коллекцию
	get active() { return this._collection... }
}

// ✅ класс ядра — только свои props
class TTabsContent extends TComponentView {
	get value() { ... }
}
// ✅ членство в коллекции — фасад
class TTabsContentCollectionFacade extends TCollectionItemComponent {
	get active() { return this._context?.adapters.activation.active ?? false }
}
```

### Иерархия фасадов повторяет состав расширений (критично)

Фасады появились потому, что коллекции на классическом наследовании перестали
масштабироваться. База у них тоже наследование — и не повторяет ту ошибку
ровно по одной причине: **наследуется проекция, а не поведение**. Фасад
ничего не делает сам, он выставляет наружу то, что уже умеет расширение.

Отсюда правило: **наследуй базу, соответствующую расширению, а не похожему
компоненту.**

```
TCollectionComponent
└── TBatchCollectionFacade           batch
    ├── TSelectionCollectionFacade   + selection  → Accordion, Select, ListBox, Tags
    └── TActivationCollectionFacade  + activation → Tabs, RadioGroup

TCollectionItemComponent
└── TOrderItemFacade                 order
    ├── TSelectionItemFacade         + selected → Accordion/ListBox/Select/Tags.Item
    └── TActivationItemFacade        + active   → Tabs.Item, RadioGroup.Item
```

У табов и радио активность, а не выбор: активный элемент один, и снять его, не
выбрав другой, пользователь не может. Поэтому база у них своя, соседняя с
выбором, а не ниже неё. Пока потребитель был один (Tabs), её не заводили —
подстраиваться под неизвестное требование дороже, чем поднять пятнадцать
строк; вторым стал RadioGroup. Своё у фасадов Tabs — только закрытие вкладок,
у фасадов RadioGroup своего нет вовсе.

Правило держится не на честном слове: дженерик базы сужен до расширения,
которое она потребляет (`TExtensions extends { selection: TSelectionExtension<any> }`),
поэтому наследование без расширения — ошибка компиляции. Тип элемента у
расширения при этом `any`: расширения инвариантны по элементу, и `TItem` там
ломал цепочку List → ListBox (слой `TList` с тех пор слит с ListBox).

**Чем это уже окупилось.** До баз одно свойство писалось в трёх фасадах по
отдельности, и три копии дали три разных API: у Accordion не было сеттера
`mode`, у опции Select — сеттера `selected`, хотя contributions объявляют оба
записываемыми. `<Accordion mode="multiple">` молча не работал — вторая
раскрытая секция закрывала первую, и харнесс `Accordion.test.vue`, который
использует `mode="multiple"`, всё это время проверял не то.

Сторожит `setup/__tests__/facade-props.spec.ts`: у каждого объявленного
записываемого пропа обязан быть сеттер в цепочке прототипов фасада.

### Карта событий выводится из источника, а не переписывается (критично)

`TEvented.relay` сверяет имена и обработчики с картами источника и цели. Но у
списка правил есть цена: **состав проброса записывается дважды** — именами в
теле и картой событий в типах. Два списка расходятся молча. Так и было: одни и
те же 12 имён драйвера лежали в `plain.extension.ts`, в
`collection-component.class.ts` и третий раз в карте фасада, а `TPlainEvents`
обещала сверх них `items:query:before` и `items:query:invalidated`, которых
проброс не передавал, — подписка на них не срабатывала никогда.

Поэтому там, где цель **представляет** источник наружу, списка быть не должно:

```ts
// ✅ состав проброса — это карта источника
this.events.relayAll(this.extensions.batch.events)
type TFacadeEvents = TBatchCollectionFacadeEvents<TItem> & TTabsExtensionEvents

// ❌ то же знание в двух местах: добавил событие — правь оба
this.events.relay(this.extensions.batch.events, ['items:added', 'items:removed'])
type TFacadeEvents = Pick<TBatchEvents<TItem>, 'items:added' | 'items:removed'>
```

Правило по слоям:

- **Фасад коллекции и фасад элемента** — всегда `relayAll`. Фасад не эмитит
  ничего сам, он проекция расширения, и новое событие расширения обязано
  доехать наружу само.
- **Расширение над владельцем, item-адаптер над элементом** — `relay` со
  списком. Там проброс сознательно уже карты источника (у владельца событий
  много) или событие переименовано (`change:selection` → `change:selected`), и
  список несёт смысл, а не дублирует карту.

Следствия, за которыми надо следить:

- **Карта не пересекает `TAnyEvents`.** Это `Record<string, (...args: any) => any>`
  из `common/event`, и карта, которая его пересечёт или им станет, снова
  принимает любое имя с любым обработчиком. Корневая карта `TComponentEvents`
  закрыта: в ней одно `bundle:create` (см. «Две поверхности управления»), и
  карты компонентов и фасадов начинаются с неё.
- **У класса иерархии `TComponent` констрейнт `TEvents` — его собственная
  карта, равная дефолту, а не `TAnyEvents`.** Дескриптор выводит тип инстанса
  из конструктора (`ctor`), и при таком выводе на месте дженерика класса стоит
  констрейнт, а не дефолт. Открытый констрейнт вернул бы индекс в карту
  инстанса, которую дескриптор несёт в `IAdapterContext<TInstance>`.
  `TAnyEvents` остаётся констрейнтом интерфейсов (`IComponent` и соседи) — тот
  же приём, что в «События item-адаптера: `any` в констрейнте, точный набор в
  инстанцировании»: тип из конструктора через них не выводится. Опечатку в
  имени события в `on`, `emit` и правиле `relay` сторожит
  `core/__tests__/component-events-closed.spec.ts` — и у наследника
  `TComponentView`, и у инстанса, выведенного из конструктора `TComponent` и
  `TCollectionItemComponent`.
- **«Событий нет» — это `TNoEvents`, а не `Record<string, never>`.** У второго
  есть индексная сигнатура, и для проверки это «любое имя». На
  `TSelectExtensionEvents` так и вышло: карта обещала отсутствие событий, а
  расширение релеило в неё `change:indicator`. `TNoEvents`
  (`common/event/types.ts`) — `Record<never, …>`: `keyof` пуст, констрейнт карты
  выполнен, и `eslint-disable`, без которого не обходится `{}`, не нужен.
- **Интерфейс расширения передаёт свою карту вторым аргументом `IExtension`.**
  Item-адаптер берёт родителя через интерфейс
  (`TParent extends ITabsExtension<TItem>`), и без второго аргумента
  `parent.events` — дефолт `IExtension`, карта с индексной сигнатурой: `relay`
  из неё принимает любое имя, а событие, переименованное в карте расширения,
  компилируется молча.
- **Два `relayAll` не должны пересекаться по именам** — цель получит два эмита
  на один факт. Пересечение значит, что событие идёт до цели двумя путями, и
  лечится у источника. Так снят релей `change:items` из `batch`: подписчиков у
  него не было, а фасаду он давал дубль поверх пути через `plain`.
- **Событие item-адаптера о вычисленном значении объявляется без аргумента.**
  Геттер отдаёт `элемент ?? владелец`, источников у значения два, и ни один не
  равен результату: элемент шлёт `undefined` как «наследую», владелец шлёт своё
  даже когда результат не менялся. Событие значит «перечитай геттер» —
  `change:active`, `change:order`, `change:selected`, `change:closable`.

Сторожит `core/__tests__/collection-relay-all.spec.ts`: событие доходит до
фасада без упоминания в списке имён, `change:items` приходит один раз, а имя
вне карт источников не компилируется. Карты расширений сторожит
`core/__tests__/extension-events-map.spec.ts`: у каждого `I*Extension` в
`extends` два аргумента `IExtension`, а подписка и `relay` имени вне карты — через
тип интерфейса и из `TNoEvents` — не компилируются.

### Расположение фасадов

Каждый — своя папка с баррелем, как у расширений:

```
<component>/collection/facade/{facade.class.ts, index.ts}
<component>/item/facade/{facade.class.ts, index.ts}
```

Базы — в `base/collection/facade/<расширение>/`, файл повторяет имя папки:
`batch/batch.facade.ts`, `selection/selection.facade.ts`,
`selection/item/selection-item.facade.ts`, `activation/activation.facade.ts`,
`activation/item/activation-item.facade.ts`.

### К `driver` обращается только расширение коллекции (критично)

`engine.driver` — хранилище движка, а не публичный список элементов. **Читать и
слушать его имеют право только расширения коллекции**
(`core/src/components/**/collection/extensions/**`,
`core/src/components/base/collection/engine/extension/**`) — и делают это через
`ctx.driver`, полученный в `install`, а не через ссылку на движок.

Всем остальным — плагинам, расширениям адаптера, фасадам, коду `packages/ui/*`
— driver недоступен. Они работают со стандартными расширениями:

| Что нужно                                                                                                   | Через что                        |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------- |
| список элементов, длина, поиск, индекс                                                                      | `engine.extensions.batch.items`  |
| `item:added` / `item:removed` / `item:moved` / `reset` / `change:items`                                     | `engine.extensions.plain.events` |
| `item:add:before` / `item:update:before` / `item:remove:before` / `item:move:before` / `items:clear:before` | `engine.extensions.plain.events` |
| вставка, удаление, перемещение, обновление                                                                  | `engine.extensions.plain`        |
| замена набора целиком                                                                                       | `engine.extensions.batch`        |

`plain` и `batch` есть у любой коллекции компонента — их ставит
`baseExtensions()` (`base/collection/create/internal.ts`), поэтому проверять
наличие не нужно.

Причина та же, по которой driver сам является обёрткой над `storage`:
`driver.execute` обходит расширения, а подписка на `driver.events` обходит
relay и порядок, который расширения выстраивают. Каждое прямое обращение —
второй путь к тем же данным, который потом расходится с первым и который никто
не отслеживает. Один путь — `batch.items`.

Сторожит `packages/setup/__tests__/driver-access.spec.ts`: `.driver` вне
расширений ядра — падающий тест, а не замечание на ревью.

Вход `batch` (`set`/`update`/`patch`, сеттер `items`) — источник
(`TCollectionEngineItemSource<TItem>`: сырые props + meta `_`) или готовый
инстанс, не обязательно `TItem[]`: инстансы из него делает `TFactoryExtension`
при вставке. `trackBy` принимает и то и другое — он вызывается и для
элементов хранилища, и для входа.

### Изменить или отменить операцию коллекции — подписка на `*:before`, а не правка движка

Вставка, обновление, удаление, перемещение и очистка несут перед мутацией
хранилища объект события (`TInsertEvent`, `TUpdateEvent`, `TRemoveEvent`,
`TMoveEvent`, `TClearEvent`) и шлют `item:add:before` / `item:update:before` /
`item:remove:before` / `item:move:before` / `items:clear:before`. Подписчик
может подменить данные (`e.item`, `e.changes`, `e.newIndex`) или отменить
операцию целиком через `e.preventDefault()` — после этого хранилище не
меняется и after-событие (`item:added`, `item:updated`, `item:removed`,
`item:moved`) не шлётся вовсе.

Это и есть штатный способ повлиять на операцию коллекции. Не подключайтесь к
`driver` напрямую и не правьте команды движка ради частного случая — нужный
хук уже есть у всех пяти операций записи, и он доступен снаружи через
`engine.extensions.plain.events` (см. таблицу выше).

`items:clear:before` — один хук на всю очистку, а не по хуку на элемент:
отменить удаление части элементов оставило бы коллекцию непустой, а `clear`
по смыслу значит «коллекция пуста». `TMoveEvent.oldIndex` доступен только для
чтения — вычислен до хука; если хук привёл `newIndex` к значению `oldIndex`,
перемещение становится no-op без мутации и без `item:moved`.

Сторожит `packages/core/__tests__/collection.command.spec.ts` (`preventDefault`
гасит команду целиком, включая `change:items`/`change:count`) и
`collection-before-hooks-relay.spec.ts` (хуки доходят через `plain.events` и
фасад коллекции).

### Движок не знает о конкретных расширениях (критично)

Драйвер, команды, хранилище, контексты элементов и типы движка
(`base/collection/engine/` вне `extension/`) — общий фундамент всех коллекций.
**Понятия отдельного расширения в них не проникают**: ни флагом в `ICommand`, ни
событием драйвера, ни полем в типах. Расширение отвечает за своё и больше никуда
не лезет.

Нужный факт расширение выводит само из того, что драйвер уже сообщает
(`item:*`, `reset`, `change:items`). Если вывести не получается — это вопрос до
реализации, а не повод дописать движок под одного потребителя.

**Как это нарушалось.** Чтобы `order` не слал `change:order` на обновление
элемента, в `ICommand` добавили флаг `orderChanged`, а драйвер начал сам слать
`change:order`. Мелочь, нужная одной DnD-сортировке, стала контрактом движка для
всех коллекций. Ревью это отклонило.

Сторожит `core/__tests__/engine-extension-scope.spec.ts`. Имена расширений он
собирает сам из `readonly name` в `engine/extension/**` и
`**/collection/extensions/**` и ищет их словами в идентификаторах и строках кода
ядра движка; комментарии не в счёт. Не проверяются три слова, которыми ядро
пользуется само: `batch` (операция драйвера), `meta` (снапшот `_` в событиях
элементов), `value` (`valueOf`, параметр сеттера). Ловится имя, а не смысл —
переименованный флаг остаётся на ревью.

### Когда заводить своё расширение

Стандартный набор лежит в `core/src/components/base/collection/engine/extension/`
(`plain`, `batch`, `activation`, `selection`, `value`, `order`, `unique`, `meta`,
`factory`, `filter`).
**Своё расширение заводится, когда конкретной коллекции нужна функциональность
сверх стандартной.** Не для того, чтобы что-то куда-то положить.

Каждое — своя папка в `<component>/collection/extensions/<name>/`, внутри пара:

- **расширение коллекции** (`TBaseOwnerItemExtension`) — уровень всей коллекции;
  `readonly name` попадёт в `extensions` и станет ключом адаптера;
- **item-адаптер** (`TBaseItemExtension`) в подпапке `item/` — знает свой
  элемент (`_item`) и родительское расширение (`_parent`).

```
tabs/collection/extensions/
  tabs/        закрытие вкладок, hasEnabledTabs
    tabs.extension.ts
    item/item.extension.ts         closable = !disabled && (item ?? parent)
  content/     связка «таб ↔ панель»
    content.extension.ts
    item/item.extension.ts         tabAria и panelAria
```

Расширение подключается в `collection/factory.ts` и объявляется в
`collection/types.ts`.

### События item-адаптера: `any` в констрейнте, точный набор в инстанцировании (критично)

Наследник, добавляющий своё событие, **перестаёт подходить под контракт
родителя**, если где-то по цепочке констрейнт требует точную карту событий.
Так было у ListBox с `change:view`, и лечилось это приведением `events as any`
— то есть отключением проверки ровно там, где она нужна.

Причина не в логике, а в дисперсии. В `TEvented<TEvents>` карта стоит
одновременно в выходе и во входе:

```ts
type TEventContext<TEvents, K extends keyof TEvents = keyof TEvents> = {
    event: K                       // выход — ковариантно
    args: Parameters<TEvents[K]>
}
on<K extends keyof TEvents>(event: K, handler: TEvents[K]): void   // вход — контравариантно
```

Значит `TEvents` **инвариантен**: `TEvented<A>` и `TEvented<B>` несовместимы
в обе стороны, даже когда `B` — надмножество `A`. Отношения «шире/уже» между
эмиттерами не существует.

Отсюда правило на всю цепочку расширений:

```ts
// ✅ констрейнт — это «у тебя должен быть эмиттер», а не «ровно такой»
TItemExt extends IListBoxItemExtension<TItem, any> = IListBoxItemExtension<TItem>

// ✅ инстанцирование — точное, здесь проверка и работает
class TListBoxItemExtension extends TBaseItemExtension<TItem, TParent, TListBoxItemEventsExtension>
```

Затронуты `IItemExtension`, `IItemExtensionCtor`, `IExtensionItems`,
`IBaseOwnerItemExtensionOptions`, `TBaseOwnerItemExtension` и то же самое на
уровне компонента (`IListBoxItemExtension`, `IListBoxExtension`).
**Заводишь новую коллекцию — держи тот же приём**, иначе первый же наследник,
добавивший событие, упрётся в то же и получит очередной `as any`.

Та же инвариантность достаёт и сам движок. У `TCollectionEngine.events` есть
`engine:create(engine)`, куда движок передаёт себя, поэтому `TExtensions`
движка тоже инвариантен: `TCollectionEngine<T, A>` не принимает движок с другой
картой расширений, будь то набор другого уровня, `Partial<...>` или объединение.
Опция `engine` фасадов (`tabs`, `list-box`, `select`, `accordion`, `tags`,
`radio-group`) принимает движок любого уровня и сама достраивает недостающее,
поэтому она объявлена как `TCollectionEngine<any, any>`. Это констрейнт. Точный
тип ставится там, где движок создаётся (`createEngine*`, `TTabsCollection` и
соседи).

Проверяется двумя слоями: `vue-tsc` в CI ходит по исходникам ядра транзитивно
(сузь констрейнт обратно — сборка падает; опечатка в имени события тоже), а
`core/__tests__/list-box.spec.ts` проверяет, что событие действительно доходит.
Одного типа мало: приведение к `any` глушит проверку молча, и до этих тестов
так и было — на ListBox не было ни одного теста.

Та же инвариантность достаёт и обычные компоненты (не только item-адаптеры
расширений): класс с дженериком `TEvents extends TOwn` (`TComponentView`,
`TControl`, `TValueControl` и соседи, `TSelect`, item-классы Select/Tabs/
Tags/Accordion/ListBox) не может эмитить своё **собственное** событие через
`this.events: TEvented<TEvents>` — TS отказывается сузить конкретную карту до
инстанцированной. Подписка (`on`) на дженерик-карту действительно
несостоятельна: наследник мог сузить обработчик. Но эмит своего события
звучит — при `TEvents extends TOwn` обработчик, рассчитанный на `TOwn`,
обязан принять и `TOwn`-аргументы.

Выражается это типом `TEventSink<TOwn>` (`common/event/types.ts`) — вид карты
событий «только эмит», с той же сигнатурой `emit`, что у `TEvented`.
`TEvented<TEvents>` присваивается в `TEventSink<TOwn>` структурно, без
приведения:

```ts
protected get _sink(): TEventSink<TValueControlEvents<TValue>> {
	return this.events
}
// …
this._sink.emit('change:value', payload)
```

У класса без собственного дженерика `TEvents` (лист иерархии вроде `TButton`,
`TFrame`, `TTabs`) `this.events` уже имеет точную карту — там `TEventSink` не
нужен, эмитьте через `this.events.emit(...)` напрямую.

Тем же видом сверяется цель `TEvented.relay`: проброс — это эмит в цель с
аргументами события источника. `this`-параметр `relay` требует от цели
`TEventSink` карты проброшенных событий (`TRelayedEvents`: имя в цели →
обработчик `from` источника), имена правил сверяет `TRelayRule`. Поэтому
**карта цели или её констрейнт обязаны объявлять проброшенные события**:
дженерик-карта сверяется по констрейнту, и события, которого в нём нет, не
пробросить. Карта с индексной сигнатурой принимает любое имя и обработчики не
сверяет.

Пределы проверки обработчиков. Обработчик цели должен принимать аргументы
источника; параметров у цели может быть меньше (`change:selection` →
`change:selected: () => void`), несовместимые в обе стороны обработчики —
ошибка. Но TypeScript сравнивает карту цели с картой проброшенных событий
целиком и принимает и обратную сторону, когда вызов пробрасывает одно событие
или правила покрывают карту цели полностью. В таком вызове расширенный
аргумент источника (`boolean | undefined` → `boolean`) и новый обязательный
параметр цели не видны. Сторожит `core/__tests__/evented.spec.ts`: негативные
случаи стоят под `@ts-expect-error`, их проверяет «Типы — Core».

Приведения во всём репозитории стережёт eslint (см. «Никаких костылей»):
`as never`, `as unknown as X`, `as TEvented<…>`, угловое приведение `<T>x`,
директивы отключения проверки типов; `as any` ловит `soldy/no-explicit-any`.
Исключённых путей у блока нет. Голый `any` в констрейнте дженерика (см. абзацы
выше) не запрещён — так распознаётся сама инвариантность, а не костыль.
Приведения в адаптерах фасадов item-элементов, в конструкторах item-адаптеров
расширений, во внутренностях движка коллекции и в теле `TEvented.relay()` сняты
сменой контракта, а не заменой на `TEventSink`: тело `relay` работает на канале
без карты событий, а `TEventSink` в сигнатуре `relay` сверяет цель и приведения
не заменяет.

### `any`: где он честный

`any` стережёт локальное правило `soldy/no-explicit-any`
(`tools/eslint/rules/no-explicit-any.ts`, тест позиций —
`npm run test:eslint`). В CI сборку роняет `npm run lint:ci` по всему
репозиторию. Правило заменяет `@typescript-eslint/no-explicit-any`:
встроенное правило не отличает стирание инвариантности (разделы выше) от
спрятанного типа, а его `ignoreRestArgs` не видит `(...args: any)` без `[]`.
Постоянный `eslint-disable` с объяснением вместо правила запрещён («Временное
исключение без срока»).

`any` пропускается:

- в констрейнте и дефолте параметра типа —
  `TEvents extends Record<string, (...args: any) => any>`, `TItem extends object = any`;
- в `extends` условного типа — `T extends TComponent<any, any, infer S> ? S : …`;
- в rest-параметре конструкторного типа — `new (...args: any[]) => T` (миксины,
  `this` статических фабрик);
- прямым аргументом дженерика проекта, имя `T…`/`I…` —
  `TCollectionEngine<TItem, any>` у опции `engine` фасадов, `TEvented<any>`.
  Это то же стирание, что в констрейнте, только в позиции поля или опции;
- в универсальном типе функции `(...args: any) => any` — так «любую функцию»
  записывает и стандартная библиотека TS.

Остальное — ошибка: `Record<string, any>`, `Partial<any>`, `(item: T) => any`,
`value: any`. Указывайте тип или `unknown`.

Состояние адаптеров (`state` у `useAdapter` в React, Solid, Svelte, Angular и
webc) типизируется по инстансу: `TInstanceState<TInstance>` из `@soldy/setup`
— его свойства после `valueOf()`. Объект собирается по дескриптору в рантайме,
поэтому граница с типом одна, `toInstanceState`, и приведений в разметке
компонентов нет. Тип инстанса несёт дескриптор (`IAdapterContext<TInstance>`).

Выходы плагинов (см. «Состав пропсов записан дважды») идут в состояние тем же
путём. Второй параметр контекста, `IAdapterContext<TInstance, TOutputs>`, —
фантомный: `createAdapterContext` выводит его из состава плагинов дескриптора.
`useAdapter` React, Solid и Svelte берёт его из типа контекста и отдаёт `state`
типа `TAdapterState<TInstance, TOutputs>`: к свойствам инстанса добавлены
выходы того же вида — снимок, только чтение, необязательный ключ. Граница та
же, `toInstanceState` со вторым параметром. У Angular и webc состояние
шаблону отдаёт базовый класс, и компонента, который читает выход, там нет:
параметр понадобится вместе с портом Frame или Select.

Vue отдаёт шаблону не `state`, а рефы (`TBinding`: пропы `TProps`, свойства
инстанса и выходы плагинов `TOutputs`), и граница у него своя —
`toBindingState` (`ui/vue/src/adapter/runtime/useAdapter.ts`). Рефы связки
собраны по тому же дескриптору, связь их имён с типом держит он, поэтому
внутри обычный `as` из `Readonly<Record<string, unknown>>`. Через неё проходят
и `useAdapter`, и `useCollectionAdapter`; `ctrl`, `plugins` и `rootElement`
добавляются к результату без приведения. Дженерики `useAdapter` компоненты Vue
передают явно, поэтому выходы из контекста не выводятся: третьим аргументом
`DescriptorPluginOutputs<typeof XDescriptor>` их передаёт компонент, чей
шаблон читает выход (Select, Frame, Icon, Spinner, Skeleton). С контекстом
этот аргумент TypeScript не сверяет — параметр фантомный, — поэтому дескриптор
в нём тот же, что в `createVueAdapterContext` строкой выше. В `TProps` выходы
не кладутся: это не пропсы.

Тип выхода в шаблоне Vue и в контексте `createVueAdapterContext` сторожит
`ui/vue/__tests__/plugin-outputs.spec.ts`, в контексте `createAdapterContext` —
`setup/__tests__/adapter.spec.ts`. Проверки там — `expectTypeOf`: их ловят шаги
«Типы — Vue» и «Типы — Setup», а не vitest.

### Логику, которой нужен элемент, кладите в item-адаптер

У адаптера есть `_item` и `_parent` — поэтому всё, что вычисляется от элемента,
отдаётся там, и **обе стороны парной связки считаются по одной формуле**. Сама
формула — в родительском расширении, а item-адаптер (`tabAria`, `panelAria`)
только подставляет в неё свой элемент:

```ts
// content/content.extension.ts — id панели и aria-controls таба это одно и то же
tabId(item)   { return `s-tab-${item.uid}` }
panelId(item) { return `s-tabpanel-${item.uid}` }
```

Разнеси формулу по разным файлам — однажды разойдутся. Сторону таба
`TTabsContentExtension` пишет в `aria` элемента при добавлении в коллекцию,
сторону панели `TTabsContentBindingExtension` берёт у item-адаптера
(`adapters.content.panelAria`) и кладёт в `aria` панели. Фасад отдаёт атрибуты
связки пропом, только когда у панели нет экземпляра: у Accordion `content_aria`
→ `adapters.content.contentAria`.

### Имена props фасада префиксуются

`tab_closable`, `content_aria`, `list_aria`. Причина: в шаблоне значения двух
adapter-контекстов (собственного и коллекционного) сливаются в один объект, и
одноимённые затирают друг друга. У таба уже есть свой `closable`, у элемента
Accordion и у Select — унаследованный `aria`: они и вынудили префикс.

### `disabled` элемента: своё или владельца

Элемент выключен, если выключен сам **или** выключен владелец — как
`<fieldset disabled>`. Своё значение лежит в `item.states.disabled.rawValue`:
его пишут фабрика, разметка и `batch.patch` через сеттер. Итог отдаёт
резольвер, поэтому `attrs`/`aria`/`data-disabled`, плагины и клавиатура читают
`item.disabled` как раньше. Правило одно на все коллекции —
`bindDisabledToOwner` и `notifyOwnerDisabled` в `base/control/owner-disabled.ts`.

**Расширения `item.disabled` не пишут.** Раньше они писали туда значение
владельца, и список, собранный данными (`items`), терял собственное
«выключено» элемента: в разметке его случайно возвращал биндинг после
регистрации, а при сборке данными — нет.

Отсюда контракт `TStateUnit`: `change` сообщает о разрешённом значении, а не о
`rawValue`, — приходит, только когда сменился итог, и несёт его же. Сеттер
`TControl.disabled` сравнивает со своим значением: своё `true` в выключенном
списке итога не меняет, но обязано записаться, иначе пропадёт при включении
списка.

Сторожит `core/__tests__/collection-disabled-inherit.spec.ts`: шесть
`createEngine*` — свой `disabled` из `items`, переключения владельца,
`batch.patch` и число `change:disabled` у элементов.

### ARIA: что знает элемент, а что коллекция

`TTabsItem` пишет в свой `aria` только `role: 'tab'` — это единственное, что
таб знает о себе. `id` и `aria-controls` предполагают существование панели, а
о ней знает коллекция: их проставляет `TTabsContentExtension` при добавлении
элемента, там же лежит формула идентификаторов — одна на обе половинки.
`aria-selected` пишет `TTabsExtension` по событию активации.

Почему не в `TActivationExtension`: оно общее для всех коллекций, а
«выбранность» выражается по-разному — у таба `aria-selected`, у заголовка
Accordion `aria-expanded`. Атрибут знает паттерн, а не механизм активации.

Подробности — в разделе «Доступность (a11y)».

## Project-specific patterns

- **Один файл на компонент.** Дескриптор объявляет всё, что компонент отдаёт
  наружу, прямо в `contribution` — словаре `IContribution`; рядом лежит тип
  слотов. Отдельных файлов contribution нет: их читал только свой дескриптор.
  Фабрика оборачивается в `defineDescriptor` — дескриптор строится один раз:

  ```ts
  export const ButtonDescriptor = defineDescriptor(() =>
    defineComponent<IButtonProps, TButtonEvents, TButtonSlots>()({
      ctor: TButton,
      extends: TextableDescriptor(),
      contribution: {
        props: { view: { type: String, triggers: ['change:view'] } },
        slots: { leading: {}, default: { scope: { text: defineType<string>(String) } } },
      },
    }),
  )
  ```

  `props` is a `Record<string, IPropDefinition>` — the prop name is the dictionary key, not a field.
  Плагин объявляется так же — `definePlugin({ ctor, namespace, contribution: { … } })`.
  Общий фрагмент нескольких компонентов (`LIST_PROPS` у ListBox и Select) —
  константа рядом с дескрипторами (`descriptors/components/list.ts`).

- **Descriptors** — фабрики. Call them when used as `extends` / options (do not pass the function reference): `extends: TextableDescriptor()`.

- **Состав пропсов записан дважды: в contribution и в типе.** Рантайм собирает
  дескриптор (`getProps()` — contribution компонента, его предков и плагинов),
  а типы всех адаптеров выводятся из `DescriptorAllProps`: `TProps`
  дескриптора и, у плагина, третий аргумент `definePlugin` (`IAriaPluginProps`
  — только незащищённые пропсы, без неймспейса). Проп без типа шаблон не
  проверяет, а проп только в типе компилятор пропускает, и в разметке он молча
  становится атрибутом: так жили `dismiss_enabled` у Select и `variant` у
  Skeleton.

  Выходы плагинов — защищённые пропсы, которые плагин вычисляет, а разметка
  только читает, — записаны дважды так же. Тип выхода — четвёртый аргумент
  `definePlugin`, `Pick` геттера класса плагина
  (`Pick<TDismissPlugin, 'ownerAttribute'>`): выход — геттер плагина, как
  выход компонента — геттер инстанса, и второй записи того же типа
  интерфейсом не нужно. Входов нет — на месте третьего аргумента `object`.
  `DescriptorPluginOutputs` собирает выходы плагинов дескриптора с
  неймспейсом (`dismiss_ownerAttribute`, `layout_styles`). Свои выходы
  компонента (`classes`, `aria`) в него не входят: их тип даёт инстанс. До
  адаптера тип выходов доходит через контекст, как тип инстанса (см. «`any`:
  где он честный»). Раньше `dismiss_ownerAttribute` описывал рукописный тип,
  который с плагином никто не сверял, а `layout_styles` шаблоны читали без типа
  — проходило это лишь потому, что vue-tsc не проверяет атрибуты
  `<component :is>`.

  Сторож — `packages/setup/__tests__/descriptor-props-types.spec.ts`: по всем
  дескрипторам экспорта две сверки в обе стороны, ключи типов читает type
  checker TypeScript.
  - Незащищённые пропсы рантайма — с ключами `DescriptorAllProps`.
    Коллекционная часть (`SelectCollectionDescriptor`) тип пропсов не
    объявляет и сверяется в строке владельца: её пропсы входят в его интерфейс
    (`ISelectProps`). `ctrl` сторож не сверяет: в рантайме проп объявляет
    `EntityDescriptor`, а тип `ctrl?: TInstance` дописывает адаптер. Прочие
    поля, которые адаптер дописывает к типу сверх дескриптора, сторож не видит
    — так в типах адаптеров жил `plugins`, которого в рантайме не было.
  - Защищённые пропсы из contribution плагинов дескриптора — с ключами
    `DescriptorPluginOutputs`. Строка своя у каждого дескриптора, у
    коллекционной части тоже: адаптер создаёт ей отдельный контекст.

- **Types live in `types.ts`**: type aliases and interfaces (`T*`, `I*`, `*Options`, `*Props`) belong in a `types.ts` file, never alongside the class implementation. Example: `TListBoxCollectionFacadeOptions` lives in `collection/types.ts`, while `facade/facade.class.ts` holds only the `TListBoxCollectionFacade` class.

- **Branded prop types**: use `defineType<T>(ctor)` for phantom-typed contribution props (e.g. `defineType<TButtonView>(String)`). It is exported from `@soldy/setup` and lives in `packages/setup/define/prop-type.ts`; descriptors inside the package import it from `define/` by a relative path, never from `@soldy/setup` — see «Структура `packages/setup`».

- **Collections use facades**: the owner is a `TCollectionComponent` subclass (e.g. `TTabsCollectionFacade`) that owns a `TCollectionEngine` and exposes getters (`items`, `trackBy`, `activeItem`); the item is a `TCollectionItemComponent` subclass (e.g. `TTabsItemCollectionFacade`) holding a `TItemContext`. Both are wired through `defineComponent` descriptors — there is no `defineCollection`/`defineExtension`. Facades don't implement these from scratch: they extend the base matching their extension set (`TBatchCollectionFacade`/`TSelectionCollectionFacade`/`TActivationCollectionFacade`, `TOrderItemFacade`/`TSelectionItemFacade`/`TActivationItemFacade`) — see «Иерархия фасадов повторяет состав расширений» above. Facades never list the events they forward: `relayAll` takes the source's whole map, and the facade's event map is an intersection of those maps — see «Карта событий выводится из источника, а не переписывается» above.

- **Vue collection setup** creates two adapter contexts sharing one bundle: the owner component (`TabsDescriptor`, through `useAdapter`) and the collection facade (`TabsCollectionDescriptor`, `{ bundle: adapter.bundle }`, through `useCollectionAdapter`). Both contexts are created via `createVueAdapterContext` (`packages/ui/vue/src/adapter/common/`), not `createAdapterContext` from `@soldy/setup` directly — the wrapper strips Vue proxies from `ctrl` and from top-level values of `options`. The facade context's `options` carries `{ owner: adapter.instance, engine: props.engine }`; `resolveEngine` picks up the passed-in engine and attaches it to the owner, or builds its own when none was passed. `useCollectionAdapter` leaves `ctrl` and `rootElement` out of its result before the setup merges `{ ...refs, ...refsCollection }`, since those belong to the owner, not the facade — so the spread order no longer matters. Items register through `TCollectionExtension`/`TCollectionItemExtension` over the elevator (provide/inject).

## Граница переиспользования между похожими компонентами (критично)

ListBox, список Select, будущие Menu и Popover выглядят одинаково. Соблазн
собрать один из другого — `Select = Input + Frame + ListBox` — очень силён, и
он неверен.

**Списки одинаковы на вид и различны по семантике:**

|                 | ListBox         | список Select            | Menu               |
| --------------- | --------------- | ------------------------ | ------------------ |
| роль контейнера | `listbox`       | `listbox`                | `menu`             |
| роль элемента   | `option`        | `option`                 | `menuitem`         |
| где DOM-фокус   | на контейнере   | **на поле, не в списке** | на элементе        |
| навигация       | roving tabindex | `aria-activedescendant`  | roving tabindex    |
| элемент         | выбирается      | выбирается               | выполняет действие |
| `aria-selected` | есть            | есть                     | нет                |

Проверка на конкретном коде: `ListBox.vue` держит `tabindex="0"` на корне, а
`TListKeyboardPlugin` слушает `keydown` там же — ListBox спроектирован как
самостоятельный фокусируемый виджет. В combobox фокус не имеет права уходить с
поля. Вложить готовый ListBox внутрь Select значит снимать ему `tabindex`,
глушить его клавиатурный плагин и перенаправлять подсветку наружу. Это не
переиспользование, а борьба, и она добавляет ListBox режимы ради чужого
компонента — после чего его тесты начинают охранять два поведения сразу.

**Делим по слоям, а не по компонентам:**

| Слой                                                   | Общий?    | Где                                                         |
| ------------------------------------------------------ | --------- | ----------------------------------------------------------- |
| оверлей: якорь, позиционирование, z-index, закрытие    | **общий** | `TFrame` + `TAnchorPlugin` + `TDismissPlugin`               |
| поведение списка: подсветка, скролл к элементу, высота | **общий** | `TListItemPlugin`, `TListScrollPlugin`, `TListHeightPlugin` |
| визуальная строка элемента                             | **общий** | `Button` внутри элемента + SCSS                             |
| движок коллекции, `selection`, `order`, `meta`         | **общий** | `base/collection`                                           |
| контейнер списка и его ARIA                            | **свой**  | у каждого компонента                                        |
| модель фокуса и клавиатура                             | **своя**  | у каждого компонента                                        |

**Критерий: общее — то, что не зависит от роли и модели фокуса.**

Дублирования разметки при этом почти нет, и оно уже решено: `ListBoxItem`,
`TabsItem`, `AccordionItem` и `SelectItem` рисуют строку одним и тем же
`Button`. Общая визуальная единица вынесена, различается только контейнер — то,
что и обязано различаться.

Отдельного `DropDown` не заводим: когда у Frame есть якорь, дропдаун — это
оверлей плюс произвольное содержимое, а не компонент со своим списком.

## Пакеты иконок

Пакет иконок — **реализация контракта**, а не мешок SVG. Контракт — список
ролей в `setup/registry/icons.ts` (`ICON_ROLES`): `check`, `checkIndeterminate`,
`close`, `arrowDown`, `arrowRight`. Ровно как тема реализует классы, которые
soldy выпускает в разметку.

Добавили иконку в новый компонент — добавьте роль в `ICON_ROLES`, и
conformance-тест сразу покажет, какие пакеты её ещё не закрыли.

**Формат — данные, не разметка:**

```ts
export const close: TIconSource = {
  viewBox: '0 -960 960 960',
  body: '<path d="M480-424 284-228q…"/>',
}
```

`body` — содержимое `<svg>` без самого тега, поэтому корень строит адаптер и
может задать размер, `aria-hidden` и классы. Отдай пакет целую строку
`<svg>…</svg>` — всё это стало бы недоступно.

Два ограничения, из-за которых формат именно такой:

- **никакой магии сборщика.** Прежний `import './close.svg?raw'` понимал
  только Vite: опубликуй пакет — и потребитель на webpack или в Node получит
  ошибку разрешения модуля;
- **никакого рантайм-компилятора.** Адаптер строит разметку через `h()`, а не
  `template`. Раньше из-за `defineComponent({ template: svg })` в конфиге стоял
  алиас на полный билд Vue — иконки навязывали лишний вес каждому приложению и
  ломались при CSP без `unsafe-eval`.

**Пакет подключает приложение, как тему:**

```ts
import { setIcons } from '@soldy/setup'
import * as material from '@soldy/icons-material'

setIcons(material)
setIcons({ close: myCloseIcon }) // точечно, поверх набора
```

Без вызова компоненты рисуют пустую заглушку и один раз печатают, какой роли
не хватает. Бросать исключение нельзя: из-за одной иконки упало бы всё
приложение.

**Устройство пакета** (`packages/icons/material/`): SVG лежат в `src/*.svg` и
правятся глазами, `src/index.ts` **генерируется** и закоммичен — как
метаданные Angular. После правки SVG нужен
`npm run generate --workspace=@soldy/icons-material`.

Генератор снимает `fill="#…"` из исходников Material: цвет должен наследоваться
через `currentColor`, иначе иконка не подхватит цвет текста.

**Иконка в компоненте — три независимые вещи.** Не путайте их:

| Что                                | Чем решается                    |
| ---------------------------------- | ------------------------------- |
| откуда берётся иконка по умолчанию | пакет (`setIcons`)              |
| как заменить её в одном месте      | слот (`#close-icon`, `#clear`)  |
| как до неё доходит состояние       | обёртка с `data-*` вокруг слота |

Третье — это то, что Ark UI называет `Indicator`. Отдельным компонентом его не
заводим: потребитель его не адресует, значит по критерию «часть или слот» это
разметка со слотом внутри.

## Темы: у пакета темы свои инструкции

Библиотека выпускает BEM-классы и `data-*`, тема отдаёт под них CSS. Дальше
этой границы правил на уровне проекта нет: палитра, цветовые схемы, препроцессор
и сборка — **внутреннее дело пакета темы**, и у двух тем они могут не совпадать
ни в чём.

Поэтому перед правкой стилей читай `AGENTS.md` того пакета, который правишь:

- `packages/themes/oren/AGENTS.md` — шкалы и роли ступеней, семантические
  токены, светлая и тёмная схемы, наборы значений и вид по умолчанию, ловушки
  Tailwind, чем стережётся.

Переносить оттуда правила на другую тему нельзя: в `oren` номер ступени
означает роль (расстояние от поверхности), а не светлоту, — но это решение
`oren`, а не контракт soldy.

Поведение темы — плагины и расширения, без которых её CSS не работает, —
пакет темы отдаёт объектом `defineTheme` из точки входа `./setup`, приложение
подключает его `useTheme` (см. «Плагины и расширения снаружи»).

Что общее и живёт здесь: тема стилизуется по `data-*` и **никогда** по `aria-*`
(см. «Доступность (a11y)»), а состояние в разметку отдаёт обёртка компонента,
не тема.

## Оформление: значения объявляет тема (критично)

Какие у кнопки виды и какие варианты цвета, решает дизайн, а не библиотека.
Одной теме нужны пять видов кнопки и один вариант цвета, другой — ни одного
вида. Поэтому набор значений `variant`, `view`, `shape` и `animation` объявляет
пакет темы, а у ядра его нет.

**Критерий.** Свойство принадлежит теме, если значение описывает только вид, а
набор значений — решение дизайна: `variant`, `view` у Button, Tabs, ListBox,
Accordion и Tags, `view` у CheckBox и RadioGroup, `shape` и `animation` у
Skeleton. Свойство принадлежит библиотеке, если значение читают ядро, плагин
или разметка либо смысл у него один в любой теме: `size` (шкалу читает
`shiftSize`), `orientation`, `alignment` и `position` у Tabs, `indicator`,
`contentFit`, `placement`. Такие остаются union'ами ядра. Булев флаг на месте
вида — тоже значение темы: `plain` у CheckBox стал `view`, флаг не давал теме
ни добавить второй вид, ни отказаться от первого.

**Реестр вместо union.** На каждое свойство — интерфейс, наследующий
`TThemeRegistry` (`core/src/common/types.ts`), а тип значения — его ключи:

```ts
export interface IButtonViews extends TThemeRegistry {}
export type TButtonView = Extract<keyof IButtonViews, string>
```

Реестры: `IComponentVariants`, `IButtonViews`, `ITabsViews`, `ICheckBoxViews`,
`IRadioGroupViews`, `ISkeletonShapes`, `ISkeletonAnimations`. Тема дополняет
модуль в своём `index.d.ts`:

```ts
declare module '@soldy/core' {
  interface IButtonViews {
    plain: true
  }
}
```

Тема ничего не объявила — тип значения `never`: у простой темы значений просто
нет. Проверка у значений только типовая: в рантайме значение и так уходит в
класс строкой. Пропсы React, Solid и Svelte и шаблоны Vue выводятся из пропсов
ядра и получают имена темы сами.

`view` у ListBox и Accordion — псевдоним `TButtonView`, а не свой реестр:
строку рисует `Button`, и вид списка — это вид его строк. Со своим реестром
проброс `view` в строку нельзя было бы типизировать. Проброс остаётся: это
значение потребителя, а не библиотеки.

У Tags `view` — тоже псевдоним `TButtonView`: пилюля тега — это вид кнопки. Но
в строку вид не пробрасывается, и тегу он не доставляется вовсе. Крестик —
сосед строки, и фон вида обязан покрывать и его, поэтому пилюлю рисует элемент
тега, а тема читает вид с класса набора (`s-tags--view-<v>`). Сторожит
`packages/ui/vue/__tests__/tags-close.spec.ts`,
`describe('вид — у пилюли, а не у строки')`.

**Умолчание — модификатора нет.** Умолчание свойства темы — `undefined`
(третий аргумент `TDefaultValues`), а не `'normal'` и не `'default'`: такое имя
снова было бы известно библиотеке. Блок без модификатора и есть вид по
умолчанию, рисует его тема. Сеттер принимает `undefined`, фасады элементов не
подставляют запасного значения.

**Модификатор — с префиксом:** `--view-<v>`, `--variant-<v>`, `--shape-<v>`,
`--animation-<v>`. Имя выбирает тема, и без префикса оно столкнулось бы с
модификатором библиотеки: `variant="open"` — с `--open` у Select, вид
`vertical` — с ориентацией Tabs. Ставится модификатор через `TClasses.swap` с
префиксом: пустое значение он пропускает, а `swapClass` с шаблонной строкой дал
бы `--variant-undefined`.

**Разметка библиотеки значений темы не передаёт.** Раньше крестик таба
рисовался с `view="plain"`, строка таба — с `view="none"`: это имена oren, и у
темы с другими именами разметка ставила бы модификатор, под который нет CSS.
Такие части тема красит по контексту (`packages/themes/oren/AGENTS.md`).
Плагины библиотеки значений темы не читают. Плагин, данные которого нужны
только CSS одной темы, живёт в пакете темы и ставится её регистрацией:
`TTabsViewPlugin` (геометрия активного таба) — в `@soldy/theme-oren/setup`
(см. «Плагины и расширения снаружи»).

Нельзя:

- добавлять `| string` в реестр или значения в реестры ядра — пропадёт
  проверка;
- отдавать значения темы через `data-*`: модификатор — это класс, а `dataset` —
  состояние;
- заводить рантайм-списки значений в пакете темы: тема отдаёт CSS и
  `index.d.ts`, списки для стенда живут в стенде.

**Чем стережётся.**

- Фикстура `__tests__/theme.d.ts` в `core`, `ui/vue` и `ui/webc` — реестры с
  условными именами, которых нет в oren. С именами oren фикстура открыла бы их
  и коду `src` той же программы: `variant: 'normal'` в умолчании ядра и
  `view="plain"` в шаблоне Vue прошли бы типы. Тесты задают значения только
  из фикстуры.
- `core/__tests__/theme-registries.spec.ts` — тип каждого значения равен ровно
  именам фикстуры, то есть ядро само ничего не объявило (проверяет «Типы —
  Core»), а у свежих инстансов всех визуальных классов экспорта нет модификаторов
  темы.
- `setup/__tests__/theme-values-markup.spec.ts` — в
  `packages/ui/*/src/components/**` нет литерала `view`, `variant`, `shape` или
  `animation` ни в одной форме записи (`view="…"`, `:view="'…'"`, `view={'…'}`,
  `[view]="'…'"`, `{ view: '…' }`). В Angular литерал в шаблоне типами не
  ловится: «Типы — Angular» (`ngc`) проверяет имя инпута, но не значение —
  инпуты компонентов объявлены именами в `inputs` декоратора, без типа.
- `themes/oren/__tests__/theme-values.spec.ts` — каждый модификатор темы в CSS
  объявлен в `index.d.ts`.
- Стенд сверяет свои списки значений с `index.d.ts` oren (см. «Playground»).

## Слой оверлея

Всё, что открывается поверх страницы, собирается из трёх кусков:

- **`TFrame`** — телепорт, `rendered`/`visible`, стек z-index.
- **`TAnchorPlugin`** (namespace `anchor`) — привязка к чужому элементу:
  `anchor_anchor`, `anchor_placement`, `anchor_matchWidth`, `anchor_flip`.
  Считает координаты и пишет их во Frame (`x`/`y`/`width`); раскладывает их
  `TFrameLayoutPlugin`.
  Разделение не формальное: раскладка отвечает за собственные пропсы Frame,
  привязка — за слежение за посторонним элементом. Поверх выбора потребителя
  (`placement`, один из `bottom-start`/`bottom-end`/`top-start`/`top-end`)
  плагин сам решает **flip** (переключает `top`/`bottom`, если на выбранной
  стороне панель не влезает по высоте окна, а на противоположной места
  больше — иначе остаётся на стороне потребителя) и **shift** (сдвигает `x`
  внутрь окна, чтобы панель не вылезала за левый и правый край; шире окна —
  прижимается к левому). **RTL** (`getComputedStyle(anchor).direction`)
  разворачивает выравнивание: в RTL `-start` держит правый край якоря,
  `-end` — левый. Фактическая сторона после flip уходит теме через
  `data-placement` на самом Frame. Размер якоря и панели плагин узнаёт без
  scroll/resize окна — на обоих висит свой `ResizeObserver`, поэтому позиция
  пересчитывается и когда меняется только их размер (пропал тег, вырос
  Popover). Flip выключается `anchor_flip: false` (по умолчанию включён):
  панель держит сторону потребителя, даже если там не влезает, — так Select
  выражает `placement: 'top'` и `'bottom'`. Shift от выключателя не зависит.
- **`TDismissPlugin`** (namespace `dismiss`) — «нажали мимо». Сам следит за
  открытостью владельца (`property`, по умолчанию `open`) и закрывает его.

Две вещи, которые легко забыть:

**Открытость — это `visible`, а не `rendered`.** Опции регистрируются в
коллекции при монтировании и выбывают при размонтировании. Спрячь панель через
`v-if` — и закрытие вычистит коллекцию, а вместе с ней выбор и значение поля.
`v-show` ставит `display: none`, чего достаточно и чтобы убрать панель из
дерева доступности.

**Панель помечается владельцем.** Она телепортирована, то есть лежит вне
поддерева владельца, и простой `contains()` счёл бы нажатие внутри неё
нажатием мимо. `TDismissPlugin.ownerAttribute` даёт `data-owner="<uid>"` —
чистый DOM, одинаково во всех шести адаптерах.

## Что общее, а что специфично для фреймворка

`packages/setup/naming/` и `packages/setup/adapter/` — поведение, одинаковое во
всех адаптерах. Прежде чем писать что-то в `packages/ui/*/adapter/`, проверь,
не место ли этому там:

- `underscorePropNaming` (`naming/`) — имя пропа одинаково везде (`ns_name`).
- `callbackEventNaming` (`naming/`) — `element:ready` → `onElementReady`; общая стратегия
  для React, Svelte и Solid, где события это колбэк-пропы. Тип-зеркало —
  `TCallbackEventProps`. Остальные адаптеры именуют события в своём
  `adapter/common/naming.ts`: Vue и Web Components отдают имя ядра как есть
  (`element:ready`), Angular — camelCase (`elementReady`).
- **Профиль фреймворка** (`IAdapterProfile`) — стратегия имён и слот по
  умолчанию, одна константа на адаптер (`VueProfile`, `ReactProfile`, …).
- **Поверхность** — `surfaceOf(descriptor, profile)`: публичный API компонента
  в именах фреймворка. Считается один раз на пару «дескриптор × профиль» и
  кэшируется: пропсы внешних плагинов идут через `pluginProps`, так что это
  свойство типа.
  Из неё берут статический слой (`props`/`emits` Vue, `observedAttributes` и
  прототип WebC, кодоген Angular) и рантайм.
- **Связка** — `bindComponent(adapter, profile)` на монтирование: состояние
  для фреймворка (`subscribe` / `getSnapshot`), проброс событий и моделей
  (`bindEvents`), чтение пропа по двум именам (`read`), запись с guard'ом
  (`write`/`writeAll`/`writeChanged`) и спред несъеденных пропсов (`forward`).
  Адаптеру остаётся сказать, куда положить значение и как отдать событие.
  Своих циклов по аксессору у адаптера нет.
  **Состояние — хранилище, и путь у значения один** (критично). Сработал
  триггер — связка перечитывает свойство и отдаёт подписчикам. Подписался
  фреймворк при монтировании — связка делает то же для каждого свойства.
  Инициализация — это и есть подписка: адаптер заводит рефы, стор или сигнал
  в колбэке `subscribe`, отдельного стартового снимка и стартовой записи у
  него нет. Порядок — сначала подписка на триггеры, потом чтение — держит
  связка. Кто рисует до подписки (React: `useSyncExternalStore`), рисует по
  `getSnapshot()`: снимок неизменяемый, тот же объект, пока ничего не
  сменилось, а подписка сверит его с ядром. Составные свойства (`classes`,
  `aria`, `attrs`, `dataset`, состав коллекции) отдают новый объект на каждое
  чтение, поэтому связка сверяет их по содержимому. Раньше адаптер брал снимок
  и подписывался сам, и React со Svelte подписывались в эффекте — изменение
  ядра между рендером и эффектом до них не доходило. Сторож —
  `setup/__tests__/binding.spec.ts`, «связка · состояние для фреймворка».
  **Модель** — событие двусторонней привязки (`update:<prop>` у Vue) —
  объявляет профиль (`IAdapterProfile.model`), поверхность кладёт её в
  `exportEvents`, эмитит связка в `bindEvents` после события ядра и только на
  изменение.
  **Адаптер решает, куда положить значение, а когда и в каком порядке —
  setup** (критично). Своего порядка «снимок, потом подписка», стартовых
  записей и веток «если фреймворк X» у адаптера нет. Понадобилось — механику
  дорабатывают в setup для всех шести, а не подстраивают под цикл одного
  фреймворка.
  **Дедупликация событий обязательна**: один raw-триггер объявлен у нескольких
  пропов (`present` повторяет триггеры `rendered` и `visible`), иначе
  потребитель получает два эмита на одно изменение. Синхронизацию состояния
  дедуплицировать нельзя — `present` обязан пересчитываться на обоих триггерах.
  `forward` съедает пропы, события и **слоты** дескриптора, иначе
  `leading={<Icon/>}` доезжает до DOM атрибутом.
  **`writeAll` получает полный набор пропсов**: отсутствующий в нём проп значит
  «не задан», и заданный раньше вернётся к умолчанию (см. «Две поверхности
  управления»). Angular (`ngOnChanges`) и Web Components (атрибут или свойство
  элемента) отдают только изменившееся — дельту — и пишут через
  `writeChanged`: он трогает лишь свойства, чей ключ есть в объекте. Дельта в
  `writeAll` сбросила бы к умолчанию всё, чего в ней нет. Из полного набора
  `writeAll` пишет только проп, сменившийся с прошлого набора (`Object.is` с
  последним значением фреймворка): React, Solid и Svelte отдают набор на каждом
  проходе, и повтор откатил бы к разметке то, что с тех пор поменяли ядро или
  код через инстанс, — список, открытый кликом при `open={false}`, закрылся бы
  от смены плейсхолдера. Так в ядро во всех адаптерах пишется только то, что
  поменял фреймворк: Vue — `watch` на каждый проп, Angular и Web Components —
  дельтой. Начальные значения связка не пишет: их применяет сборка контекста
  (см. «Две поверхности управления»), а память связки начинается с тех же
  пропсов — первый проход фреймворка пишет только сменившееся с тех пор.
  Пересборка контекста (React заново устанавливает эффекты: StrictMode,
  `<Activity>`) — такое же монтирование, и пропсы применяются снова. Сторож —
  `setup/__tests__/binding.spec.ts`, «связка · повторённый проп» и «сборка ·
  начальные значения пропсов».
- `adapter.bindElement(el)` — связка корневого узла с `TElementPlugin`. Метод
  контекста, а не расширение: её зовут все шесть адаптеров. У компонента без
  этого плагина вызов ничего не делает.

**Правило:** починил баг в одном адаптере — проверь остальные. Исторически
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
`component-view.class.ts` — асимметрия здесь однажды уже приводила к бесконечному
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

При внешнем `ctrl` разметка остаётся разметкой: `<Select :ctrl="x"
placeholder="Выберите">` обязан показать плейсхолдер.

**Начальные значения применяет сборка — одна точка для всех шести адаптеров**
(`applyInitialProps`, `assemble/initial-props.ts`). Пропсы каждый адаптер и
так отдаёт в `createAdapterContext`. Свой инстанс получает пропсы ядра
конструктором (`ctrl ?? new Ctor(props)`), и второй раз они не пишутся:
сеттер `items` фасада коллекции пересоздал бы элементы. Внешнему `ctrl` и
плагинам (их создают после инстанса) сборка пишет сеттером через аксессор, и
сеттер сам эмитит триггер. Пишется только то, что отличается от умолчания
декларации: проп, равный умолчанию, ничего не задаёт. Так внешний `ctrl`
сохраняет своё состояние, даже когда фреймворк подставил умолчание за автора —
Vue делает это с каждым пропом, у которого объявлен `default` (см. ниже).

Адаптер стартовых значений не пишет — ни `watch` с `immediate`, ни отдельной
записью перед подпиской, ни первым набором. Своё начальное состояние
фреймворк получает подпиской на связку (`subscribe`): она отдаёт каждое
свойство тем же вызовом, что и триггер (см. «Что общее, а что специфично»).
Дальше в обе стороны идут только изменения. Понадобилась стартовая запись в
одном адаптере — значит, сборка или связка чего-то не сделали: чинится в
setup, одинаково для всех, а не подстройкой под цикл фреймворка.

**Снятый проп возвращается к умолчанию, ни разу не заданный не пишется.**
`undefined` из фреймворка значит «проп не задан», но за ним два разных случая:
проп не передавали — и проп сняли. Различает их связка (`write`): она помнит,
какие входы фреймворк задал. Заданный вход, ставший `undefined`, получает
умолчание декларации — и на внешнем `ctrl` тоже: разметка проп задала,
разметка его и сняла. Вход, который ни разу не задавали, связка не пишет, и
состояние чужого инстанса остаётся его. У трёхзначных пропсов умолчание
`undefined` значит «как у владельца» (`closable` у `TTabsItem`/`TTagsItem`,
`contentFit` у `TListBoxItem`); пока связка пропускала любой `undefined`,
вернуть такой проп из разметки к владельцу было нельзя.

Поэтому проп, который бывает «не задан», объявляет это умолчанием —
`undefined` или `null`: имя (`aria_label`, `aria_labelledBy`,
`aria_describedBy`), `width` и `height` у Icon, `trackBy` фасадов коллекций,
`anchor_anchor` у Frame (`null` — панель ни к чему не привязана). Пока ключа не
было, снятый проп оставался с прежним значением во всех адаптерах: у кнопки
старое имя, у иконки размер, у панели привязка. Без умолчания остаются только
`items` и `mode` фасадов коллекций: `undefined` их сеттеры не принимают,
сбрасывать не к чему, и значение остаётся. Сторожа —
`setup/__tests__/binding.spec.ts`, «связка · снятый проп», и
`setup/__tests__/prop-defaults.spec.ts` (см. «Умолчание пропа — в
декларации»).

### Умолчание пропа — в декларации (критично)

Значение, с которым стартует незаданный проп, живёт в классе, которому проп
принадлежит: `static defaultValues` у класса ядра (`TComponentView`) и у
плагина (`TAnchorPlugin`). Не в contribution: плагин работает и без setup
(`bundle.use`), и значение жило бы в двух местах.

До адаптера его доносит декларация — поле `IPropDeclaration.default`.
Заполняет его setup при сборке дескриптора:

- свой и унаследованный проп — `defineComponent`, из `defaultValues`
  итогового `ctor`, пересчётом: у Frame `visible` — `false`, хотя
  ComponentView объявил `true`. Декларации родителя не мутируются;
- проп плагина — `definePlugin`: заданная опция дескриптора, иначе
  `defaultValues` плагина. Опция впереди, иначе Vue при монтировании перетёр
  бы опцию автора дескриптора умолчанием класса.

Поверхность (`surfaceOf(...)`) кладёт `default` в конфиг пропа
(`exportProps`) — Vue (`useProps`) раскладывает его как есть — и в свойство
поверхности (`ISurfaceProp.default`): к нему связка во всех шести адаптерах
сбрасывает снятый проп (см. «Две поверхности управления»). Статическому слою
остальных адаптеров умолчание не нужно: отсутствующий проп у них `undefined`,
и что с ним делать, решает связка.

**Объявлено — значит, ключ есть**, даже со значением `undefined`.
`closable: undefined` у `TTabsItem`/`TTagsItem` держит наследование от
владельца, `value: undefined` у `TValueControl` не даёт Vue сделать
отсутствующий `value` равным `false`. Проверка `default !== undefined` ломает
оба случая молча, а заодно и сброс: снятый `closable` связке было бы не к чему
вернуть.

**Тип умолчаний — `TDefaultValues`, не `Partial<IXProps>`.** `Partial` делает
объявленные ключи необязательными, и конструктор добирал умолчание через
`ctor.defaultValues.x!`. Класс пересекает умолчания родителя со своими и
перечисляет только свои ключи: с настоящим умолчанием — вторым аргументом,
объявленные со значением `undefined` — третьим:

```ts
static defaultValues: typeof TValueControl.defaultValues &
	TDefaultValues<ITabsItemProps, 'text' | 'closeLabel', 'closable'> = {
	...TValueControl.defaultValues,
	text: '',
	closable: undefined,
	…
}

this._closeLabel = own.closeLabel ?? ctor.defaultValues.closeLabel
```

Родительский `typeof` обязателен, иначе статическая сторона наследника
несовместима с базой; переопределённый ключ родителя (`visible: false` у
Frame) в список не вносится. Списки сверяет компилятор: забытый ключ, ключ
литерала вне списка и родителя, ключ вне props-интерфейса — ошибки. `satisfies
Partial<IXProps>` вместо аннотации не годится: он оставляет литеральные типы, и
`visible: false` у наследника против `true` у базы роняет наследование.
Сторож — `packages/core/__tests__/default-values.spec.ts`.

**Почему не адаптер.** Раньше `useProps` во Vue сам читал `defaultValues` ядра
рефлексией и искал в карте по имени без неймспейса. Пропы плагинов умолчаний
не получали: отсутствующему Boolean Vue ставил `false`, а
сборка писала его в плагин. У `dismiss_enabled` и
`anchor_matchWidth` умолчание и так `false`, поэтому этого не было видно;
`anchor_flip` с умолчанием `true` молча выключил бы flip у всех Frame.

Сторож — `packages/setup/__tests__/prop-defaults.spec.ts`. По всем
дескрипторам экспорта у незащищённого пропа с `Boolean` в типе (сам, в
массиве, в `defineType`) умолчание объявлено и равно стартовому значению: у
свежего инстанса или у плагина из собранного набора. Это ровно те пропы, которые
Vue приводит сам. Расхождение чинится значением в `defaultValues`, а не
исключением в стороже.

Второй сторож там же, «проп, который пишет разметка, объявляет умолчание»: у
каждого незащищённого пропа с триггерами, своего и плагинного, ключ `default`
есть — значение не важно. Исключения — `items` и `mode`, и только у
дескриптора, чей класс наследует `TCollectionComponent`: «не задано» их
сеттеры не принимают. Дескриптор без своего класса (`CollectionDescriptor`)
пропускается — умолчание пересчитывает от своего класса наследник. Новый проп
без умолчания чинится ключом в `defaultValues` (`undefined` или `null`); в
исключения проп попадает, только если его сеттер «не задано» не принимает.

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

Инвариант зафиксирован в коде: набор собирает только сборка, по составу
(`assemble/composition.ts`), и наружу отдаётся доступ к **уже созданному** —
через `bundle:create` и `<ns>:create`. То же самое с `engine` у коллекций.

Цена решения: `bundle:create` идёт по шине core, хотя плагины — слой над core.
Это осознанное исключение, а не протечка. Шина используется как транспорт, не
как зависимость: `packages/core` не импортирует `@soldy/plugins`, но имя
события объявляет — в `TComponentEvents`, с аргументом `unknown`. Карта событий
закрыта, и без имени в ней не скомпилировались бы ни подписка с инстанса, ни
проп события адаптера, который выводится из той же карты. Тип бандла ядру
неизвестен, поэтому подписчик сужает аргумент сам (`bundle instanceof
TPluginBundle`). В список событий дескриптора имя вносит `EntityDescriptor`
(setup).

Эмит живёт там же, где плагины создаются, — в сборке набора
(`setup/assemble/bundle.ts`). Не заводите для этого отдельный шаг,
который каждый адаптер обязан помнить и вызывать: седьмой адаптер про него
забудет.

Отложен на микрозадачу **по той же причине, что и `engine:create` в
`engine.class.ts`**: адаптер подписывается на события уже после того, как
получил bundle из `createAdapterContext`. Синхронный эмит проверен — ломает
8 тестов в setup/vue/svelte/solid.

`create` объявлен в слое плагинов (`PLUGIN_EVENTS` в
`packages/plugins/src/base/events.ts`) и подмешивается в contribution каждого
плагина **явно**. Не добавляйте его автоматически внутри `definePlugin`.
Этот же список задаёт и рантайм-проброс, и типы дескриптора: остальные события
базы (`TPluginInternalEvents` — `install` и `destroy`) `TPluginEventsFrom`
снимает с карты плагина, второго списка имён в setup нет. Сторожит
`packages/setup/__tests__/plugin-events.spec.ts`.

## Плагины и расширения снаружи (критично)

Своё поведение компоненту добавляют без правки библиотеки. Путей три, и
механизмов под ними два: доступ к набору одного компонента и реестр на тип.

```ts
// 1. Одному компоненту — из bundle:create / engine:create
<Button @bundle:create="(b) => b.use(TTimerPlugin)" />
<ListBox @engine:create="(e) => e.use(new TProbeExtension())" />

// 2. Всем компонентам типа — в точке входа приложения
usePlugins(TButton, [TTimerPlugin])                     // только кнопки пользователя
usePlugins(TButton, [TRipplePlugin], { scope: 'all' })  // и детали чужой разметки
useExtensions(TTags, [(owner) => new TTagsHistoryExtension({ owner })])

// 3. Тема — тот же реестр одним объектом
import oren from '@soldy/theme-oren/setup'
useTheme(oren)
```

**Набор плагинов живёт своим циклом.** `TPluginBundle.created()` объявляет
плагины в порядке установки, включая поставленные в `bundle:create`; плагин,
поставленный позже, объявляется сразу в `use()`. `destroy()` уничтожает их в
обратном порядке. Уничтожает набор контекст адаптера, который его создал
(`createAdapterContext`); набор из `config.bundle` — чужой: так адаптер
коллекции делит набор с компонентом. До этого `destroy()` плагинов не
вызывался при размонтировании ни в одном адаптере.

**Реестр на тип — в setup, а не в ядре и не в адаптере.** Тип — класс ядра,
сравнение через `instanceof`: объект дескриптора строится заново на каждом
монтировании, компонент адаптера у каждого фреймворка свой, а класс один.

- Плагины реестра ставятся после плагинов дескриптора, до `bundle:create`
  (состав монтирования). Один класс — один экземпляр, опции последней регистрации.
- Внешний плагин только добавляет: класс из состава компонента — ошибка
  сборки. Это и есть граница с «Почему bundle не принимается снаружи»: набор
  компонента остаётся инвариантом, реестр его дополняет.
- Компоненту без своих плагинов реестр набора не создаёт: без `TElementPlugin`
  плагину не с чем работать.
- Расширения коллекции ставит `TCollectionExtension` при привязке движка;
  владелец — хозяин набора (`bundle.getInstance()`). Имя, занятое расширением
  другого класса, — ошибка; движок, переданный двум компонентам, получает
  расширение один раз. Движок о реестре не знает.
- Регистрация возвращает отмену и действует на компоненты, собранные после
  неё. Ленивый модуль вправе зарегистрировать плагин после старта приложения.

### `scope` и признак `embedded`

Строка и крестик тега — тоже Button. Плагин приложения на кнопки не должен
молча вставать в чужую разметку, поэтому `scope` по умолчанию — `'own'`, а у
темы (`useTheme`) — `'all'`: тема рисует компонент везде.

Отличает деталь признак `embedded` с именем места (`tags.close`,
`select.field`). Ставит его **разметка библиотеки** на каждый компонент soldy,
который использует как деталь; элементы своей коллекции (`ListBoxItem` в
`ListBox`) признака не несут. Проп объявлен у всех компонентов в
`EntityDescriptor` рядом с `ctrl`: триггеров нет, в инстанс он не пишется,
читает его сборка компонента (`setup/assemble/component.ts`) из пропсов — ни
один адаптер не обязан помнить отдельный шаг.

Сторож — `setup/__tests__/embedded-markup.spec.ts`: вложенный компонент soldy в
`packages/ui/*/src/components/**` без `embedded` роняет тест. Забытый признак
ничего не ломает видимо, поэтому стережётся тестом, а не ревью.

Ограничение: признак не наследуется. Tags в поле Select — деталь
(`select.tags`), но его собственные теги для реестра `TTagsItem` — обычные
элементы.

### Внешний плагин: пропсы — `pluginProps`, события — `plugin:event` (критично)

Поверхность компонента — пропсы, события и слоты — объявляет **только
дескриптор**, и она одна на тип во всех шести адаптерах. Плагин, поставленный
снаружи (`usePlugins` при сборке или `bundle.use` в любой момент жизни
компонента, например в `bundle:create`), своих пропсов в поверхности не
получает: статический слой адаптера объявляет её раньше, чем приложение
регистрирует плагины (Vue — при импорте модуля, Angular — кодогенерацией,
Web Components — на прототипе), а поставить плагин можно и после
монтирования.

Поэтому у каждого компонента один проп и одно событие на все внешние плагины —
объявлены в `EntityDescriptor`, рядом с `ctrl`, `embedded` и
`bundle:create`:

```ts
// Контракт плагина — один раз, рядом с классом: definePlugin записывает его за классом
definePlugin({
  ctor: TTimerPlugin,
  namespace: 'timer',
  contribution: { props: { ms: { type: Number, triggers: ['change:ms'] } }, events: ['tick'] },
})
usePlugins(TButton, [TTimerPlugin])

<Button :plugin-props="{ timer_ms: 500 }" @plugin:event="({ name, args }) => …" />   // Vue
<Button pluginProps={{ timer_ms: 500 }} onPluginEvent={({ name, args }) => …} />    // React, Solid, Svelte
<s-button [pluginProps]="{ timer_ms: 500 }" (pluginEvent)="…" />                     // Angular
el.pluginProps = { timer_ms: 500 }; el.addEventListener('plugin:event', …)          // Web Components
```

- **Контракт — свойство класса плагина** (`pluginContractOf`), а не места,
  где его поставили. Плагин без `definePlugin` работает, но значений из
  `pluginProps` не получает и событий наружу не шлёт.
- **Путь один, когда бы плагин ни встал.** Набор сообщает `use` и `remove`
  (`TPluginBundle.events`), контекст (`TExternalPlugins`) подключает плагин
  одинаково при сборке и позже. Значения, пришедшие раньше плагина, ждут его.
- **Правила — те же, что у пропсов компонента.** Начальное значение пишется,
  только если отличается от умолчания декларации; ключ пропал из
  `pluginProps` — проп возвращается к умолчанию.
- **События** — явные и триггеры пропсов плагина — уходят конвертом
  `{ name: 'timer:tick', args }` (`TPluginEvent` в ядре) на шину инстанса,
  как `bundle:create`: его видят и адаптер, и тот, у кого на руках только
  `ctrl` (`ctrl.events.on('plugin:event')`).
- **Плагин дескриптора через `pluginProps` не пишется**: его пропсы уже в
  поверхности (`aria_label`, а не `pluginProps.aria_label`).
- Типы ключей приложение дописывает в `IExternalPluginProps` (module
  augmentation `@soldy/setup`).

Прошлые попытки: пропсы внешнего плагина плоско, через `attrs` во Vue, и
типы `IRegisteredPlugins` — поверхность начинала зависеть от фреймворка;
затем внешний плагин без пропсов вовсе (PR #111). Проп-мешок одинаков во всех
шести адаптерах и не зависит от того, когда плагин встал.

Тесты: `setup/__tests__/registered-plugin-contract.spec.ts`,
`plugin-registry.spec.ts`, `extension-registry.spec.ts`,
`ui/vue/__tests__/external-plugin.spec.ts`,
`ui/react/__tests__/external-plugin.spec.tsx`.

## Слоты — третья категория контракта

Рядом с `props` и `events` в `IContribution` есть `slots`. До их объявления
слоты жили только в разметке Vue-шаблонов, и «одна структура во всех
фреймворках» ничем не гарантировалась.

```ts
export type TButtonSlots = { leading: {}; default: { text: string }; trailing: {} }

export const ButtonDescriptor = defineDescriptor(() =>
  defineComponent<IButtonProps, TButtonEvents, TButtonSlots>()({
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
```

Тип-зеркало лежит в файле дескриптора, рядом с объявлением, и меняется синхронно с ним — как
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

| Адаптер  | Спеллинг                | scope                         |
| -------- | ----------------------- | ----------------------------- |
| Vue      | `<template #leading>`   | `v-slot="{ text }"`           |
| Svelte 5 | `{#snippet leading()}`  | параметр сниппета             |
| React    | `leading={<Icon/>}`     | `{({ text }) => …}`           |
| Solid    | `leading={<Icon/>}`     | `{({ text }) => …}`           |
| Angular  | `<span slot="leading">` | `<ng-template slot let-text>` |
| WebC     | `<span slot="leading">` | ✗ нет механизма               |

Единственное преобразование имени — `default` → `children` в React/Solid/Svelte
(`resolveSlotName` из `packages/setup/adapter/common`). Остальные имена одинаковы везде.

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

## Доступность (a11y)

Паттерны берутся из **WAI-ARIA Authoring Practices (APG)** — роли, связки,
клавиатурная модель, — плюс накопленная практика обхода багов скринридеров
(её же реализует Zag). Ничего не изобретаем: если для виджета есть паттерн
APG, следуем ему, а расхождения объясняем в комментарии.

### Один набор: `aria` как объект

`TComponentView` держит `_aria: TAria` — живой объект рядом с `_classes`, с
методами `add` / `remove` / `get` / `has`. `add(name, null)` снимает атрибут.
Разметка биндит **один** набор: `v-bind="aria"`, `{...toAriaProps(aria)}`,
`[ariaAttrs]` в Angular. Адаптер читает снимок через `valueOf()`, ссылку на
объект за границу core → ui не отдаём.

Раньше `aria` был вычисляемым геттером и каждый источник отдавал свой набор.
У элемента таба в одном `v-bind` сходились четыре: роль от ядра, связка от
расширения, активность от коллекции, имя от плагина. Собрать это в шести
адаптерах невозможно — поэтому набор один, и пишут в него все.

Плата: вычисляемых записей нет, правила стали подписками.

```ts
this.events.on('change:disabled', () => this._syncDisabled())
this.events.on('change:tag', () => this._syncDisabled())
this._syncDisabled() // начальное состояние — руками
```

Забыть подписку легче, чем забыть геттер. Взамен у пропа `aria` **один**
триггер `change:aria`: набор сам сообщает, что изменился.

### Кто что пишет

| Источник             | Что пишет                              | Пример                                              |
| -------------------- | -------------------------------------- | --------------------------------------------------- |
| ядро компонента      | что он такое по своей природе          | `role="tab"`, `role="status"`, `aria-disabled`      |
| `TAriaPlugin`        | как его зовут                          | `aria-label`, `aria-labelledby`, `aria-describedby` |
| расширение коллекции | что о нём знает коллекция              | `aria-selected`, связка `id` / `aria-controls`      |
| плагин поведения     | то, что меняется от взаимодействия     | `aria-activedescendant` из `TSelectKeyboardPlugin`  |
| проводка (adapter)   | то, что известно только при связывании | сторона панели у `Tabs.Content`                     |

Правило: **пишет тот, кто знает факт**. Ссылка на панель не может стоять в
`TTabsItem` — о существовании панели знает коллекция, не элемент.

**Граница набора:** писать можно только туда, где есть экземпляр. У разметки
без компонента набора нет, и её атрибуты отдаются пропом — `content_aria` у
панели Accordion, `list_aria` у списка Select. Это не лазейка: см. «Часть или
слот».

### Парный набор: `dataset` для темы (критично)

`TComponentView` держит второй такой же набор — `_dataset: TDataset`, и
разметка биндит его рядом: `v-bind="{ ...aria, ...dataset }"`. Общая механика
(снимок через `valueOf()`, `null` снимает, один `change`) вынесена в
`TAttributes`; наследники добавляют своё.

**Никаких `:data-*` в шаблонах.** Состояние вычисляется в ядре и приходит
готовым набором. Раньше его считали шаблоны, и восемь биндингов в Vue уже
разошлись: ListBox отдавал `data-highlighted` сырым, Select — как
`String(!!value)`. Работало по случайности; при портировании на остальные пять
адаптеров копий стало бы сорок.

`TDataset` берёт на себя ровно то, что дублировалось:

- **префикс** — пишется `dataset.add('selected', …)`, в разметку уходит
  `data-selected`;
- **приведение типа** — булево и число становятся строкой. `false` даёт
  `"false"`, а не снимает атрибут: тема смотрит `[data-x='true']`, и
  «выключено» надо отличать от «неприменимо». Снимает только `null`.

| Источник               | Что пишет                                                                       |
| ---------------------- | ------------------------------------------------------------------------------- |
| `TSelectionExtension`  | `data-selected` — **всем** элементам коллекции                                  |
| `TActivationExtension` | `data-selected` — то же имя при состоянии `active`                              |
| `TListBoxExtension`    | `data-content-fit` — уже разрешённый (элемент поверх списка) и `data-indicator` |
| `TSelectExtension`     | `data-content-fit` и `data-indicator` — значения самого Select                  |
| `TListItemPlugin`      | `data-highlighted`                                                              |
| `TControl`             | `data-disabled` — на любом теге, от тега не зависит                             |
| ядро компонента        | своё состояние — `data-open` у `TSelect`                                        |

Два правила, которые легко нарушить:

- **пишет родительское расширение, не item-расширение.** Item-расширения
  создаются лениво — только когда адаптер запросит контекст элемента, — а
  атрибут обязан стоять с первой отрисовки, включая серверную;
- **имя атрибута описывает вид, а не механизм.** Активный таб помечается
  `data-selected`, хотя состояние называется `active`: тема красит выделенный
  элемент одинаково у таба, секции и опции. Расходится ARIA (`aria-selected` у
  опции, `aria-expanded` у секции) — она и остаётся за расширением компонента.

Наборы часто **биндятся к разным элементам**: ARIA живёт там, где её ждёт
скринридер (у Select — на поле с `role="combobox"`), `data-*` — там, где его
ждёт тема (у Select — на корне). Пишутся при этом рядом, в одном месте.

### Третий набор: `attrs` для нативных HTML-атрибутов (критично)

`TComponentView` держит и третий набор — `_attrs: TAttributes`, той же
механики, что `aria`/`dataset`, но без своего наследника: имена и значения
уже честные HTML. **`attrs` — атрибуты корня**: разметка биндит его на корень
компонента. У Button корень и есть элемент с `aria`, поэтому наборы стоят
рядом: `v-bind="{ ...attrs, ...aria }"`. У Input, CheckBox и Switch `aria`
стоит на вложенном `<input>`, а `attrs` остаётся на корне.

Повод для отдельного набора — правило «нативный атрибут вместо ARIA-дубля»,
которое раньше раскладывалось в разметке каждого адаптера: `TControl` решает,
у тега есть ли свой `disabled` (`NATIVE_DISABLED_TAGS` — `button`, `input`,
`select`, `textarea`, `fieldset`), и пишет либо нативный атрибут в `attrs`,
либо `aria-disabled` в `aria` — никогда оба на одном элементе. Раньше это
условие (`tag === 'button' ? disabled : undefined`) писал каждый шаблон Button
сам, и поменять список тегов значило бы поменять шесть шаблонов.

Теме ни одна из этих половин не годится: обе решает тег, и обе переезжают
вместе с ним. Поэтому `TControl` пишет ещё одну запись того же состояния —
`data-disabled` в `dataset`: на любом теге, отдельной подпиской на
`change:disabled`, мимо `_syncDisabled`. Тема читает disabled только из неё
(см. «CSS не стилизуется по `aria-*`»).

Значение — непустая строка (`'disabled'`), не `''` и не `'false'`: у
`disabled` играет роль только присутствие атрибута, но `''` React не
поставит вовсе, а `'false'` в DOM всё равно блокирует элемент — оставлять
такое значение в разметке вводит в заблуждение. `null` снимает атрибут, как и
у `aria`/`dataset`.

Не совсем пуст у визуального слоя самого по себе: сам `TComponentView` пишет
сюда `dir` по `direction` (`'inherit'` снимает атрибут — направление
наследуется от предка). Отдельного пропа `dir` в контракте нет — раньше он
дублировал то же значение вторым путём, и его вычисляли (`dir ?? undefined`)
в каждом адаптере отдельно. `TControl` дописывает `disabled`; появится второй
нативный атрибут с тем же правилом «есть у тега / нет у тега» — он идёт сюда
же, а не в третий набор.

**Половину правила решает тег её элемента.** Нативный `disabled` в `attrs` —
тег корня, `tag`. ARIA-половину — тег элемента, на котором стоит `aria`: хук
`TControl._ariaTag`, по умолчанию тот же `tag`. `TInput`, `TCheckBox` и
`TSwitch` возвращают из него `input`, и по нему же `TInput` решает
`aria-required` и `aria-readonly`.

**`tag` — всегда тег корня**, и разметка обязана рисовать корень по нему
(`<component :is="tag">` во Vue). Иначе проп декоративен: у Tabs.Item и
Accordion.Item он был `'button'` при жёстком `<div>` в шаблоне, и нативный
`disabled` уезжал на обёртку, у которой такого атрибута нет. Тег вложенной
строки фиксирует разметка (`tag="span"` у `Select.Item`, `tag="div"` у
`ListBox.Item` и `Tags.Item`), а `_ariaTag` элемента возвращает именно его:
`'button'` у Tabs.Item и Accordion.Item (`aria` стоит на вложенной кнопке),
`'div'` у ListBox.Item и Tags.Item, `'span'` у Select.Item.

Совпадение `aria-disabled` элемента с тем, что вложенный `Button` пишет себе
сам, — не второй путь к данным: это один атрибут одного элемента от одного
состояния, посчитанный по одному и тому же правилу. Второй путь был бы, если
бы разметка вычисляла его сама.

**Поэтому `aria` составного элемента — всегда на строке, не на обёртке.**
Набор элемента ложится поверх того, что `Button` пишет себе сам: `role="tab"`
или `role="option"` перекрывает его `role="button"`, и узел с ролью остаётся
один. У Select.Item `aria` стояла на обёртке — и строка внутри опции
объявляла себя кнопкой со своим `aria-disabled`. Лечится переносом набора на
строку, а не пропом, который глушит ARIA у `Button`.

Нативные атрибуты вложенного контрола фиксированного тега — `disabled`,
`required` и `readonly` у `<input>` Input, CheckBox и Switch — проводка в
разметке, как `name`: у фиксированного тега нет условия «есть ли атрибут у
тега», выносить в ядро нечего. ARIA-дублей им ядро не пишет, в `aria`
остаётся только то, чего нативный атрибут не выражает: `aria-required` на
readonly-поле Input (браузер такое поле не валидирует) и `aria-readonly` у
CheckBox и Switch (HTML не знает `readonly` у чекбокса). Поэтому отдельного
набора или пропа под вложенный контрол нет.

Сторожат `core/__tests__/aria.spec.ts` — что ядро пишет в какой набор — и
`ui/vue/__tests__/input-control-attrs.spec.ts` с
`ui/vue/__tests__/item-control-attrs.spec.ts` — на каком элементе что стоит.

### Готовые паттерны

Если для виджета есть паттерн WAI-ARIA APG — следуем ему, расхождения
объясняем в комментарии.

- **Tabs** — Tabs pattern: `tablist`/`tab`/`tabpanel`, связка
  `aria-controls` ↔ `aria-labelledby`, `aria-selected` на всех табах набора,
  `aria-orientation` у списка. Клавиатура — `TTabsKeyboardPlugin`: стрелки по
  оси ориентации (←/→ или ↑/↓; в RTL ←/→ меняются местами) ведут к соседнему
  табу по кругу, `Home`/`End` — к крайним, недоступные табы
  (`TTabsExtension.isEnabledTab`) пропускаются, `Delete` закрывает таб, если
  его можно закрыть. Весь список — одна остановка Tab (roving tabindex):
  `tabindex="0"` только у активного таба, а если его нет или на него нельзя
  перейти — у первого доступного; у кнопки закрытия `-1`, следующая остановка
  — панель. `tabindex` пишет `TTabsExtension`, а не плагин: атрибут обязан
  стоять с первой отрисовки. **Активация автоматическая** — переход сразу
  активирует таб: APG советует так, когда панель показывается без задержки, а
  `Tabs.Content` рисуется локально. Поэтому фокус и активный таб не
  расходятся, и остановку Tab коллекция считает без знания о фокусе. Ручного
  режима нет — у него нет потребителя.
- **Tags** — роли по режиму выбора. В `none` набор — `list`/`listitem`: у
  строки нет действия, и остановки Tab у строк нет (`tabindex="-1"` перекрывает
  остановку, которую `Button` на `div` ставит себе сам), а крестик — нативная
  остановка, единственный путь закрыть тег с клавиатуры. Так устроены и теги в
  поле Select. С выбором — Listbox pattern: `listbox`/`option`,
  `aria-selected` на всех тегах, `aria-orientation="horizontal"`, в
  `multiple` — `aria-multiselectable`. Модель фокуса — roving tabindex, как у
  Tabs, а не фокус на контейнере, как у ListBox: у каждого тега свой крестик,
  а фокус на самой строке объявляет опцию без `aria-activedescendant`. Весь
  набор — одна остановка Tab, `tabindex` строк пишет `TTagsExtension`.
  Клавиатура — `TTagsKeyboardPlugin`, слушатели висят, пока выбор включён:
  ←/→ (в RTL наоборот) и ↑/↓ — к соседнему тегу по кругу, `Home`/`End` — к
  крайним, недоступные теги (`TTagsExtension.isEnabledTag`) пропускаются;
  `Delete` и `Backspace` закрывают тег, и фокус переходит к соседу (к
  следующему, у последнего — к предыдущему). Enter и пробел — `press` строки,
  плагин их не трогает. Крестик с выбором выведен из порядка Tab
  (`tabindex="-1"`): `closeAria` — живой набор, имя в него пишет тег,
  `tabindex` — расширение по режиму. **В отличие от Tabs, фокус и выбор
  расходятся**: стрелка переносит фокус, выбирает пробел. Поэтому остановка
  помнит тег под фокусом — о нём сообщает `focusin` плагина
  (`TTagsExtension.notifyFocus`), — а правило «первый выбранный, иначе первый»
  только запасное: без памяти о фокусе выбор пробелом перекидывал бы остановку
  на первый выбранный тег. Сторожат `core/__tests__/tags.spec.ts`,
  `plugins/__tests__/tags-keyboard.plugin.spec.ts`,
  `ui/vue/__tests__/tags-keyboard.spec.ts` и
  `playground/vue/browser/tags-keyboard.spec.ts`.
- **Accordion** — одноимённый паттерн: `aria-expanded` на заголовке,
  `role="region"` у панели. Компонент назывался `Collapse` и переименован ровно
  ради этого совпадения: «collapse» — поведение одной секции, а набор секций с
  одной или несколькими раскрытыми у APG называется Accordion. **Имя компонента
  должно совпадать с паттерном, который он реализует** — иначе найти реализацию
  по документации APG невозможно.
- **Select** — Combobox, вариант select-only: `role="combobox"` на поле,
  `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls` на список и
  `aria-activedescendant` на подсвеченную опцию. **DOM-фокус никогда не
  уходит с поля** — отсюда и `keydown` на поле, а не на списке, и подсветка
  через `aria-activedescendant`, а не через настоящий фокус.
- **Switch** — Switch pattern, вариант на `input[type="checkbox"]`:
  `role="switch"` на вложенном `<input>`, состояние сообщает нативный
  `checked`. `aria-checked` ядро не пишет ни Switch, ни CheckBox: на нативном
  чекбоксе он дубль `checked`. «Выбрано частично» у CheckBox — DOM-свойство
  `indeterminate` вложенного `<input>`, его проводит разметка, как `checked`,
  а не `aria-checked="mixed"`.
- **Radio Group** — Radio Group pattern, вариант на нативных
  `input[type="radio"]`: `role="radiogroup"` на контейнере, имя группы —
  `aria_label` / `aria_labelledBy`. Радио собирает в группу общий `name`: его
  раздаёт каждому радио `TRadioGroupExtension`, а без имени группы строит от её
  `uid`. Одну остановку Tab, стрелки по кругу с пропуском выключенных и пробел
  даёт браузер, поэтому клавиатурного плагина и `tabindex` у группы нет. Браузер
  ходит по радио в порядке DOM, а не регистрации в коллекции, — так радио одной
  группы могут стоять где угодно в разметке, чего roving tabindex, как у Tabs,
  не выдержал бы. `role`, `aria-checked` и `aria-disabled` ядро радио не пишет:
  у нативного радио это `checked` и `disabled`. Сторожат
  `ui/vue/__tests__/radio-group.spec.ts` и
  `playground/vue/browser/radio-group.spec.ts`.

**ComboBox отдельным компонентом не заводим.** Ark и Radix держат `Select` и
`Combobox` врозь, потому что у них расходится модель значения: у select-only
значение одно (выбранная опция), у combobox их два (текст поля и выбор). У нас
это выражается режимом одного компонента: различаются ввод в поле,
`aria-autocomplete`, фильтрация и «свободное значение» — и всё это включается
расширениями коллекции и плагинами, а не вторым компонентом со своей копией
списка, панели и клавиатуры.

Режим — `editable` (`false` — select-only, по умолчанию); имя `mode` занято
режимом выбора в коллекции, а в шаблоне оба adapter-контекста сливаются в один
объект. `editable` — выключатель `readonly`: `editable: true` ставит
`readonly = false`, `editable: false` — `readonly = true`, и это вся связь.
Сам `readonly` обычный, своей логики у него нет.

Отсюда следствие: **`readonly` больше не запрещает открыть панель** — иначе
select-only (он же `readonly: true`) не открывался бы вовсе, а список для него
единственный способ сменить значение. `openable` теперь смотрит только на
`disabled`; запереть Select целиком — это `disabled`.

### Клик и клавиатура — режим выбирает стратегию, а не ветка внутри неё

`TSelect.toggleOpen()` в ядре — простой тумблер, без ветвления на режим: кто и
когда его зовёт, решают плагины, а не сам метод.

**Клик** — `TSelectPointerPlugin`. Слушает корень так же, как `TDismissPlugin`
и клавиатура, и выбирает поведение по `owner.editable`: в select-only тумблит
всё поле, в `editable` — только клик по `.s-select__arrow` (текст поля
получает курсор, а не открытие); `mousedown` по стрелке гасится
(`preventDefault`), чтобы не увести фокус с `<input>`, куда в этом режиме
печатает пользователь.

**Клавиатура** — `TSelectKeyboardPlugin` с двумя стратегиями
(`packages/plugins/src/custom/select/keyboard/strategies/`), которые
переключаются по `change:editable`, а не проверкой внутри обработчика: два
клавиатурных плагина не подошли бы — подсветка и `aria-activedescendant`
раздвоились бы. Общая база (`TSelectKeyboardStrategy`) держит то, что не
зависит от режима: стрелки, `Enter`, `Escape`, `Tab`, а также APG-жесты
`Alt+↓` (открывает закрытую панель без подсветки) и `Alt+↑` (на открытой —
выбирает подсвеченное и закрывает, как `Enter`). `TSelectOnlyKeyboardStrategy`
добавляет `Home`/`End`, пробел и набор по буквам; `TEditableKeyboardStrategy`
не добавляет ничего к открытой панели (эти клавиши там принадлежат тексту
поля) и всего одно — к закрытой: `Escape` шлёт плагину событие `escape` (см.
ниже).

`editable` снимает `readonly` у вложенного `Input`; реакцию на сам ввод задаёт
`editableMode` (`TSelect.editableMode`) — значение с тремя состояниями:
`search` (по умолчанию; совпадение по тексту подсвечивается, список остаётся
целым), `filter` (несовпавшие опции скрываются) и `none` (встроенный поиск
выключен — режим для случая, когда фильтрацией и открытием панели управляет
само приложение, например серверный поиск). Всю
реакцию несёт `TEditablePlugin`, по функции на режим: `search` передаёт
набранное в публичный `TSelectKeyboardPlugin.highlightByText` — тот же
алгоритм, что и набор по буквам с клавиатуры, — а `filter` пишет его в
`filter.query` коллекции, где отбор уже сделан (`TFilterExtension`,
`items:query:before`, `batch.shown`).

Отбор доезжает до экрана **через `visible` самой опции**, а не через `shown` в
разметке, и это не перестраховка. `v-for="item in shown"` в `Select.vue` —
запасное содержимое слота: оно работает, только пока опции пришли пропом
`items`. Стоит объявить их разметкой (`<Select.Item>` детьми, как в стенде) —
составом списка владеет слот, перебрать его коллекция не может, и отбор был бы
не виден вовсе: движок отбирает, а на экране всё те же пункты. Поэтому
`TSelectExtension` слушает `change:shown` и ставит каждой опции `visible` —
его все шесть адаптеров уже уважают (`v-show`). Обратная сторона: свой
`visible`, выставленный снаружи, отбор перетирает — пока он включён, состав
показанного принадлежит ему.

Слушателя `input` плагин вешает по `change:editable`/`change:editableMode` и
только когда вводу есть на что влиять: `editable: true` и режим не `none`. В
остальное время обработчика нет вовсе — режим выражен подпиской, а не
проверкой внутри обработчика. Набранное живёт в плагине (`TEditablePlugin.query`),
в шаблон и адаптеры не попадает.

**Поле — один хранитель, не проп ядра.** Второго значения рядом со своим
`value` Select не заводит — тем, что видит пользователь (текст и плейсхолдер),
владеет отдельный экземпляр `TInput` (`TSelect.field`): Select создаёт его
один раз и синхронизирует с ним общие свойства (`disabled`, `size`, `variant`,
`readonly`, `required`, `name`, `id`). Шаблон передаёт его целиком —
`<Input :ctrl="field">`, тем же приёмом, что `<Tags :ctrl="tags">` — и не
ставит рядом `:value` ни в каком виде, иначе снова завелись бы две копии.
Пишут в `field.value` трое, каждый в свой момент: `TInputPlugin` — набранное,
обычным `input`, как у любого `Input`; `TSelectExtension` — текст выбранного,
в любом режиме, не только `editable` (`single` — текст, `multiple` — всегда
пусто, значение там в тегах); и `TEditablePlugin._returnField` — возврат при
Escape и уходе фокуса. Значение меняется по-настоящему, `change:value`
срабатывает, и `Input` перерисовывается сам — раньше на этом месте была прямая
запись в DOM, которую забивал ближайший рендер вложенного `Input`.

**Выбор пользователя пишет поле всегда, остальное — пока в нём не печатают.**
Выбор пользователя (`chooseItem`, `clear`) `TSelectExtension` пишет в поле
безусловно, что бы там ни было набрано, и сообщает о нём событием `choose`.
Всё остальное — смена `value` и состава (удаление опции Select слушает сам,
`item:removed`: `TSelectionExtension` снимает удалённую с выбора молча),
переименование выбранной опции, закрытие тега и `Backspace` в `multiple` —
пересчитывает `text`, а поле трогает, только пока оно показывает текст
выбранного, то есть совпадает с формулой поля, посчитанной до пересчёта. Так
набранное доживает до выбора или возврата, хотя при серверном поиске список
меняется на каждом ответе. Признак набора — само поле, флага «печатают» и
копии записанного нет, поэтому набранное, совпавшее с формулой (стёртое до
пустого при пустом тексте выбранного), от показа выбранного не отличить.
Сторожат `core/__tests__/select.spec.ts` («набранное в поле и смена списка») и
`setup/__tests__/select-editable.spec.ts`.

**Возврат поля.** Закрытие панели само по себе поле не трогает — панель можно
закрыть, не желая ничего вернуть (клик по стрелке). Возврат — одна точка
плагина (`_returnField`, пишет `owner.field.value`), и вызывают её два повода:

- **двойной `Escape`.** Первое нажатие на открытой панели только закрывает её
  (общая часть стратегии); второе — уже на закрытой панели — событием `escape`
  просит плагин вернуть поле. Разделение отражает то, что фокус на самом деле
  всё это время остаётся на `<input>`: панель лишь выглядит как получившая
  управление;
- **`focusout`**, когда фокус ушёл и с корня, и с телепортированной панели
  (`data-owner`, тот же приём, что у `TDismissPlugin`) — переход внутрь панели
  ничего не меняет.

Выбор сюда не входит: текст поля на выбор пишет сама `TSelectExtension` (см.
выше), плагину остаётся сбросить то, что относится только к вводу, —
набранное и отбор (`filter.query`), иначе выбор в `multiple` оставил бы
панель суженной прежним запросом. Сбрасывает он их по событию `choose`
расширения `select`, а не по `change:selection`: набор прерывает то же, что
безусловно пишет поле. Смену `value` и закрытие тега поле во время ввода
переживает, и сброс на `change:selection` оставил бы в нём набранное,
развернув список целиком.

«Свободное значение» (ввод, не совпавший ни с одной опцией) не реализовано —
решение за владельцем. `aria-autocomplete`: без `editable` атрибута нет вовсе, с
`editable` — всегда `"list"`, режим на атрибут не влияет: панель на вводе
открывается и совпадение объявляется через `aria-activedescendant`, то
есть подсказка скринридеру уже есть (даже при `none`, где список подбирает
само приложение). В `editable` клавиатура не перехватывает
печатные символы, пробел и `Home`/`End` — они принадлежат тексту поля;
стрелки, `Enter`, `Tab` работают как в select-only.

**Удаление тегов по `Backspace`** (`editable` + `multiple`) — тоже отдельный
плагин, `TSelectBackspacePlugin`
(`packages/plugins/src/custom/select/backspace/`), а не ветка в
`TSelectKeyboardPlugin`: удаление тега не трогает ни подсветку, ни
`aria-activedescendant`, которыми владеет клавиатурная стратегия. Включает
механизм свойство `removeOnBackspace` (по умолчанию `false`); слушатель на
`<input>` висит только когда оно взведено, `editable: true` и
`selection.mode === 'multiple'` разом — подпиской на все три, не проверкой
внутри обработчика. Правило взвода: первое нажатие `Backspace` в пустом поле
только взводит счётчик, второе и каждое следующее подряд снимает выбор с
последнего тега; любая другая клавиша и `Backspace` при непустом поле счётчик
сбрасывают, автоповтор (`KeyboardEvent.repeat`) не участвует вовсе. «Последний»
— последний тег (`engine.extensions.tags`), а не последний элемент
`selection.selected`: пользователь видит теги, порядок выбора в коллекции ему
не виден. Снятие выбора идёт через `engine.extensions.selection.deselect`, не
через driver.

`aria-selected="false"` ставится и на невыбранных элементах: скринридер
объявляет «2 из 7, не выбрана», и без атрибута этого не скажет.

Disabled-элементы пропускаются при навигации с клавиатуры: подсветить то, что
нельзя выбрать, значит завести пользователя в тупик.

### Доступное имя — плагин, а не свойство базы

`label` не живёт в `TComponentView`: имя нужно не всякому компоненту, у кнопки
с текстом оно вычисляется из содержимого само. Приходит опциональным
`TAriaPlugin` (`packages/plugins/src/custom/component-view`), namespace `aria`
→ пропсы `aria_label`, `aria_labelledBy`, `aria_describedBy`.

Подключён к `ControlDescriptor`: у интерактивного элемента имя обязано быть
всегда — это первое правило доступности. Неинтерактивным (Icon, Spinner, Frame)
добавляется поштучно; Skeleton не получает — заглушка декоративна.

Опция `role` означает «без имени элемент декоративен»: плагин ставит
`aria-hidden`, а с именем меняет его на эту роль. Обе стороны у одного
владельца, иначе при снятии имени неясно, кому возвращать `aria-hidden`.

Пропсы, которые пишутся снаружи, есть не только у него: ещё у `TAnchorPlugin`
(`anchor_*`) и `TDismissPlugin` (`dismiss_enabled`). Начальные значения
доносит сборка (`applyInitialProps`) — ядро получает пропсы через
конструктор, плагины нет.

### Языка интерфейса библиотека не знает

Строки вроде «Загрузка» не подставляются по умолчанию. Спиннер без имени
молчит — и это верно: рядом с видимым «Сохраняем…» второе объявление было бы
дублем. Где имя обязательно и его неоткуда взять (кнопка закрытия таба),
дефолт английский и переопределяется пропом (`closeLabel`).

Имя кнопки закрытия собирается вместе с текстом таба — «Close Настройки».
Пять одинаковых «Close, кнопка» в списке элементов скринридера различить
нельзя.

### CSS не стилизуется по `aria-*` (критично)

ARIA — контракт со скринридером, `data-*` — контракт с темой. Пока они не
разделены, доступность нельзя править, не ломая вид.

Повод — реальная регрессия: `aria-selected` перенесли с обёртки на элемент с
ролью (правильно), а тема раскрывала панель Accordion селектором
`.s-accordion-item[aria-selected='true']`. ARIA починили — панели перестали
открываться, и ни один тест не заметил, потому что все они проверяли ARIA.

Обёртка отдаёт состояние как `data-selected`, тема смотрит на него.

Disabled — так же: тема читает `data-disabled`, которое `TControl` пишет на
любом теге (см. «Третий набор: `attrs`»), а не `aria-disabled` и не нативный
`disabled`. Оба последних решает тег элемента, и переезжают они вместе с ним —
селектор по ним перестал бы срабатывать молча, как с Accordion.

Сторожит `packages/themes/oren/__tests__/tokens.spec.ts`: во всём `src` темы
(`.scss` и `.css`, без комментариев) нет ни селектора по атрибуту `aria-*`, ни
варианта Tailwind `aria-*` в `@apply` и `@variant` — он компилируется в тот же
селектор. Селектор по нативному атрибуту disabled запрещён там же и
тем же способом; псевдокласс на вложенном поле фиксированного тега — нет.

### Прочее

Ядру DOM недоступен, но из этого не следует, что всё связанное с DOM обязано
жить в плагине. Правило: **значение — в ядро, операция — в плагин.**

Плагин, который писал бы атрибуты прямо в DOM после монтирования, дал бы
пустую серверную разметку. `TAriaPlugin` в DOM не ходит — он пишет в `aria`,
а раскладывает набор шаблон, синхронно.

По той же причине связка «таб ↔ панель» проставляется при добавлении элемента
в коллекцию, а не при появлении панели: так она попадает в первую же
отрисовку, включая серверную.

`TActionPlugin` (namespace `action`, подключён к `ControlDescriptor`) — операции:
слушатели, `focus()`, нормализация активации. Элемент берёт у `TElementPlugin`
через `ctx.get(...)` — композиция плагинов, а не наследование (тот же приём, что
в `TListKeyboardPlugin`).

- `action:press` — нормализованная активация: клик или Enter/Space, не приходит
  на `disabled`, одинакова на любом теге. Enter/Space нормализуются, только
  когда фокус на самом корне. Клавишу из вложенного поля или кнопки корень не
  отменяет и за свой `press` не выдаёт: что с ней делать, знает сам элемент, а
  его клик всплывёт в корень и даст `press`, как клик мышью. Раньше корень-`div`
  отменял и её — в Input не печатался пробел, CheckBox, Switch, секция
  Accordion и таб не срабатывали с клавиатуры. Строка элемента на `div`,
  которая сама держит фокус (`Tags.Item`), выбирает по `press`, а не по
  `click` — в любом адаптере: клика из Enter и пробела на `div` браузер не
  делает, и на `click` тег выбирался только мышью. Сторожат
  `ui/vue/__tests__/action.spec.ts`, `ui/vue/__tests__/tags-select.spec.ts` и
  `playground/vue/browser/keyboard-activation.spec.ts`
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
- Корень компонента живёт внутри `@if`, поэтому DOM-биндинг делает базовый
  `TComponentBase` (`packages/ui/angular/src/adapter/runtime/component.base.ts`):
  корень в шаблоне помечен `#root`, сигнальный запрос `viewChild('root')` —
  поле базы, а `effect` только читает его и переустанавливает связь при
  пересоздании узла. Обычный `@ViewChild` читается один раз в `ngAfterViewInit`
  и после пересоздания узла указывает на мёртвый элемент. Если корень —
  хост-элемент и живёт всё время, компонент передаёт стратегию `'host'`: узел
  берётся из `inject(ElementRef)` один раз.
- Сигнальные инициализаторы `@angular/core` — запросы (`viewChild`,
  `viewChildren`, `contentChild`, `contentChildren`), `input`, `model`,
  `output` — пишутся только в инициализаторе поля класса с `@Component` или
  `@Directive`. Вызов в методе или конструкторе компилятор не распознаёт и
  роняет AOT с NG8110 (реальный случай — `viewChild('root')` внутри
  `_bindRoot`). `tsc` этого не видит, сторож — «Типы — Angular» (`ngc`).
- `<ng-content>` объявляется ровно один раз и подставляется через
  `ngTemplateOutlet`: два слота во взаимоисключающих ветках теряют содержимое.

## Pitfalls

- `vue-tsc` requires exported, named types for portability. Use `ReadonlyArray<T>` instead of intersection types like `ReadonlyArray<T> & ICollectionStorageDriver<T>` when a type may leak into inferred types.
- Tailwind `@apply` directives in `.vue` `<style>` blocks may produce CSS-parser warnings — pre-existing, not a code error.
- Корень шаблона `Frame` — `<teleport>`, и Vue считает корневым узлом именно
  его. Автоматический перенос атрибутов уходит в телепорт и до элемента не
  доезжает: ни `class`, ни `data-*`, ни события. Поэтому у Frame
  `inheritAttrs: false` и ручной `v-bind="$attrs"` на настоящем узле. Та же
  ловушка ждёт любой компонент, обёрнутый в `<teleport>`.
- Значения пропсов Vue-компонента в шаблоне и в `mount` проверяются по
  аннотации `setup(props: XProps)` в `setup.component.ts`: из неё vue-tsc
  выводит `$props`. Опция `props` в тип компонента не попадает — пропсы из
  `extends`, простого объекта опций, Vue в тип не переносит, как их ни
  типизируй. Ослабишь аннотацию — неверное значение в шаблоне пройдёт молча.
  Сторож — `packages/ui/vue/__tests__/TemplateProps.test.vue`: у каждого
  компонента и части неверное значение стоит под `@vue-expect-error`, рядом
  верное; проверяет «Типы — Vue».
- Проп без `triggers` адаптер считает pass-through и наружу не отдаёт
  (связка в состояние такие не берёт). Даже у постоянного значения
  должен быть хотя бы один триггер — для плагинов подходит `create`.
- `TElementPlugin` эмитит `ready` через `requestAnimationFrame`. В тестах
  ждите кадр, а не `nextTick`. Контракт: одно `ready` на подключение узла,
  `removed` синхронно и только после `ready`, замена узла — пара `removed` +
  `ready`. Промиса ожидания узла у плагина нет: ждать узел — только подпиской
  на `ready`, готовность компоненту отдаёт `TReadyPlugin` через
  `IComponentView.ready`.
- Узел у плагина — `Element`, а не `HTMLElement`: `tag` свободен, корнем
  бывает `svg`. Нужна HTML-специфика (`offset*`, инлайновый `style`,
  `focus`/`blur`) — сужайте тип-гардом из `packages/plugins/src/utils`
  (`isMeasurableElement`, `isFocusableElement`); приведение `as HTMLElement`
  запрещено — оно прячет несовпадение, а не чинит его. Слушатели вешаются
  через `IDomEventTarget` оттуда же: `Element.addEventListener` типизирован
  урезанной картой событий, и это неточность lib.dom, а не узла.
- В `packages/setup` нет своего vitest-конфига, окружение по умолчанию —
  `node`. Тестам с DOM нужна первая строка `// @vitest-environment jsdom`.

## Docs

- `docs/architecture.md` — full adapter architecture overview (layers, descriptors/plugins/accessor, collection pattern, per-framework notes). Read it before touching adapter/descriptor/plugin code.
- `.github/skills/add-soldy-component/references/complex-component.md` —
  разбор Select как эталона сложного компонента: анатомия по слоям и критерий
  «внутренний экземпляр или разметка».
- `packages/themes/oren/AGENTS.md` — инструкции пакета темы: шкалы, схемы,
  токены. Читать перед правкой стилей; на другие темы не распространяется.
- `packages/playground/` — стенд разработчика (`npm run dev:vue`). См. раздел
  ниже.

## Playground: инструмент не диктует библиотеке (критично)

`packages/playground/shared` — данные без фреймворка (реестр компонентов,
описания пропов, значения перечислений), `packages/playground/vue` —
приложение. Дальше рядом появятся `react`, `angular` и остальные: у каждого
фреймворка свой рантайм, одним приложением их не проверить. Разметка стендов
будет похожей, и это принято сознательно — дублируется вёрстка, но не данные.

**Правило, которое дважды нарушалось при первой же реализации:**

> Стенду нельзя менять библиотеку под свои нужды.

Компоненты — цель, стенд — инструмент. Если инструменту чего-то не хватает,
он добирает это у себя, а не отращивает библиотеке новую поверхность.

Два случая, на которых это выяснилось:

- **Списки значений перечислений.** Захотелось положить в ядро 16 массивов
  (`BUTTON_VIEWS`, `TABS_ALIGNMENTS`, …), чтобы стенд строил из них `Select`.
  Проверка показала: рантайм-потребителей у них в библиотеке **ноль**. Списки
  живут в `playground/shared/enums.ts`, а от расхождения страхует `enumOf` —
  сверка с исходным типом на компиляции, с указанием пропущенного значения.
  Исключение одно: `COMPONENT_SIZES` в ядре, потому что шкалу читает
  `shiftSize`, и она там была бы и без стенда. Значений оформления (`variant`,
  `view`, `shape`, `animation`) у ядра нет вовсе — их объявляет тема (см.
  «Оформление: значения объявляет тема»). Стенд рисует oren, поэтому `enums.ts`
  подключает к программе типов её `index.d.ts`
  (`/// <reference types="@soldy/theme-oren" />`), и эти списки сверяются с
  ним: тема добавила значение — стенд попросит его и у себя;
- **Подписка на смену пакета иконок.** Захотелось добавить `onIconsChanged`
  в реестр. Но переключение пакетов на лету нужно только стенду, а он и так
  знает о смене — сам её и вызывает. Счётчик перерисовки живёт в
  `useIconPack`.

Признак нарушения простой: **у правки в библиотеке нет потребителя, кроме
стенда**. Значит правка не туда.

**Чем стенд стережёт сам себя.** Описания пропов лежат вне контракта, значит
библиотека может уехать вперёд молча — ровно так сгнило прежнее демо. Поэтому:

- `playground/shared/__tests__/manifest.spec.ts` — у каждого записываемого
  пропа каждого дескриптора обязано быть описание, а у каждого `select`-пропа
  непустой список значений;
- `playground/vue/__tests__/smoke.spec.ts` — каждая страница открывается и
  рисует строку на каждый проп; ключи карты превью сверяются с реестром
  (опечатка в id иначе просто убрала бы компонент из меню).

**Что показывает адаптер.** Реестр в `shared` — каталог всей библиотеки, а
меню и витрина строятся его **пересечением** с `src/previews/index.ts`. Vue
реализует всё, React пока два компонента — и покажет два, а не двадцать
пунктов в пустоту.

### Страница тестов

Рядом со страницей свойств — страница тестов (`/tests/<тема>/<компонент>`,
ссылка в шапке, обратно — на ту же страницу свойств). Слева два меню: темы
(`events`, `slots`) и компоненты темы; компонент — своя страница, при смене
темы он сохраняется. На странице два раздела: сверху автоматические с общей
кнопкой «Запустить все» (`runAuto`), снизу ручные — каждый своей кнопкой,
пачкой они не запускаются. У каждого раздела сводка и красный бейдж
`errors: N` или зелёная галка.

Граница та же — дублируется вёрстка, но не данные:

- `playground/shared/src/scenarios/` — без фреймворка: контракт сценария
  (`types.ts`), темы, журнал прогона, раннер и реестр сценариев. Сценарий
  управляет экземпляром ядра (он же уходит компоненту как `ctrl`), смотрит в
  DOM сцены и читает журнал; `auto` доходит до итога сам и обязан уложиться в
  лимит, `manual` ждёт человека по шагам — засчитывается сам, если его
  условие выполнилось, итог ставят и кнопки ✓/✗;
- `playground/vue/src/scenarios/fixtures.ts` — разметка сценариев со
  слотами (без ключа фикстуры рисуется превью компонента),
  `composables/useScenarios.ts` — хост Vue и реактивный снимок статусов;
  стенду другого фреймворка — написать то же самое у себя. Экземпляр по записи
  реестра создаёт одна функция `createInstance` в `shared`.

Меню тем и компонентов — тоже **пересечение**: сценарий виден, если у
адаптера есть и компонент, и фикстура.

**Журнал — события, которые получил потребитель фреймворка.** Хост слушает
всё, что компонент объявил (`useEmits` дескриптора и фасада коллекции), и
печатает в консоль `[<id сценария>] <событие>` с аргументами. Имена — полные
имена аксессора (`change:text`, `action:press`): Vue их не меняет, стенд
другого фреймворка приводит свои имена к ним. `update:<prop>` — это v-model
Vue: в журнал он попадает, но сценарии в `shared` на него не опираются.

**Сценарии реестра в CI не идут.** Упавший сценарий — найденная проблема
компонента, а не сломанная сборка: на неё заводится задача, а сценарий
остаётся красным, пока её не решат. Стенд стерегут только тесты площадки:

- `playground/shared/__tests__/scenario-runner.spec.ts` — раннер на поддельном
  хосте: итоги, лимит, ожидание ручного, ✓/✗, перезапуск, `runAuto`, сводка;
- `playground/shared/__tests__/scenarios.spec.ts` — реестр: id уникальны,
  компонент и тема известны, у ручного есть шаги;
- `playground/vue/__tests__/scenarios.spec.ts` — каждая тема открывается,
  фикстуры и сценарии не разошлись, сквозной прогон через настоящий хост Vue
  на сценариях из самого теста, ссылка в шапке и меню;
- `playground/vue/browser/tests-sidebar.spec.ts` — колонки меню тем и
  компонентов не наезжают друг на друга (минимальная ширина списка темы шире
  узкой колонки).
