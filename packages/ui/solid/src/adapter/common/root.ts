/**
 * Раскладка корня: наборы ядра, атрибуты потребителя, класс и стиль — одна на
 * все компоненты, как `toRootProps` у React и Svelte. `ref` в раскладку не
 * входит: компонент ставит `ref` адаптера последним.
 * AGENTS.md (Solid), «Раскладка корня» и «Окна гидратации».
 */

import type { Accessor, JSX } from 'solid-js'
import type { TAttributesMap } from '@soldy-ui/core'
import { createHeldMemo, hydrating } from './hydration'

/** Стиль, как его отдают плагины и ядро: имена — как в CSS (`z-index`, `--*`). */
export type TRootStyle = Readonly<Record<string, string | number>>

/** Что корню нужно из состояния компонента. */
export type TRootState = {
	readonly classes?: readonly string[]
	/** Выход плагина раскладки. */
	readonly layout_styles?: TRootStyle
	/** Место элемента коллекции: ряд — флексбокс. */
	readonly order?: number
	/** `false` прячет корень; ключа нет — корень виден всегда (Skeleton). */
	readonly visible?: boolean
}

/** Класс и стиль потребителя; стиль — объект свойств или строка. */
export type TRootForward = {
	readonly class?: string
	readonly style?: JSX.CSSProperties | string
}

/** `ref` потребителя среди его атрибутов: корень ему отдаёт `ref` адаптера. */
type TConsumerRefForward = { readonly ref?: unknown }

export type TRootLayout = {
	class: string
	/** Объект свойств; строка — только когда строкой пришёл стиль потребителя. */
	style: TRootStyle | string
}

/** Атрибуты корня целиком: наборы ядра, атрибуты потребителя и раскладка. */
export type TRootProps = Record<string, unknown> & TRootLayout

/** Аргументы `toRootProps` — то, что читает мемо раскладки. */
export type TRootSource = {
	readonly state: TRootState
	/** Наборы ядра — в том порядке, в каком их кладёт Vue. */
	readonly sets: readonly (TAttributesMap | undefined)[]
	/** То, что не съела связка (`forwardProps`). */
	readonly forward: TRootForward & TConsumerRefForward
	/** Стиль-выход компонента (`fractionStyle`). */
	readonly style?: TRootStyle
}

/** Обёртка корня и сам корень внутри неё — окно таблицы вокруг `table`. */
export type TWrappedRootProps = {
	readonly wrapper: TRootProps
	readonly root: TRootProps
}

export type TWrappedRootSource = TRootSource & {
	/** Класс обёртки: у окна таблицы `so-table__viewport`. */
	readonly wrapper: string
}

const HIDDEN: TRootStyle = { display: 'none' }

type TDeclaration = readonly [name: string, value: string | number]

/** Свойства слоя стиля без пустых: `''` свойства не задаёт. */
function declarationsOf(styles: object | undefined): TDeclaration[] {
	const declarations: TDeclaration[] = []

	for (const [name, value] of Object.entries(styles ?? {})) {
		if (typeof value === 'number' || (typeof value === 'string' && value !== '')) {
			declarations.push([name, value])
		}
	}

	return declarations
}

function toCssText(declarations: readonly TDeclaration[]): string[] {
	return declarations.map(([name, value]) => `${name}: ${value}`)
}

/**
 * Класс и стиль корня. Стиль по слоям: раскладка, стиль-выход, `order`, затем
 * потребитель, поверх всего — `display: none` скрытого. Строку потребителя
 * разобрать негде (на сервере нет документа), и слои тогда склеиваются текстом.
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

/** Наборы ядра, поверх — атрибуты потребителя без `ref`, затем класс и стиль. */
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
 * Атрибуты корня мемо — спред на корень:
 * `<Root tag={state.tag} attributes={root} ref={binding.ref}>`.
 */
export function createRootProps(read: () => TRootSource): Accessor<TRootProps> {
	return createHeldMemo(read, rootPropsOf)
}

function rootPropsOf(read: () => TRootSource): TRootProps {
	const { state, sets, forward, style } = read()

	return toRootProps(state, sets, forward, style)
}

/**
 * Атрибуты делятся, как у поля: обёртке — её класс, класс и стиль
 * потребителя, скрытие; корню — остальное поверх наборов ядра. Состояние —
 * поимённо: остаток деструктуризации прокси-состояния пуст.
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
 * Обёртка и корень мемо: `<div {...layout().wrapper} ref={binding.consumerRef}>`,
 * внутри `<Root tag={state.tag} attributes={() => layout().root} ref={binding.bindRef}>`.
 */
export function createWrappedRootProps(
	read: () => TWrappedRootSource,
): Accessor<TWrappedRootProps> {
	return createHeldMemo(read, wrappedRootPropsOf)
}

function wrappedRootPropsOf(read: () => TWrappedRootSource): TWrappedRootProps {
	const { state, sets, forward, wrapper, style } = read()

	return toWrappedRootProps(state, sets, forward, wrapper, style)
}

/** Класс и стиль потребителя — корню поля и окну таблицы. */
export function toRootForward(forward: TRootForward): TRootForward {
	return { class: forward.class, style: forward.style }
}

/** Классы части без своего экземпляра — строкой для `class` (панель Menu на Frame). */
export function toPartClass(classes: readonly string[] | undefined): string {
	return classes?.join(' ') ?? ''
}

/**
 * Атрибуты внутреннего узла — набор части или атрибуты контролу: вне
 * гидратации само чтение, в ней — мемо, которое держит окна. Зовётся там, где
 * узел рисуется, а не в выражении спреда; вызов на каждый набор.
 */
export function createPartProps<T extends object>(
	read: () => T | undefined,
): Accessor<T | undefined> {
	return hydrating() ? createHeldMemo(read, partPropsOf) : read
}

function partPropsOf<T>(read: () => T): T {
	return read()
}

/**
 * Атрибуты вложенного контрола: то, что не съела связка, без класса, стиля и
 * `ref` — аналог `useSplitAttrs` у Vue. Параметр типа — атрибуты компонента:
 * остаток сверяется с атрибутами узла, на который ложится.
 */
export function toControlAttrs<TAttributes extends TRootForward & TConsumerRefForward>(
	forward: Partial<TAttributes>,
): Omit<Partial<TAttributes>, keyof TRootForward | keyof TConsumerRefForward> {
	const { class: _class, style: _style, ref: _ref, ...control } = forward

	return control
}
