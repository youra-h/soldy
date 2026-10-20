/**
 * Раскладка корня: класс, стиль и атрибуты, которые сходятся на корне компонента.
 *
 * Во Vue это привязки шаблона — `:class="classes"`, `:style` (выход плагина
 * раскладки `layout_styles` или стиль-выход самого компонента, как
 * `fractionStyle` у ProgressSpinner), `v-show="visible"` и `v-bind` наборов
 * ядра, — а слияние с атрибутами потребителя Vue делает сам. Svelte атрибутов
 * компоненту не наследует: сливать приходится разметке, и одна и та же склейка
 * расходилась бы по компонентам. Поэтому она здесь, одна на все, — как
 * `toRootProps` у React.
 *
 * Порядок слоёв:
 * - атрибуты — наборы ядра (`attrs`, `aria`, `dataset`), поверх них атрибуты
 *   потребителя, как у Vue, где атрибуты снаружи ложатся на корень последними:
 *   `tabindex="-1"` строки списка перекрывает `tabindex="0"`, который кнопка на
 *   `div` ставит себе сама;
 * - `class` — классы ядра, затем класс потребителя (Svelte разворачивает
 *   массив сам, как `class={[…]}` в разметке);
 * - `style` — выход плагина раскладки (`layout_styles`), поверх него
 *   стиль-выход самого компонента и место элемента коллекции (`order`); поверх
 *   них стиль потребителя, поверх всего `display: none` скрытого корня:
 *   скрытие не перекрывают ни раскладка, ни потребитель — как у `v-show`.
 *
 * Стиль раскладка отдаёт слоями (`TRootStyleLayers`): свойства ядра и
 * плагинов — объектом, имена — как в CSS (`z-index`, `--*`), пустое значение
 * (`width: ''` у иконки без размера) свойства не задаёт; стиль потребителя —
 * его строкой. На узел стиль ложится по свойствам, как у Vue и React:
 * атрибут `style` Svelte пишет целиком, и вместе со стилем корня стиралось бы
 * то, что плагины ставят на узел сами. Поэтому в браузере стиль ставит
 * attachment корня (`rootStyle` в `Dynamic`), а строкой атрибута
 * (`toStyleAttribute`) он уходит только в серверную разметку.
 *
 * Привязки корня к `TElementPlugin` здесь нет: её ставит attachment адаптера
 * (`{@attach}` корня в `Dynamic`), и атрибуты потребителя её не перекрывают.
 * Нет и `ref` потребителя: это не атрибут, а связываемый проп компонента
 * (`<Button bind:ref={button}>`), его компонент берёт из `$props()` сам, а
 * корень ему пишет тот же attachment корня (`useAdapter`). У поля и элемента
 * коллекции `ref` — тоже корень, а не `<input>` и не строка.
 *
 * Attachment потребителя (`<Button {@attach tooltip}>`) едет на корень вместе
 * с его атрибутами: Svelte передаёт его компоненту пропом с ключом-символом, и
 * `forwardProps` несёт такие ключи рядом со строковыми (`useAdapter`). Спред
 * атрибутов переносит их на корень — элемент, `<svg>` иконки по роли или
 * компонент из `tag`, — и attachment Svelte ставит сам. С привязкой корня
 * адаптера он не пересекается: ключ у каждого attachment-а свой.
 *
 * У поля (Input, CheckBox, Switch) атрибуты потребителя делятся между двумя
 * элементами, как `useSplitAttrs` у Vue и `toControlAttrs` у React: класс и
 * стиль — корню (`toRootForward`), всё остальное — его `<input>`
 * (`toControlAttrs`), поверх `aria` поля. Остальное — это и обработчики
 * событий, и `aria-*`, и `data-*`, и attachment потребителя: поведение, которое
 * он вешает на поле, — подсказка, автофокус — встаёт на сам `<input>`. Так же
 * делится элемент коллекции (`Tabs.Item`, `ListBox.Item`, `Accordion.Item`):
 * остальное у него — строке, поверх её `aria`, а у радио — его `<input>`. И
 * ListBox с Tabs: остальное у них — узлу списка с ролью (`listbox`,
 * `tablist`), поверх его `aria`.
 *
 * Корень бывает и не внешним узлом компонента: окно таблицы
 * (`div.so-table__viewport`) обёрнуто вокруг её корня `table`. Тогда атрибуты
 * потребителя делятся, как у поля: класс, стиль и скрытие — обёртке,
 * остальное и attachment-ы потребителя — корню, поверх его наборов
 * (`toWrappedRootProps`, как у React и Solid). Attachment корня адаптера и
 * здесь разведён на половины: обёртке — только запись `ref` компонента
 * (`consumerRef`), корню — только привязка к `TElementPlugin` (`bindRef`).
 */

import type { ClassValue } from 'svelte/elements'
import type { TAttributesMap } from '@soldy-ui/core'

/** Стиль, как его отдают плагины и ядро: имена — как в CSS (`z-index`, `--*`). */
export type TRootStyle = Readonly<Record<string, string | number>>

/** Свойства стиля: имена — как в CSS, значения — строкой, пустых значений нет. */
export type TStyleProperties = Readonly<Record<string, string>>

/**
 * Стиль корня по слоям, снизу вверх: из одноимённых свойств действует верхнее.
 * Слои ядра и плагинов — свойствами, стиль потребителя — строкой, как он её
 * написал: в браузере её разбирает браузер, на сервере она уходит в атрибут.
 */
export type TRootStyleLayers = {
	/** Под стилем потребителя: раскладка, стиль-выход компонента, место элемента. */
	readonly below: TStyleProperties
	/** Стиль потребителя. Нет его — `undefined`. */
	readonly forward: string | undefined
	/** Поверх стиля потребителя: `display: none` скрытого корня. */
	readonly above: TStyleProperties
}

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

/** Что корню приходит от потребителя: его класс и стиль. */
export type TRootForward = {
	readonly class?: ClassValue | null
	readonly style?: string | null
}

export type TRootLayout = {
	class: ClassValue
	style: TRootStyleLayers
}

/** Атрибуты корня целиком: наборы ядра, атрибуты потребителя и раскладка. */
export type TRootAttributes = Record<string, unknown> & TRootLayout

/** Обёртка корня и сам корень внутри неё — см. `toWrappedRootProps`. */
export type TWrappedRootAttributes = {
	/** Внешний узел компонента: свой класс, класс и стиль потребителя, скрытие. */
	readonly wrapper: TRootAttributes
	/** Корень внутри обёртки: наборы ядра, поверх — остальное от потребителя, классы и стиль ядра. */
	readonly root: TRootAttributes
}

/**
 * Атрибуты, которые ложатся на узел корня, — они же пропсы компонента в `tag`.
 * Стиль в них — строка атрибута, и только в серверной разметке: в браузере его
 * ставит attachment корня, по свойствам.
 */
export type TRootNodeAttributes = Record<string, unknown> & {
	class: ClassValue
	style?: string
}

const HIDDEN: TStyleProperties = { display: 'none' }

const NONE: TStyleProperties = {}

/** Выход ядра или плагина — свойствами: значение строкой, пустое свойства не задаёт. */
function toProperties(styles: TRootStyle | undefined): Record<string, string> {
	const properties: Record<string, string> = {}

	for (const [name, value] of Object.entries(styles ?? {})) {
		if (value !== '') properties[name] = String(value)
	}

	return properties
}

/** Свойства — в текст атрибута. */
function toDeclarations(properties: TStyleProperties): string[] {
	return Object.entries(properties).map(([name, value]) => `${name}: ${value}`)
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
	return {
		class: [...(state.classes ?? []), forward.class],
		style: {
			below: {
				...toProperties(state.layout_styles),
				...toProperties(style),
				...toProperties(state.order !== undefined ? { order: state.order } : undefined),
			},
			forward: forward.style || undefined,
			above: state.visible === false ? HIDDEN : NONE,
		},
	}
}

/**
 * Стиль корня строкой атрибута — для серверной разметки: слои в том же
 * порядке, и из одноимённых свойств браузер возьмёт последнее. Нет ни одного
 * свойства — `undefined`: атрибута `style` у корня нет.
 */
export function toStyleAttribute(style: TRootStyleLayers): string | undefined {
	const declarations = [
		...toDeclarations(style.below),
		...(style.forward ? [style.forward] : []),
		...toDeclarations(style.above),
	]

	return declarations.length > 0 ? declarations.join('; ') : undefined
}

/**
 * Стиль узла не на корне, который целиком пишет ядро, — строкой атрибута:
 * распорка окна ListBox (`drawn`). Чужого на таком узле ничего нет, и
 * свойствами его ставить незачем. Имена — как их пишет ядро (`--*`, `order`),
 * пустое значение свойства не задаёт; нет свойств — `undefined`.
 */
export function toStyleText(styles: TRootStyle | undefined): string | undefined {
	const declarations = toDeclarations(toProperties(styles))

	return declarations.length > 0 ? declarations.join('; ') : undefined
}

/**
 * Стиль узла без экземпляра, который виден вместе с компонентом, — строкой
 * атрибута: подложка окна и выезжающей панели. Свойства ядра — как у
 * `toStyleText`, поверх них `display: none`, пока компонент скрыт (`shown` —
 * его видимость), как `v-show` у Vue: подложка гаснет вместе с панелью. Своего
 * у подложки — только номер слоя (`layout_backdropStyles`), чужого на узле
 * ничего нет, и свойствами стиль ставить незачем. Склейка одна на обе
 * разметки: повторённая в каждой, она бы разошлась.
 */
export function toShownStyleText(
	styles: TRootStyle | undefined,
	shown: boolean,
): string | undefined {
	return toStyleText({ ...styles, ...(shown ? NONE : HIDDEN) })
}

/**
 * Атрибуты корня в одном порядке для всех компонентов: наборы ядра `sets` — в
 * том порядке, в каком их кладёт Vue, — поверх них атрибуты потребителя
 * `forward`, класс и стиль — раскладкой корня (`toRootLayout`, туда же
 * стиль-выход компонента `style`).
 *
 * `forward` — то, что компонент кладёт на корень из не съеденного им: пропсы,
 * которые не съела связка, и attachment-ы потребителя (`forwardProps`).
 * Символьные ключи спред копирует наравне со строковыми.
 */
export function toRootProps(
	state: TRootState,
	sets: readonly (TAttributesMap | undefined)[],
	forward: TRootForward,
	style?: TRootStyle,
): TRootAttributes {
	const attributes: Record<string, unknown> = {}

	for (const set of sets) Object.assign(attributes, set)

	return { ...attributes, ...forward, ...toRootLayout(state, forward, style) }
}

/**
 * Корень внутри своей обёртки — у компонента, чей внешний узел не корень:
 * окно таблицы (`div.so-table__viewport`) вокруг `table`. Корень — узел,
 * который видят плагины и тема, обёртка — разметка вокруг него. Атрибуты
 * потребителя делятся, как у поля (`toRootForward`, `toControlAttrs`), как
 * `useSplitAttrs` у Vue, где `v-show` стоит на окне, и как
 * `toWrappedRootProps` у React и Solid:
 *
 * - обёртке — её класс `wrapper` и за ним класс потребителя, стиль потребителя
 *   и `display: none` скрытого компонента. `ref` компонента обёртке пишет
 *   attachment `consumerRef` адаптера, вне раскладки;
 * - корню — `toRootProps` с остальными атрибутами и attachment-ами
 *   потребителя поверх наборов ядра, как у поля — `<input>`, и без своего
 *   скрытия: спрятана обёртка — спрятан и корень внутри неё. Роль и имя
 *   таблицы — у корня, и `aria-label`, `id` и обработчики потребителя
 *   достаются ей, а не окну без роли. Классы и стиль-выход `style` — его, а к
 *   `TElementPlugin` его привязывает attachment `bindRef` адаптера, без записи
 *   `ref`.
 *
 * Состояние корню отдаётся поимённо, без `visible`, а не остатком
 * деструктуризации: состояние компонента — геттеры над рунами (`joinState`),
 * и остаток прочёл бы их все.
 */
export function toWrappedRootProps(
	state: TRootState,
	sets: readonly (TAttributesMap | undefined)[],
	forward: TRootForward,
	wrapper: string,
	style?: TRootStyle,
): TWrappedRootAttributes {
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

/** Класс и стиль потребителя — то, что из его атрибутов остаётся корню поля и окну таблицы. */
export function toRootForward(forward: TRootForward): TRootForward {
	return { class: forward.class, style: forward.style }
}

/**
 * Атрибуты вложенного контрола: пропсы, которые компонент не съел, без класса
 * и стиля — те сливаются на корне (`toRootForward`). Так поле раздаёт атрибуты
 * потребителя двум элементам: обёртке — вид, `<input>` — всё остальное,
 * события, `aria-*`, `data-*` и attachment-ы потребителя (символьные ключи
 * остаток копирует наравне со строковыми). Аналог `useSplitAttrs` у Vue и
 * `toControlAttrs` у React. Так же окно таблицы отдаёт остальное своему корню
 * `table` (`toWrappedRootProps`).
 *
 * Параметр типа — атрибуты компонента (`TDomAttributes` с `TFieldAttributes`),
 * а не весь его набор пропсов: `forwardProps` типизирован пропсами целиком, а
 * входов дескриптора в нём нет — их съела связка. Остаток ложится на `<input>`
 * спредом, и его тип сверяется с атрибутами `<input>`.
 */
export function toControlAttrs<TAttributes extends TRootForward>(
	forward: Partial<TAttributes>,
): Omit<Partial<TAttributes>, keyof TRootForward> {
	const { class: _class, style: _style, ...control } = forward

	return control
}
