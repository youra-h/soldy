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
 * Стиль у Svelte — строка атрибута, поэтому слои склеиваются текстом: из
 * одноимённых свойств браузер берёт последнее. Имена плагины и ядро пишут
 * по-CSS (`z-index`, `--*`), и в строке они остаются как есть. Пустое значение
 * (`width: ''` у иконки без размера) свойства не задаёт, а пустая строка
 * стиля — атрибута: его нет вовсе.
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
 */

import type { ClassValue } from 'svelte/elements'
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

/** Что корню приходит от потребителя: его класс и стиль. */
export type TRootForward = {
	readonly class?: ClassValue | null
	readonly style?: string | null
}

export type TRootLayout = {
	class: ClassValue
	/** Нет ни одного свойства — `undefined`: атрибута `style` у корня нет. */
	style: string | undefined
}

/** Атрибуты корня целиком: наборы ядра, атрибуты потребителя и раскладка. */
export type TRootAttributes = Record<string, unknown> & TRootLayout

const HIDDEN: TRootStyle = { display: 'none' }

/** Свойства стиля — в текст атрибута; пустое значение свойства не задаёт. */
function toDeclarations(styles: TRootStyle | undefined): string[] {
	return Object.entries(styles ?? {})
		.filter(([, value]) => value !== '')
		.map(([name, value]) => `${name}: ${value}`)
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
	const declarations = [
		...toDeclarations(state.layout_styles),
		...toDeclarations(style),
		...toDeclarations(state.order !== undefined ? { order: state.order } : undefined),
		...(forward.style ? [forward.style] : []),
		...toDeclarations(state.visible === false ? HIDDEN : undefined),
	]

	return {
		class: [...(state.classes ?? []), forward.class],
		style: declarations.length > 0 ? declarations.join('; ') : undefined,
	}
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
