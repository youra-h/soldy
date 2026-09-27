/**
 * Раскладка корня: класс, стиль и атрибуты, которые сходятся на корне компонента.
 *
 * Во Vue это привязки шаблона — `:class="classes"`, `:style="layout_styles"`,
 * `v-show="visible"` и `v-bind` наборов ядра, — а слияние с атрибутами
 * потребителя Vue делает сам. В React сливать приходится разметке, и одна и
 * та же склейка расходилась бы по компонентам.
 *
 * Порядок слоёв:
 * - атрибуты — наборы ядра (`attrs`, `aria`, `dataset`), поверх них атрибуты
 *   потребителя, как у Vue, где атрибуты снаружи ложатся на корень последними:
 *   `tabindex="-1"` строки списка перекрывает `tabindex="0"`, который кнопка на
 *   `div` ставит себе сама;
 * - `className` — классы ядра, затем класс потребителя;
 * - `style` — выход плагина раскладки (`layout_styles`) и место элемента
 *   коллекции (`order`), поверх них стиль потребителя, поверх всего
 *   `display: none` скрытого корня: скрытие не перекрывают ни раскладка, ни
 *   потребитель — как у `v-show`;
 * - `ref` адаптера — последним: в React 19 `ref` — обычный проп, и `ref`
 *   потребителя из его атрибутов выбил бы привязку корня к `TElementPlugin`
 *   (не было бы `element:ready`).
 *
 * Имена `layout_styles` плагин пишет по-CSS (`z-index`), а React ждёт их в
 * camelCase (`zIndex`): к числу под незнакомым именем он допишет `px`, и слой
 * Frame молча не встанет. Пользовательское свойство (`--*`) React ставит как
 * есть, его имя не меняется. Сами плагины имён не меняют: вид объекта стиля —
 * дело адаптера, Solid ждёт как раз `z-index`.
 */

import type { CSSProperties } from 'react'
import type { TAttributesMap } from '@soldy-ui/core'
import { toAriaProps } from './aria'

/** Что корню нужно из состояния компонента. */
export type TRootState = {
	/** Снимок классов ядра. */
	readonly classes?: readonly string[]
	/** Выход плагина раскладки, имена — как в CSS. Плагин раскладки есть не у всех. */
	readonly layout_styles?: Readonly<Record<string, string | number>>
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

const HIDDEN: CSSProperties = { display: 'none' }

/** `z-index` → `zIndex`; пользовательское свойство (`--*`) — как есть. */
function toStyleName(name: string): string {
	if (name.startsWith('--')) return name

	return name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

function toReactStyle(
	styles: Readonly<Record<string, string | number>> | undefined,
): Record<string, string | number> {
	const result: Record<string, string | number> = {}

	for (const [name, value] of Object.entries(styles ?? {})) {
		result[toStyleName(name)] = value
	}

	return result
}

export function toRootLayout(state: TRootState, forward: TRootForward): TRootLayout {
	return {
		className: [state.classes?.join(' '), forward.className].filter(Boolean).join(' '),
		style: {
			...toReactStyle(state.layout_styles),
			...(state.order !== undefined ? { order: state.order } : undefined),
			...forward.style,
			...(state.visible === false ? HIDDEN : undefined),
		},
	}
}

/**
 * Пропсы корня в одном порядке для всех компонентов: наборы ядра `sets` — в
 * том порядке, в каком их кладёт Vue, — поверх них атрибуты потребителя
 * `forward`, класс и стиль — раскладкой корня (`toRootLayout`), `ref` адаптера —
 * последним.
 *
 * `forward` — то, что компонент кладёт на корень из не съеденного им. У поля и
 * элемента коллекции это только класс и стиль: остальные атрибуты потребителя
 * уходят вложенному контролу (`toControlAttrs`).
 */
export function toRootProps(
	ref: (element: Element | null) => void,
	state: TRootState,
	sets: readonly (TAttributesMap | undefined)[],
	forward: TRootForward,
): TRootProps {
	const attributes: Record<string, unknown> = {}

	for (const set of sets) Object.assign(attributes, toAriaProps(set))

	return { ...attributes, ...forward, ...toRootLayout(state, forward), ref }
}

/**
 * Атрибуты вложенного контрола: пропсы, которые компонент не съел, без класса
 * и стиля — те сливаются на корне (`toRootLayout`). Так поле раздаёт атрибуты
 * потребителя двум элементам: обёртке — вид, `<input>` — всё остальное,
 * события, `aria-*` и `data-*`. Аналог `useSplitAttrs` у Vue.
 *
 * Параметр типа — атрибуты компонента (`TDomAttributes`), а не весь его
 * набор пропсов: `forwardProps` типизирован пропсами целиком, а входов
 * дескриптора в нём нет — их съела связка.
 */
export function toControlAttrs<TAttributes extends TRootForward>(
	forward: Partial<TAttributes>,
): Omit<Partial<TAttributes>, keyof TRootForward> {
	const { className: _className, style: _style, ...control } = forward

	return control
}

/** Класс и стиль потребителя — то, что из его атрибутов остаётся корню. */
export function toRootForward(forward: TRootForward): TRootForward {
	return { className: forward.className, style: forward.style }
}
