/**
 * Привязка набора атрибутов доступности.
 *
 * Общая для всех визуальных компонентов: `aria` объявлен в
 * ComponentViewContribution, поэтому любой шаблон подключает эту привязку
 * без изменений. Набор держит ядро (`TAria`), пишут в него наследники,
 * плагины и расширения коллекции; сюда он приходит снимком.
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
