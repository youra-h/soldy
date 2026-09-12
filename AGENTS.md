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
npm run test:theme   # Vitest — инварианты токенов темы oren
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
  типы не сходятся — неверен контракт, править надо его.
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
| `packages/accessor` | Runtime reflection (`TComponentAccessor`, `TDescriptorInspector`).                                                            |
| `packages/setup`    | Build-time metadata: `contributions/`, `descriptors/`, `adapter/`, `common/`.                                                 |
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

Допустимо в адаптере: `ref` на DOM-узел, `provide`/`inject` элеватора,
`v-bind` набора, регистрация дочерних компонентов.

### `setup/adapter/extensions/` — тоже не место для операций над DOM

Расширение адаптера — проводка, общая для всех фреймворков, но это не
индульгенция на поведение. Правило «значение — в ядро, операция — в плагин»
(см. «Доступность (a11y)», раздел «Прочее») действует и здесь: расширение
адаптера **читает и связывает значения** (props, `aria`, элементы коллекции),
но не читает DOM-узел и не решает, что с ним делать.

Реальный случай: диагностика «`Tabs.Content` оказался внутри
`[role="tablist"]`» сначала легла в `TTabsContentBindingExtension`
(`setup/adapter/extensions/collection/`) — расширение само брало
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

Критерий выведен из модели soldy, а не заимствован. Ark-таксономия
(`Root`/`Trigger`/`Indicator`/`Label`/`Positioner`) кодирует чужую модель: там
нет слотов и табы не коллекция. В soldy `TTabs` — `TCollectionComponent`,
`TTabsItem` — `TCollectionItemComponent`, поэтому часть называется `Item`, а не
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
`TCollectionEngine`, `TListBoxCollectionFacade`, `CollectionContribution`,
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

| Слой                | Отвечает за                                   | Пример                                                      |
| ------------------- | --------------------------------------------- | ----------------------------------------------------------- |
| **Класс ядра**      | собственные props и events                    | `TTabsItem` — `value`, `text`, `closable`                   |
| **Фасад коллекции** | членство в коллекции                          | `TTabsItemCollectionFacade` — `active`, `order`, `tab_aria` |
| **Расширение**      | функциональность поверх стандартной коллекции | `TTabsExtension` — закрытие вкладок                         |

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
└── TBatchCollectionFacade          batch      → Tabs
    └── TSelectionCollectionFacade  + selection → Accordion, Select, List → ListBox

TCollectionItemComponent
└── TOrderItemFacade                order      → Tabs.Item
    └── TSelectionItemFacade        + selected → Accordion/List/Select.Item
```

У табов активность, а не выбор — поэтому они наследуют только `batch` и
`order`. Базы под активацию нет: реализация одна, и заводить её под
единственного потребителя значило бы подстраиваться под неизвестное
требование. Появится второй — подъём стоит пятнадцать строк.

Правило держится не на честном слове: дженерик базы сужен до расширения,
которое она потребляет (`TExtensions extends { selection: TSelectionExtension<any> }`),
поэтому наследование без расширения — ошибка компиляции. Тип элемента у
расширения при этом `any`: расширения инвариантны по элементу, и `TItem` там
ломает цепочку List → ListBox.

**Чем это уже окупилось.** До баз одно свойство писалось в трёх фасадах по
отдельности, и три копии дали три разных API: у Accordion не было сеттера
`mode`, у опции Select — сеттера `selected`, хотя contributions объявляют оба
записываемыми. `<Accordion mode="multiple">` молча не работал — вторая
раскрытая секция закрывала первую, и харнесс `Accordion.test.vue`, который
использует `mode="multiple"`, всё это время проверял не то.

Сторожит `setup/__tests__/facade-props.spec.ts`: у каждого объявленного
записываемого пропа обязан быть сеттер в цепочке прототипов фасада.

### Расположение фасадов

Каждый — своя папка с баррелем, как у расширений:

```
<component>/collection/facade/{facade.class.ts, index.ts}
<component>/item/facade/{facade.class.ts, index.ts}
```

Базы — в `base/collection/facade/<расширение>/`, файл повторяет имя папки:
`batch/batch.facade.ts`, `selection/selection.facade.ts`,
`selection/item/selection-item.facade.ts`.

### К `driver` обращается только расширение коллекции (критично)

`engine.driver` — хранилище движка, а не публичный список элементов. **Читать и
слушать его имеют право только расширения коллекции**
(`core/src/components/**/collection/extensions/**`,
`core/src/components/base/collection/engine/extension/**`) — и делают это через
`ctx.driver`, полученный в `install`, а не через ссылку на движок.

Всем остальным — плагинам, расширениям адаптера, фасадам, коду `packages/ui/*`
— driver недоступен. Они работают со стандартными расширениями:

| Что нужно                                                               | Через что                        |
| ----------------------------------------------------------------------- | -------------------------------- |
| список элементов, длина, поиск, индекс                                  | `engine.extensions.batch.items`  |
| `item:added` / `item:removed` / `item:moved` / `reset` / `change:items` | `engine.extensions.plain.events` |
| вставка, удаление, перемещение, обновление                              | `engine.extensions.plain`        |
| замена набора целиком                                                   | `engine.extensions.batch`        |

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

### Когда заводить своё расширение

Стандартный набор лежит в `core/components/base/collection/engine/extension/`
(`plain`, `batch`, `activation`, `order`, `unique`, `meta`, `factory`).
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
    item/item.extension.ts         closable = item ?? parent
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

Проверяется двумя слоями: `vue-tsc` в CI ходит по исходникам ядра транзитивно
(сузь констрейнт обратно — сборка падает; опечатка в имени события тоже), а
`core/__tests__/list-box.spec.ts` проверяет, что событие действительно доходит.
Одного типа мало: приведение к `any` глушит проверку молча, и до этих тестов
так и было — на ListBox не было ни одного теста.

### Логику, которой нужен элемент, кладите в item-адаптер

У адаптера есть `_item` — поэтому всё, что вычисляется от элемента, считается
там, и **обе стороны парной связки считаются в одном месте**:

```ts
// content/item/item.extension.ts — id панели и aria-controls таба это одно и то же
private get _panelId() { return `s-tabpanel-${this._item.uid}` }

get tabAria()   { return { id: this._tabId, 'aria-controls': this._panelId } }
get panelAria() { return { role: 'tabpanel', id: this._panelId, 'aria-labelledby': this._tabId } }
```

Разнеси эти два геттера по разным файлам — однажды разойдутся. Фасады только
читают: `tab_aria` → `adapters.content.tabAria`, `content_aria` →
`adapters.content.panelAria`.

### Имена props фасада префиксуются

`tab_closable`, `tab_aria`, `content_aria`. Причина: в шаблоне значения двух
adapter-контекстов (собственного и коллекционного) сливаются в один объект, и
одноимённые затирают друг друга. У панели уже есть унаследованный `aria` — она
и вынудила префикс.

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

- **Types live in `types.ts`**: type aliases and interfaces (`T*`, `I*`, `*Options`, `*Props`) belong in a `types.ts` file, never alongside the class implementation. Example: `TListBoxCollectionFacadeOptions` lives in `collection/types.ts`, while `facade/facade.class.ts` holds only the `TListBoxCollectionFacade` class.

- **Branded prop types**: use `defineType<T>(ctor)` from `@soldy/setup` for phantom-typed contribution props (e.g. `defineType<TSelectionMode>(String)`).

- **Collections use facades**: the owner is a `TCollectionComponent` subclass (e.g. `TTabsCollectionFacade`) that owns a `TCollectionEngine` and exposes getters (`items`, `trackBy`, `activeItem`); the item is a `TCollectionItemComponent` subclass (e.g. `TTabsItemCollectionFacade`) holding a `TItemContext`. Both are wired through `defineComponent` descriptors — there is no `defineCollection`/`defineExtension`.

- **Vue collection setup** creates two adapter contexts sharing one bundle: the owner component (`TabsDescriptor`) and the collection facade (`TabsCollectionDescriptor`, `{ bundle: adapter.bundle, defaultExtensions: [] }`), calls `useAdapter` on each and merges `{ ...refs, ...refsCollection }`. Items register through `TCollectionExtension`/`TCollectionItemExtension` over the elevator (provide/inject).

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
| поведение списка: подсветка, скролл к элементу, высота | **общий** | `TListItemPlugin`, `TListScrollPlugin`, `TListLayoutPlugin` |
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
ролей в `setup/common/icons.ts` (`ICON_ROLES`): `check`, `checkIndeterminate`,
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
  токены, светлая и тёмная схемы, ловушки Tailwind, чем стережётся.

Переносить оттуда правила на другую тему нельзя: в `oren` номер ступени
означает роль (расстояние от поверхности), а не светлоту, — но это решение
`oren`, а не контракт soldy.

Что общее и живёт здесь: тема стилизуется по `data-*` и **никогда** по `aria-*`
(см. «Доступность (a11y)»), а состояние в разметку отдаёт обёртка компонента,
не тема.

## Слой оверлея

Всё, что открывается поверх страницы, собирается из трёх кусков:

- **`TFrame`** — телепорт, `rendered`/`visible`, стек z-index.
- **`TAnchorPlugin`** (namespace `anchor`) — привязка к чужому элементу:
  `anchor_anchor`, `anchor_placement`, `anchor_matchWidth`. Считает координаты
  и пишет их во Frame (`x`/`y`/`width`); раскладывает их `TFrameLayoutPlugin`.
  Разделение не формальное: раскладка отвечает за собственные пропсы Frame,
  привязка — за слежение за посторонним элементом.
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

При внешнем `ctrl` разметка остаётся разметкой: `<Select :ctrl="x"
placeholder="Выберите">` обязан показать плейсхолдер. Сам по себе это не
получается — инстанс из props строит конструктор (`createAdapterContext`:
`options.ctrl ?? new Ctor(props)`), а чужому инстансу стартовые значения
никто не пишет: `watch` во vue-адаптере молчит, пока проп не сменится.
Поэтому `useSyncProps.bindInput` пишет стартовое значение — но **только для
пропов, написанных в разметке** (`vnode.props`, а не итоговые `props`).
Разница принципиальная: у пропа ядра `default` берётся из `defaultValues`,
и «записать все props подряд» значило бы затирать чужое состояние своими
умолчаниями — ровно то, ради чего инстанс и передают.

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

| Адаптер  | Спеллинг                | scope                         |
| -------- | ----------------------- | ----------------------------- |
| Vue      | `<template #leading>`   | `v-slot="{ text }"`           |
| Svelte 5 | `{#snippet leading()}`  | параметр сниппета             |
| React    | `leading={<Icon/>}`     | `{({ text }) => …}`           |
| Solid    | `leading={<Icon/>}`     | `{({ text }) => …}`           |
| Angular  | `<span slot="leading">` | `<ng-template slot let-text>` |
| WebC     | `<span slot="leading">` | ✗ нет механизма               |

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
this.events.on('change:disabled', () => this._syncDisabledAria())
this.events.on('change:tag', () => this._syncDisabledAria())
this._syncDisabledAria() // начальное состояние — руками
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

| Источник               | Что пишет                                                  |
| ---------------------- | ---------------------------------------------------------- |
| `TSelectionExtension`  | `data-selected` — **всем** элементам коллекции             |
| `TActivationExtension` | `data-selected` — то же имя при состоянии `active`         |
| `TListLayoutPlugin`    | `data-word-wrap` — уже разрешённый (элемент поверх списка) |
| `TListItemPlugin`      | `data-highlighted`                                         |
| ядро компонента        | своё состояние — `data-open` у `TSelect`                   |

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

### Готовые паттерны

Если для виджета есть паттерн WAI-ARIA APG — следуем ему, расхождения
объясняем в комментарии.

- **Tabs** — Tabs pattern: `tablist`/`tab`/`tabpanel`, связка
  `aria-controls` ↔ `aria-labelledby`, `aria-selected` на всех табах набора.
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

`editable` снимает `readonly` у вложенного `Input`; реакцию на сам ввод задаёт
`editableMode` (`TSelect.editableMode`) — значение с тремя состояниями: `none`
(по умолчанию, ввод ни на что не влияет), `search` (совпадение по тексту
подсвечивается, список остаётся целым) и `filter` (несовпавшие опции
скрываются). Всю реакцию несёт `TEditablePlugin`, по функции на режим:
`search` передаёт набранное в публичный
`TSelectKeyboardPlugin.highlightByText` — тот же алгоритм, что и набор по
буквам с клавиатуры, — а `filter` пишет его в `filter.query` коллекции, где
отбор уже сделан (`TFilterExtension`, `items:query:before`, `batch.shown`).

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
проверкой внутри обработчика. Второго значения поля (`inputValue` как проп
ядра) для этого не понадобилось, и заводить его не надо: набранное живёт в
плагине (`TEditablePlugin.query`), в шаблон и адаптеры не попадает ничего, а
значит и поддерживать это шестью способами не придётся. Ввод никуда не
сохраняется: `value` остаётся текстом выбранной опции, а на закрытии панели
набранное сбрасывается и отбор снимается. Текст выбранного плагин возвращает в
поле прямой записью в DOM — и вот это место дырявое, причём давно: значением
`<input>` владеет вложенный `Input` (его `TInputPlugin` пишет набранное в свой
контрол), поэтому ближайший его рендер вернёт набранное обратно. Отбор это не
ломает, но поле после закрытия может показывать набранное вместо выбранного.
«Свободное значение» (ввод, не совпавший ни с одной опцией) не реализовано —
решение за владельцем. `aria-autocomplete`: без `editable` атрибута нет вовсе, с
`editable` и режимом `none` — `"none"`, `search`/`filter` — `"list"`: панель на
вводе открывается и совпадение объявляется через `aria-activedescendant`, то
есть подсказка скринридеру уже есть. В `editable` клавиатура
(`TSelectKeyboardPlugin`) не перехватывает печатные символы, пробел и
`Home`/`End` — они принадлежат тексту поля; стрелки, `Enter`, `Escape`, `Tab`
работают как в select-only.

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

Это единственный плагин, чьи пропсы пишутся снаружи. Начальные значения
доносит `TPluginPropsExtension` — ядро получает пропсы через конструктор,
плагины нет.

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
- Корень шаблона `Frame` — `<teleport>`, и Vue считает корневым узлом именно
  его. Автоматический перенос атрибутов уходит в телепорт и до элемента не
  доезжает: ни `class`, ни `data-*`, ни события. Поэтому у Frame
  `inheritAttrs: false` и ручной `v-bind="$attrs"` на настоящем узле. Та же
  ловушка ждёт любой компонент, обёрнутый в `<teleport>`.
- Проп без `triggers` адаптер считает pass-through и наружу не отдаёт
  (`useSyncProps.bindOutput` пропускает такие). Даже у постоянного значения
  должен быть хотя бы один триггер — для плагинов подходит `create`.
- `TElementPlugin` эмитит `ready` через `requestAnimationFrame`. В тестах
  ждите кадр, а не `nextTick`.
- В `packages/setup` нет своего vitest-конфига, окружение по умолчанию —
  `node`. Тестам с DOM нужна первая строка `// @vitest-environment jsdom`.

## Docs

- `docs/architecture.md` — full adapter architecture overview (layers, descriptors/plugins/accessor, collection pattern, per-framework notes). Read it before touching adapter/descriptor/plugin code.
- `packages/themes/oren/AGENTS.md` — инструкции пакета темы: шкалы, схемы,
  токены. Читать перед правкой стилей; на другие темы не распространяется.
- `packages/playground/` — стенд разработчика (`npm run dev:vue`). Пришёл на
  смену папкам `_demo/`, которые лежали вне репозитория и устарели. См. раздел
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
  `shiftSize`, и она там была бы и без стенда;
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
