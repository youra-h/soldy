/**
 * Привязка набора атрибутов доступности — и фабрика того же механизма для
 * любого другого набора `TAttributes` ядра (`aria`, `dataset`, `attrs`).
 *
 * `aria` общая для всех визуальных компонентов: объявлена в
 * ComponentViewContribution, поэтому любой шаблон подключает `ariaBinding`
 * без изменений. Набор держит ядро (`TAria`), пишут в него наследники,
 * плагины и расширения коллекции; сюда он приходит снимком.
 *
 * `createAttributesBinding` — та же механика для наборов, нужных только части
 * шаблонов (`attrs` — нативные атрибуты вроде `disabled`, зависящие от тега
 * корня, есть только у Button). Каждый вызов заводит свой `WeakMap`: наборы
 * не пересекаются по именам, а раздельное отслеживание «поставленного в
 * прошлый раз» не даёт одному набору снять атрибут, поставленный другим.
 */

import type { TAria, TAttributesMap } from '@soldy/core'
import { bind, type ITemplateBinding } from './types'

export function createAttributesBinding<TInstance extends object>(
	prop: keyof TInstance & string,
): ITemplateBinding<TInstance> {
	/** Что было поставлено в прошлый раз — чтобы снимать исчезнувшие атрибуты. */
	const applied = new WeakMap<HTMLElement, string[]>()

	return bind<TInstance>(prop, ({ root, state }) => {
		const map = (state[prop] ?? {}) as TAttributesMap
		const previous = applied.get(root) ?? []
		const current: string[] = []

		for (const [name, value] of Object.entries(map)) {
			// null означает «атрибут не ставить»
			if (value === null) continue

			root.setAttribute(name, value)
			current.push(name)
		}

		// Пересоздание корня даёт чистый элемент, а вот смена tag на живом корне
		// меняет состав набора: role/tabindex у нативной button не нужны
		for (const name of previous) {
			if (!current.includes(name)) root.removeAttribute(name)
		}

		applied.set(root, current)
	})
}

export const ariaBinding: ITemplateBinding<{ readonly aria: TAria }> =
	createAttributesBinding('aria')
