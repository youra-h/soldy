/**
 * Раскладка корня: класс, стиль и атрибуты, которые сходятся на корне компонента.
 *
 * Во Vue это привязки шаблона — `:class="classes"`, `:style` (выход плагина
 * раскладки `layout_styles` или стиль-выход самого компонента, как
 * `fractionStyle` у ProgressSpinner), `v-show="visible"` и `v-bind` наборов
 * ядра, — а слияние с атрибутами потребителя Vue делает сам. Solid атрибутов
 * компоненту не наследует: сливать приходится разметке, и одна и та же склейка
 * расходилась бы по компонентам. Поэтому она здесь, одна на все, — как
 * `toRootProps` у React и Svelte.
 *
 * Порядок слоёв:
 * - атрибуты — наборы ядра (`attrs`, `aria`, `dataset`), поверх них атрибуты
 *   потребителя, как у Vue, где атрибуты снаружи ложатся на корень последними:
 *   `tabindex="-1"` строки списка перекрывает `tabindex="0"`, который кнопка на
 *   `div` ставит себе сама. Имена HTML (`tabindex`) и `null` («атрибута нет»)
 *   Solid понимает сам — переводить их, как React, не нужно;
 * - `class` — классы ядра, затем класс потребителя;
 * - `style` — выход плагина раскладки (`layout_styles`), поверх него
 *   стиль-выход самого компонента и место элемента коллекции (`order`); поверх
 *   них стиль потребителя, поверх всего `display: none` скрытого корня:
 *   скрытие не перекрывают ни раскладка, ни потребитель — как у `v-show`.
 *
 * Стиль — объект с именами как в CSS (`z-index`, `--*`): их и пишут плагины и
 * ядро, и их же ждёт Solid. Объект он ставит по свойству — сменившиеся,
 * снимает пропавшие, — и не трогает того, что плагины пишут в узел сами
 * (`--so-swipe-offset` смахиваемой панели). Поэтому и пустой стиль — объект, а
 * не `undefined`: `undefined` Solid понимает как «атрибута нет» и снял бы
 * атрибут целиком вместе с чужими свойствами. Пустое значение (`width: ''` у
 * иконки без размера) свойства не задаёт: сервер напечатал бы его как
 * `width:`. Стиль потребителя строкой разобрать на свойства негде — на
 * сервере нет документа, — и тогда слои склеиваются текстом, а из одноимённых
 * свойств браузер берёт последнее. Такой стиль Solid пишет целиком, и
 * свойства, записанные в узел мимо разметки, его смену не переживают: их
 * сохраняет только стиль объектом.
 *
 * `ref` адаптера в раскладку не входит: компонент ставит его корню сам,
 * последним, после атрибутов (`<Dynamic {...root()} ref={binding.ref}>`).
 * Атрибуты корня — мемо, и `ref` из него Solid перечитывал бы на каждую смену
 * любого атрибута, отвязывая и заново привязывая узел к `TElementPlugin`.
 * Последним он стоит по той же причине, что у React: `ref` потребителя из его
 * атрибутов (`forward`) не должен выбить привязку корня — не было бы
 * `element:ready`. Поэтому `ref` потребителя в раскладку не идёт вовсе
 * (`toRootProps` его снимает): корень ему отдаёт `ref` адаптера — тем же
 * вызовом, после привязки (`useAdapter`).
 *
 * `ref` потребителя — всегда корень компонента, у поля тоже. До `<input>`
 * потребитель дойдёт от корня `querySelector`, а от поля до корня — только по
 * родителям, и этот путь ломается при каждой правке разметки.
 *
 * У поля (Input, CheckBox, Switch) атрибуты потребителя делятся между двумя
 * элементами, как `useSplitAttrs` у Vue и `toControlAttrs` у React и Svelte:
 * класс и стиль — корню (`toRootForward`), всё остальное — его `<input>`
 * (`toControlAttrs`), поверх `aria` поля. Остальное — это и обработчики
 * событий, и `aria-*`, и `data-*`: поведение, которое потребитель вешает на
 * поле, — подсказка, обработчик ввода — встаёт на сам `<input>`. `ref` туда не
 * уходит: он корня. Так же делят их элемент коллекции — остальное строке, у
 * радио полю — и ListBox с Tabs: остальное — узлу списка с ролью (`listbox`,
 * `tablist`), поверх его `aria`.
 *
 * Корень бывает и не внешним узлом компонента: окно таблицы
 * (`div.so-table__viewport`) обёрнуто вокруг её корня `table`. Тогда атрибуты
 * потребителя делятся, как у поля: класс, стиль и скрытие — обёртке,
 * остальное, кроме `ref`, — корню, поверх его наборов (`createWrappedRootProps`,
 * как `toWrappedRootProps` у React). `ref` и здесь вне раскладки: обёртке —
 * только `ref` потребителя (`consumerRef` адаптера), корню — только привязка к
 * `TElementPlugin` (`bindRef`).
 *
 * Гидратация. Пока Solid гидратирует разметку сервера, в узлы он не пишет —
 * ни атрибутов, ни класса, ни свойств (`isHydrating` в `solid-js/web`):
 * считает их совпавшими с сервером. Спред при этом запоминает пропущенное как
 * записанное, а потом пишет только разницу со своей памятью. Элемент
 * коллекции входит в неё внутри `hydrate()`, при выполнении своего тела, и
 * его вход меняет наборы элементов выше: таб выше активного отдаёт остановку
 * Tab, с которой его напечатал сервер (`docs/agents/collections.md`, «Цена»).
 * Получи спред новую раскладку сразу, он пропустил бы запись, но запомнил бы
 * значение — и в узел оно уже не попало бы. Поэтому мемо раскладки,
 * собранное во время гидратации, до её конца отдаёт своё первое значение, а
 * после — живое (`createLayoutMemo`). Первое — это то, что напечатал сервер:
 * там мемо считается один раз, при сборке компонента, а браузер собирает его
 * в той же точке. Пока мемо держит первое, память спреда совпадает с узлом;
 * живое спред сверяет с памятью и дописывает разницу по своим правилам,
 * снимая и пропавшие ключи. Это обычный приём Solid для расхождения сервера
 * и браузера — второй проход после монтирования. Стор получает значения в
 * момент сборки, как всегда: придерживается только то, что видит спред.
 *
 * Атрибуты внутреннего узла — наборы частей (`for` подписи Field, `aria`
 * поля на `<input>`, наборы ячеек таблицы) и атрибуты потребителя контролу —
 * удерживает так же помощник части (`createPartProps`): во время гидратации
 * он отдаёт то же мемо раскладки, вне её — само чтение состояния. Спред на
 * узле разметки компонента идёт только от этих помощников, прямой спред
 * состояния (`{...state.contentAria}`) ловит блок eslint
 * `soldy/solid-part-props`. Вне помощников остаются одиночные привязки
 * (`id={state.id}`) и текст: их смена во время гидратации до узла не дойдёт,
 * — таких случаев нет. Остановка Tab элемента коллекции — `aria` строки, а
 * строка — `Button`: в узел набор попадает раскладкой его корня
 * (`forwardProps`), и спред на компоненте помощника не требует.
 */

import { createMemo, createSignal, onMount, sharedConfig, type Accessor, type JSX } from 'solid-js'
import { isServer } from 'solid-js/web'
import type { TAttributesMap } from '@soldy-ui/core'

/** Стиль, как его отдают плагины и ядро: имена — как в CSS (`z-index`, `--*`). */
export type TRootStyle = Readonly<Record<string, string | number>>

/** Что корню нужно из состояния компонента. */
export type TRootState = {
	/** Снимок классов ядра. */
	readonly classes?: readonly string[]
	/** Выход плагина раскладки. Плагин раскладки есть не у всех. */
	readonly layout_styles?: TRootStyle
	/**
	 * Место элемента коллекции (`order` фасада): ряд — флексбокс, и элемент
	 * встаёт по номеру в коллекции, а не по месту в разметке. Ключа нет — у
	 * компонента своего места нет.
	 */
	readonly order?: number
	/**
	 * `false` прячет корень. Ключа нет — корень виден всегда: у Skeleton
	 * видимость прячет заглушку, а не корень с содержимым.
	 */
	readonly visible?: boolean
}

/** Что корню приходит от потребителя: его класс и стиль — объект свойств или строка. */
export type TRootForward = {
	readonly class?: string
	readonly style?: JSX.CSSProperties | string
}

/**
 * `ref` потребителя среди его атрибутов: ни раскладка корня, ни поле его не
 * берут — корень ему отдаёт `ref` адаптера (`useAdapter`).
 */
type TConsumerRefForward = { readonly ref?: unknown }

export type TRootLayout = {
	class: string
	/** Объект свойств; строка — только когда строкой пришёл стиль потребителя. */
	style: TRootStyle | string
}

/** Атрибуты корня целиком: наборы ядра, атрибуты потребителя и раскладка. */
export type TRootProps = Record<string, unknown> & TRootLayout

/** Из чего мемо раскладки собирает атрибуты корня — аргументы `toRootProps`. */
export type TRootSource = {
	/** Что раскладке нужно из состояния компонента. */
	readonly state: TRootState
	/** Наборы ядра — в том порядке, в каком их кладёт Vue. */
	readonly sets: readonly (TAttributesMap | undefined)[]
	/** Атрибуты корня от потребителя — то, что не съела связка (`forwardProps`). */
	readonly forward: TRootForward & TConsumerRefForward
	/** Стиль-выход компонента (`fractionStyle`); нет — у компонента своего стиля нет. */
	readonly style?: TRootStyle
}

/** Обёртка корня и сам корень внутри неё — см. `toWrappedRootProps`. */
export type TWrappedRootProps = {
	/** Внешний узел компонента: свой класс, класс и стиль потребителя, скрытие. */
	readonly wrapper: TRootProps
	/** Корень внутри обёртки: наборы ядра, поверх — остальные атрибуты потребителя, классы и стиль ядра. */
	readonly root: TRootProps
}

/** Из чего мемо собирает обёртку и корень — аргументы `toWrappedRootProps`. */
export type TWrappedRootSource = TRootSource & {
	/** Класс обёртки — её разметка: у окна таблицы `so-table__viewport`. */
	readonly wrapper: string
}

const HIDDEN: TRootStyle = { display: 'none' }

/** Свойство стиля с непустым значением. */
type TDeclaration = readonly [name: string, value: string | number]

/**
 * Свойства слоя стиля без пустых: `''` и отсутствующее значение свойства не
 * задают. Слой — объект стиля плагина, ядра или потребителя (`CSSProperties`
 * Solid — интерфейс, и словарём его тип не описать), поэтому значение
 * проверяется, а не берётся на веру.
 */
function declarationsOf(styles: object | undefined): TDeclaration[] {
	const declarations: TDeclaration[] = []

	for (const [name, value] of Object.entries(styles ?? {})) {
		if (typeof value === 'number' || (typeof value === 'string' && value !== '')) {
			declarations.push([name, value])
		}
	}

	return declarations
}

/** Свойства — текстом атрибута: так склеиваются слои вокруг строки потребителя. */
function toCssText(declarations: readonly TDeclaration[]): string[] {
	return declarations.map(([name, value]) => `${name}: ${value}`)
}

/**
 * Класс и стиль корня в порядке слоёв из шапки файла.
 *
 * `style` — стиль-выход самого компонента: стиль, который считает ядро
 * (`fractionStyle` у ProgressSpinner). Имя выхода у каждого компонента своё,
 * поэтому его называет разметка, как и наборы ядра в `toRootProps`, а не
 * раскладка — по имени из состояния. Нет его — у компонента своего стиля нет.
 */
export function toRootLayout(
	state: TRootState,
	forward: TRootForward,
	style?: TRootStyle,
): TRootLayout {
	const below = [
		...declarationsOf(state.layout_styles),
		...declarationsOf(style),
		...declarationsOf(state.order !== undefined ? { order: state.order } : undefined),
	]
	const above = declarationsOf(state.visible === false ? HIDDEN : undefined)
	const className = [...(state.classes ?? []), forward.class].filter(Boolean).join(' ')
	const consumer = forward.style

	if (typeof consumer === 'string' && consumer !== '') {
		return {
			class: className,
			style: [...toCssText(below), consumer, ...toCssText(above)].join('; '),
		}
	}

	const own = typeof consumer === 'object' ? declarationsOf(consumer) : []

	return { class: className, style: Object.fromEntries([...below, ...own, ...above]) }
}

/**
 * Атрибуты корня в одном порядке для всех компонентов: наборы ядра `sets` — в
 * том порядке, в каком их кладёт Vue, — поверх них атрибуты потребителя
 * `forward`, класс и стиль — раскладкой корня (`toRootLayout`, туда же
 * стиль-выход компонента `style`).
 *
 * `forward` — то, что компонент кладёт на корень из не съеденного им: пропсы,
 * которые не съела связка (`forwardProps`), — среди них и `ref` потребителя.
 * Его раскладка снимает: корень ему отдаёт `ref` адаптера, который компонент
 * ставит после атрибутов (см. шапку файла).
 */
export function toRootProps(
	state: TRootState,
	sets: readonly (TAttributesMap | undefined)[],
	forward: TRootForward & TConsumerRefForward,
	style?: TRootStyle,
): TRootProps {
	const attributes: Record<string, unknown> = {}

	for (const set of sets) Object.assign(attributes, set)

	const { ref: _ref, ...consumer } = forward

	return { ...attributes, ...consumer, ...toRootLayout(state, forward, style) }
}

/**
 * Идёт ли гидратация — условие `isHydrating` из `solid-js/web` без узла: сам
 * `isHydrating` Solid не экспортирует. Контекст гидратации Solid снимает
 * перед пользовательскими эффектами, а `done` ставит, когда гидратацию
 * сорвало расхождение с разметкой или первое делегированное событие: в обоих
 * случаях в узлы он пишет снова. На сервере контекст тоже есть — там он для
 * ключей гидратации, а не для неё самой.
 */
function hydrating(): boolean {
	return !isServer && Boolean(sharedConfig.context) && !sharedConfig.done
}

/**
 * Мемо раскладки корня и внутреннего узла (`createPartProps`) — `createMemo`,
 * которое переживает гидратацию (шапка файла, «Гидратация»):
 *
 * - собранное в браузере во время гидратации, оно отдаёт своё первое
 *   значение, пока Solid гидратирует: память спреда остаётся равной узлу;
 * - источники оно читает всегда: смена вне гидратации доходит и тогда, когда
 *   `onMount` ещё не выполнен, — ждущий `Suspense` откладывает его и после
 *   `hydrate()`;
 * - первое значение, посчитанное вне гидратации, — живое, и к первому мемо
 *   больше не возвращается;
 * - пересчитанное за гидратацию, оно ждёт `onMount`: после гидратации
 *   источники могут и не смениться, и пересчёт запускает сигнал, который мемо
 *   читает с первого такого пересчёта. Пользовательские эффекты Solid
 *   выполняет, уже сняв контекст гидратации, но ещё внутри `hydrate()`, — к
 *   возврату из него узел живой;
 * - не пересчитанное за гидратацию сигнала не читает: его первое значение и
 *   так живое, и второго прохода спреда у такого узла нет — после гидратации
 *   пересчитываются только узлы, которые она поменяла.
 *
 * На сервере и вне гидратации — обычное мемо, без сигнала и эффекта.
 */
function createLayoutMemo<T>(compute: () => T): Accessor<T> {
	if (!hydrating()) return createMemo(compute)

	const [mounted, setMounted] = createSignal(false)
	// Первое значение — в коробке: набора части может и не быть (`undefined`),
	// и только коробка отличает «ещё не считали» от «набора нет»
	let served: { readonly value: T } | undefined
	let live = false

	onMount(() => setMounted(true))

	return createMemo(() => {
		const value = compute()

		live ||= !hydrating()

		if (live) return value

		if (served === undefined) {
			served = { value }

			return value
		}

		// Пересчитано за гидратацию — только подписка: после неё сигнал
		// пересчитает мемо, и спред допишет сменившееся
		mounted()

		return served.value
	})
}

/**
 * Атрибуты корня аксессором-мемо — то, что компонент спредит на корень:
 * `<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>`.
 *
 * Тело компонента Solid выполняется один раз, а спред читает атрибуты корня
 * по одному — на каждую отрисовку и каждую смену. Мемо считает раскладку один
 * раз на смену того, что прочёл `read`: наборов, состояния или атрибутов
 * потребителя, — и все чтения спреда идут из готового объекта. Собранное во
 * время гидратации, до её конца оно отдаёт то, что напечатал сервер
 * (`createLayoutMemo`).
 */
export function createRootProps(read: () => TRootSource): Accessor<TRootProps> {
	return createLayoutMemo(() => {
		const { state, sets, forward, style } = read()

		return toRootProps(state, sets, forward, style)
	})
}

/**
 * Корень внутри своей обёртки — у компонента, чей внешний узел не корень:
 * окно таблицы (`div.so-table__viewport`) вокруг `table`. Корень — узел,
 * который видят плагины и тема, обёртка — разметка вокруг него. Атрибуты
 * потребителя делятся, как у поля (`toRootForward`, `toControlAttrs`), как
 * `useSplitAttrs` у Vue, где `v-show` стоит на окне, и как
 * `toWrappedRootProps` у React:
 *
 * - обёртке — её класс `wrapper` и за ним класс потребителя, стиль
 *   потребителя и `display: none` скрытого компонента; `ref` потребителя ей
 *   отдаёт `consumerRef` адаптера, вне раскладки (шапка файла);
 * - корню — `toRootProps` с остальными атрибутами потребителя, кроме `ref`,
 *   поверх наборов ядра и без своего скрытия: спрятана обёртка — спрятан и
 *   корень внутри неё. Роль и имя таблицы — у корня, и `aria-label`, `id` и
 *   обработчики потребителя достаются ей, а не окну без роли. Классы и
 *   стиль-выход `style` — его, а к `TElementPlugin` его привязывает `bindRef`
 *   адаптера, без `ref` потребителя.
 *
 * Состояние корню отдаётся поимённо, без `visible`, а не остатком
 * деструктуризации: состояние Solid — прокси (стор, `joinState`), и остаток
 * прокси без своих ключей пуст.
 */
export function toWrappedRootProps(
	state: TRootState,
	sets: readonly (TAttributesMap | undefined)[],
	forward: TRootForward & TConsumerRefForward,
	wrapper: string,
	style?: TRootStyle,
): TWrappedRootProps {
	return {
		wrapper: toRootProps(
			{ classes: [wrapper], visible: state.visible },
			[],
			toRootForward(forward),
		),
		root: toRootProps(
			{ classes: state.classes, layout_styles: state.layout_styles, order: state.order },
			sets,
			toControlAttrs(forward),
			style,
		),
	}
}

/**
 * Обёртка и корень аксессором-мемо — то, что компонент спредит на оба узла:
 * `<div {...layout().wrapper} ref={binding.consumerRef}>` и внутри
 * `<Dynamic {...layout().root} component={rootTag(state.tag)} ref={binding.bindRef}>`.
 * Мемо — по той же причине, что `createRootProps`: спред читает атрибуты по
 * одному, а раскладка считается раз на смену того, что прочёл `read`. И
 * гидратацию оно переживает так же — оба узла разом (`createLayoutMemo`).
 */
export function createWrappedRootProps(
	read: () => TWrappedRootSource,
): Accessor<TWrappedRootProps> {
	return createLayoutMemo(() => {
		const { state, sets, forward, wrapper, style } = read()

		return toWrappedRootProps(state, sets, forward, wrapper, style)
	})
}

/** Класс и стиль потребителя — то, что из его атрибутов остаётся корню поля и окну таблицы. */
export function toRootForward(forward: TRootForward): TRootForward {
	return { class: forward.class, style: forward.style }
}

/**
 * Классы части без своего экземпляра — строкой для `class` компонента, на
 * котором часть стоит: панель Menu и `Menu.Submenu` — их Frame
 * (`panelClasses`).
 *
 * Снимок классов ядро отдаёт списком (`TClasses` → `string[]`), а `class` у
 * Solid — строка. Классы корня из снимка собирает раскладка корня
 * (`toRootLayout`), классы части — этот помощник: раскладка снимка одна на
 * все компоненты, а не `join` в разметке каждого. Классы, которые компонент
 * части кладёт на свой корень сам, — `so-frame` у Frame, — встают перед ними
 * его раскладкой, как класс потребителя. Снимка нет — класса нет: пустая
 * строка.
 */
export function toPartClass(classes: readonly string[] | undefined): string {
	return classes?.join(' ') ?? ''
}

/**
 * Атрибуты внутреннего узла аксессором — то, что компонент спредит на узел
 * разметки, а не на корень: набор части (`labelAria` подписи Field,
 * `contentAria` панели Accordion, `aria` поля на `<input>`) или атрибуты
 * потребителя его контролу (`toControlAttrs`). Источник у вызова один: у узла
 * с несколькими наборами — вызов на каждый и спреды подряд, в прежнем
 * порядке. Слитые в одном вызове, наборы без мемо сливались бы на каждое
 * чтение ключа спредом, а с мемо — держали бы память на каждый узел, у
 * таблицы — на каждую ячейку.
 *
 * Вне гидратации помощник отдаёт сам `read`: спред читает состояние, как
 * читал бы его напрямую, и лишнего мемо узлу помощник не заводит. Вызванный
 * во время гидратации — мемо раскладки (`createLayoutMemo`): до её конца оно
 * отдаёт своё первое значение, после — живое, и разницу спред дописывает в
 * узел (шапка файла, «Гидратация»). Пример — `for` подписи Field: подпись
 * сервер печатает раньше, чем контрол вошёл в поле, и вход контрола со своим
 * `id` меняет её `for` уже во время гидратации. Стор не придерживается:
 * значение в него пишет сборка в свой момент, удерживается только то, что
 * видит спред.
 *
 * Первое значение мемо должно совпасть с тем, что напечатал сервер, поэтому
 * помощник зовут там, где узел рисуется: в теле компонента, а у узла на каждую
 * запись (`For`, `Index`, колбэк `Show`) — в функции, которая его рисует. Не в
 * выражении спреда: тот пересчитывается на каждую смену прочитанного, и вызов
 * там собирал бы новое мемо на каждый пересчёт. Набора может и не быть
 * (`undefined`) — спред его пропустит.
 */
export function createPartProps<T extends object>(
	read: () => T | undefined,
): Accessor<T | undefined> {
	return hydrating() ? createLayoutMemo(read) : read
}

/**
 * Атрибуты вложенного контрола: пропсы, которые компонент не съел, без класса
 * и стиля — те сливаются на корне (`toRootForward`) — и без `ref`: он корня,
 * его отдаёт `ref` адаптера. Так поле раздаёт атрибуты потребителя двум
 * элементам: обёртке — вид, `<input>` — всё остальное, события, `aria-*` и
 * `data-*`. Аналог `useSplitAttrs` у Vue и `toControlAttrs` у React и Svelte.
 * Так же окно таблицы отдаёт остальное своему корню `table`
 * (`toWrappedRootProps`).
 *
 * Параметр типа — атрибуты компонента (`TDomAttributes` с `TFieldAttributes`),
 * а не весь его набор пропсов: `forwardProps` типизирован пропсами целиком, а
 * входов дескриптора в нём нет — их съела связка. Остаток ложится на `<input>`
 * спредом, и его тип сверяется с атрибутами `<input>`.
 */
export function toControlAttrs<TAttributes extends TRootForward & TConsumerRefForward>(
	forward: Partial<TAttributes>,
): Omit<Partial<TAttributes>, keyof TRootForward | keyof TConsumerRefForward> {
	const { class: _class, style: _style, ref: _ref, ...control } = forward

	return control
}
