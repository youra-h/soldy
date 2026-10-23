/**
 * Раскладка корня: класс, стиль и атрибуты, которые сходятся на корне, — то,
 * что у Vue делают привязки шаблона и слияние атрибутов. Порядок слоёв и
 * дележ атрибутов потребителя — AGENTS.md (React), «Корень и `ref`
 * потребителя».
 */

import type { CSSProperties } from 'react'
import type { TAttributesMap } from '@soldy-ui/core'
import { toAriaProps } from './aria'

/** Стиль, как его отдают плагины и ядро: имена — как в CSS (`z-index`, `--*`). */
export type TRootStyle = Readonly<Record<string, string | number>>

/** Что корню нужно из состояния компонента. */
export type TRootState = {
	readonly classes?: readonly string[]
	/** Выход плагина раскладки. */
	readonly layout_styles?: TRootStyle
	/** Место элемента коллекции во флекс-ряду; нет — своего места нет. */
	readonly order?: number
	/** `false` прячет корень; нет — корень виден всегда. */
	readonly visible?: boolean
}

/** Класс и стиль потребителя. */
export type TRootForward = {
	readonly className?: string
	readonly style?: CSSProperties
}

export type TRootLayout = {
	className: string
	style: CSSProperties
}

/** Корень целиком: атрибуты, раскладка и `ref` адаптера. */
export type TRootProps = Record<string, unknown> &
	TRootLayout & {
		ref: (element: Element | null) => void
	}

/** Обёртка корня и сам корень внутри неё — см. `toWrappedRootProps`. */
export type TWrappedRootProps = {
	readonly wrapper: Record<string, unknown> & TRootLayout
	readonly root: TRootProps
}

const HIDDEN: CSSProperties = { display: 'none' }

/** `z-index` → `zIndex`; пользовательское свойство (`--*`) — как есть. */
function toStyleName(name: string): string {
	if (name.startsWith('--')) return name

	return name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

/** Стиль плагинов и ядра — в объект стиля React. */
export function toReactStyle(styles: TRootStyle | undefined): Record<string, string | number> {
	const result: Record<string, string | number> = {}

	for (const [name, value] of Object.entries(styles ?? {})) {
		result[toStyleName(name)] = value
	}

	return result
}

/** Класс и стиль корня; `style` — стиль-выход самого компонента (`fractionStyle`). */
export function toRootLayout(
	state: TRootState,
	forward: TRootForward,
	style?: TRootStyle,
): TRootLayout {
	return {
		className: [state.classes?.join(' '), forward.className].filter(Boolean).join(' '),
		style: {
			...toReactStyle(state.layout_styles),
			...toReactStyle(style),
			...(state.order !== undefined ? { order: state.order } : undefined),
			...forward.style,
			...(state.visible === false ? HIDDEN : undefined),
		},
	}
}

/**
 * Пропсы корня: наборы ядра `sets`, поверх — атрибуты потребителя `forward`,
 * раскладка, `ref` адаптера последним.
 */
export function toRootProps(
	ref: (element: Element | null) => void,
	state: TRootState,
	sets: readonly (TAttributesMap | undefined)[],
	forward: TRootForward,
	style?: TRootStyle,
): TRootProps {
	const attributes: Record<string, unknown> = {}

	for (const set of sets) Object.assign(attributes, toAriaProps(set))

	return { ...attributes, ...forward, ...toRootLayout(state, forward, style), ref }
}

/**
 * Атрибуты вложенного контрола: то, что компонент не съел, без класса, стиля
 * и `ref` (аналог `useSplitAttrs` у Vue). Параметр типа — атрибуты компонента
 * (`TDomAttributes`): входов дескриптора в `forwardProps` уже нет.
 */
export function toControlAttrs<TAttributes extends TRootForward & { readonly ref?: unknown }>(
	forward: Partial<TAttributes>,
): Omit<Partial<TAttributes>, keyof TRootForward | 'ref'> {
	const { className: _className, style: _style, ref: _ref, ...control } = forward

	return control
}

/** Класс и стиль потребителя — то, что из его атрибутов остаётся корню. */
export function toRootForward(forward: TRootForward): TRootForward {
	return { className: forward.className, style: forward.style }
}

/** Классы части без своего экземпляра — строкой для `className` (панель Menu на Frame). */
export function toPartClass(classes: readonly string[] | undefined): string {
	return classes?.join(' ') ?? ''
}

/**
 * Корень внутри обёртки (окно таблицы вокруг `table`): обёртке — её класс,
 * класс, стиль и `ref` потребителя, скрытие; корню — `toRootProps` с
 * остальными атрибутами, ref корня — `bindRef`.
 */
export function toWrappedRootProps(
	ref: (element: Element | null) => void,
	state: TRootState,
	sets: readonly (TAttributesMap | undefined)[],
	forward: TRootForward & { readonly ref?: unknown },
	className: string,
): TWrappedRootProps {
	const { visible, ...root } = state
	const own = toRootForward(forward)

	return {
		wrapper: {
			ref: forward.ref,
			className: [className, own.className].filter(Boolean).join(' '),
			style: { ...own.style, ...(visible === false ? HIDDEN : undefined) },
		},
		root: toRootProps(ref, root, sets, toControlAttrs(forward)),
	}
}
