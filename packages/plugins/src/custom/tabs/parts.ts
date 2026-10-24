import type { ITabs } from '@soldy-ui/core'

/**
 * Узлы набора — один поиск на плагины раскладки Tabs: место активного таба
 * меряется от ряда (`TTabsActiveTabPlugin`), а сдвиг табов без смены их
 * размеров ловит наблюдатель списка (`TTabsLayoutPlugin`).
 *
 * Узлы находят по классам владельца (`classes.resolve`), а не строкой в
 * плагине, и прямым путём от корня: Tabs бывают вложены — в слот ряда или в
 * панель других, — и поиск по потомкам нашёл бы чужой узел первым: слот
 * `leading` стоит в ряду раньше списка.
 */

/** Ряд набора — ребёнок корня: список табов и слоты по его краям. */
export function barOf(owner: ITabs, root: Element): Element | null {
	return root.querySelector(`:scope > ${owner.classes.resolve('__bar', { point: true })}`)
}

/** Список табов набора — ребёнок его ряда, `[role=tablist]`. */
export function listOf(owner: ITabs, root: Element): Element | null {
	return (
		barOf(owner, root)?.querySelector(
			`:scope > ${owner.classes.resolve('__list', { point: true })}`,
		) ?? null
	)
}
