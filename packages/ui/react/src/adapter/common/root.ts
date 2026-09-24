/**
 * Раскладка корня: класс и стиль, которые сходятся на корне компонента.
 *
 * Во Vue это три привязки шаблона — `:class="classes"`, `:style="layout_styles"`
 * и `v-show="visible"`, — а слияние с `class` и `style` потребителя Vue делает
 * сам. В React сливать приходится разметке, и одна и та же склейка расходилась
 * бы по компонентам.
 *
 * Порядок слоёв:
 * - `className` — классы ядра, затем класс потребителя;
 * - `style` — выход плагина раскладки (`layout_styles`), поверх него стиль
 *   потребителя, поверх всего `display: none` скрытого корня: скрытие не
 *   перекрывают ни раскладка, ни потребитель — как у `v-show`.
 *
 * Имена `layout_styles` плагин пишет по-CSS (`z-index`), а React ждёт их в
 * camelCase (`zIndex`): к числу под незнакомым именем он допишет `px`, и слой
 * Frame молча не встанет. Пользовательское свойство (`--*`) React ставит как
 * есть, его имя не меняется. Сами плагины имён не меняют: вид объекта стиля —
 * дело адаптера, Solid ждёт как раз `z-index`.
 */

import type { CSSProperties } from 'react'

/** Что корню нужно из состояния компонента. */
export type TRootState = {
	/** Снимок классов ядра. */
	readonly classes?: readonly string[]
	/** Выход плагина раскладки, имена — как в CSS. Плагин раскладки есть не у всех. */
	readonly layout_styles?: Readonly<Record<string, string | number>>
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
			...forward.style,
			...(state.visible === false ? HIDDEN : undefined),
		},
	}
}
