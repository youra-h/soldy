/**
 * Раскладка корня — класс, стиль и атрибуты, которые во Vue сливает шаблон,
 * а здесь одна склейка на все компоненты, как `toRootProps` у React.
 * AGENTS.md (Svelte), «Атрибуты корня».
 */

import type { ClassValue } from 'svelte/elements'
import type { TAttributesMap } from '@soldy-ui/core'

/** Стиль, как его отдают плагины и ядро: имена — как в CSS (`z-index`, `--*`). */
export type TRootStyle = Readonly<Record<string, string | number>>

/** Свойства стиля: имена — как в CSS, значения — строкой, пустых значений нет. */
export type TStyleProperties = Readonly<Record<string, string>>

/** Стиль корня по слоям снизу вверх: из одноимённых свойств действует верхнее. */
export type TRootStyleLayers = {
	/** Раскладка, стиль-выход компонента, место элемента коллекции. */
	readonly below: TStyleProperties
	/** Стиль потребителя строкой, как он её написал. */
	readonly forward: string | undefined
	/** `display: none` скрытого корня. */
	readonly above: TStyleProperties
}

/** Что корню нужно из состояния компонента. */
export type TRootState = {
	readonly classes?: readonly string[]
	readonly layout_styles?: TRootStyle
	/** Место элемента коллекции (`order` фасада); нет — своего места нет. */
	readonly order?: number
	/** `false` прячет корень; нет ключа — корень виден всегда (Skeleton). */
	readonly visible?: boolean
}

/** Класс и стиль от потребителя. */
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
	readonly wrapper: TRootAttributes
	readonly root: TRootAttributes
}

/** Атрибуты на узле корня; `style` строкой — только в серверной разметке. */
export type TRootNodeAttributes = Record<string, unknown> & {
	class: ClassValue
	style?: string
}

const HIDDEN: TStyleProperties = { display: 'none' }

const NONE: TStyleProperties = {}

/** Значение — строкой; пустое свойства не задаёт. */
function toProperties(styles: TRootStyle | undefined): Record<string, string> {
	const properties: Record<string, string> = {}

	for (const [name, value] of Object.entries(styles ?? {})) {
		if (value !== '') properties[name] = String(value)
	}

	return properties
}

function toDeclarations(properties: TStyleProperties): string[] {
	return Object.entries(properties).map(([name, value]) => `${name}: ${value}`)
}

/** Нет объявлений — `undefined`: атрибута `style` нет. */
function joinDeclarations(declarations: readonly string[]): string | undefined {
	return declarations.length > 0 ? declarations.join('; ') : undefined
}

/** `style` — стиль-выход компонента, его имя называет разметка (`fractionStyle`). */
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

/** Стиль корня строкой атрибута — для серверной разметки. */
export function toStyleAttribute(style: TRootStyleLayers): string | undefined {
	return joinDeclarations([
		...toDeclarations(style.below),
		...(style.forward ? [style.forward] : []),
		...toDeclarations(style.above),
	])
}

/** Стиль узла, который целиком пишет ядро (распорка окна ListBox), — строкой. */
export function toStyleText(styles: TRootStyle | undefined): string | undefined {
	return joinDeclarations(toDeclarations(toProperties(styles)))
}

/** То же, и `display: none`, пока компонент скрыт, — подложка окна и панели. */
export function toShownStyleText(
	styles: TRootStyle | undefined,
	shown: boolean,
): string | undefined {
	return toStyleText({ ...styles, ...(shown ? NONE : HIDDEN) })
}

/**
 * Атрибуты корня: наборы ядра `sets` в порядке Vue, поверх них атрибуты
 * потребителя `forward` (и его attachment-ы), класс и стиль — `toRootLayout`.
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
 * Корень внутри обёртки (окно таблицы вокруг `table`): обёртке — её класс,
 * класс и стиль потребителя и скрытие, корню — остальное поверх его наборов.
 * Состояние корню — поимённо: остаток деструктуризации прочёл бы все руны.
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

/** Класс и стиль потребителя — корню поля и обёртке таблицы. */
export function toRootForward(forward: TRootForward): TRootForward {
	return { class: forward.class, style: forward.style }
}

/**
 * Остальное от потребителя — вложенному контролу: `<input>` поля, строке
 * элемента, узлу списка. Аналог `useSplitAttrs` у Vue. Тип — атрибуты
 * компонента, а не все пропсы: остаток сверяется с атрибутами контрола.
 */
export function toControlAttrs<TAttributes extends TRootForward>(
	forward: Partial<TAttributes>,
): Omit<Partial<TAttributes>, keyof TRootForward> {
	const { class: _class, style: _style, ...control } = forward

	return control
}
