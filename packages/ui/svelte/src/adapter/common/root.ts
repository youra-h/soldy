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
 * он вешает на поле, — подсказка, автофокус — встаёт на сам `<input>`.
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

/** Класс и стиль потребителя — то, что из его атрибутов остаётся корню поля. */
export function toRootForward(forward: TRootForward): TRootForward {
	return { class: forward.class, style: forward.style }
}

/**
 * Атрибуты вложенного контрола: пропсы, которые компонент не съел, без класса
 * и стиля — те сливаются на корне (`toRootForward`). Так поле раздаёт атрибуты
 * потребителя двум элементам: обёртке — вид, `<input>` — всё остальное,
 * события, `aria-*`, `data-*` и attachment-ы потребителя (символьные ключи
 * остаток копирует наравне со строковыми). Аналог `useSplitAttrs` у Vue и
 * `toControlAttrs` у React.
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
