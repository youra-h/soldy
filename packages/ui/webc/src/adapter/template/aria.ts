/**
 * Привязка набора атрибутов доступности — и фабрика того же механизма для
 * любого другого набора `TAttributes` ядра (`aria`, `dataset`, `attrs`).
 *
 * `aria` общая для всех визуальных компонентов: объявлена в
 * ComponentViewDescriptor, поэтому любой шаблон подключает `ariaBinding`
 * без изменений. Набор держит ядро (`TAria`), пишут в него наследники,
 * плагины и расширения коллекции; сюда он приходит снимком.
 *
 * `datasetBinding` — то же для `dataset` (`data-*` для темы): общая привязка
 * для шаблонов, чей корень читает тема (`ComponentView`, `Button`), а не своя
 * копия в каждом.
 *
 * `createAttributesBinding` — сама механика. Каждый вызов заводит свой
 * `WeakMap`: наборы не пересекаются по именам, а раздельное отслеживание
 * «поставленного в прошлый раз» не даёт одному набору снять атрибут,
 * поставленный другим.
 */

import type { TAria, TAttributesMap, TDataset } from '@soldy-ui/core'
import { bind, type ITemplateBinding } from './types'

/**
 * Раскладывает один набор `имя → значение` на элемент, `null` снимает
 * атрибут. Возвращает список выставленных имён — передай его следующим
 * вызовом как `previous`, чтобы снять атрибуты, исчезнувшие из набора.
 *
 * Вынесена отдельно от `createAttributesBinding`: `TSoldyElement` (база
 * `element.base.ts`) применяет её к `attrs` напрямую в `_flush`, минуя
 * привязку шаблона, — `attrs` структурный набор (в нём в том числе `dir`) и
 * нужен всем визуальным компонентам, а не только тем, чей шаблон подключил
 * `createAttributesBinding('attrs')`.
 */
export function applyAttributeSet(
	root: HTMLElement,
	map: TAttributesMap | undefined,
	previous: readonly string[],
): string[] {
	const current: string[] = []

	for (const [name, value] of Object.entries(map ?? {})) {
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

	return current
}

export function createAttributesBinding<TInstance extends object>(
	prop: keyof TInstance & string,
): ITemplateBinding<TInstance> {
	/** Что было поставлено в прошлый раз — чтобы снимать исчезнувшие атрибуты. */
	const applied = new WeakMap<HTMLElement, string[]>()

	return bind<TInstance>(prop, ({ root, state }) => {
		const map = (state[prop] ?? {}) as TAttributesMap
		const previous = applied.get(root) ?? []

		applied.set(root, applyAttributeSet(root, map, previous))
	})
}

export const ariaBinding: ITemplateBinding<{ readonly aria: TAria }> =
	createAttributesBinding('aria')

export const datasetBinding: ITemplateBinding<{ readonly dataset: TDataset }> =
	createAttributesBinding('dataset')
