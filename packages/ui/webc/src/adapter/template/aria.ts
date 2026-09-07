/**
 * Привязка набора атрибутов доступности, вычисленного ядром.
 *
 * Общая для всех контролов: `aria` объявлен в ControlContribution, поэтому
 * любой шаблон контрола подключает эту привязку без изменений. В базовый
 * класс элемента она не входит — у ComponentView и прочих неинтерактивных
 * слоёв пропа `aria` попросту нет.
 */

import { bind, type ITemplateBinding } from './types'

/** Что было поставлено в прошлый раз — чтобы снимать исчезнувшие атрибуты. */
const APPLIED = new WeakMap<HTMLElement, string[]>()

export const ariaBinding: ITemplateBinding = bind('aria', ({ root, state }) => {
	const aria = (state.aria ?? {}) as Record<string, string | null>
	const previous = APPLIED.get(root) ?? []
	const current: string[] = []

	for (const [name, value] of Object.entries(aria)) {
		// null означает «атрибут не ставить»
		if (value === null || value === undefined) continue

		root.setAttribute(name, value)
		current.push(name)
	}

	// Пересоздание корня даёт чистый элемент, а вот смена tag на живом корне
	// меняет состав набора: role/tabindex у нативной button не нужны
	for (const name of previous) {
		if (!current.includes(name)) root.removeAttribute(name)
	}

	APPLIED.set(root, current)
})
