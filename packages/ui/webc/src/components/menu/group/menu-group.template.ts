/**
 * Шаблон группы меню; его функции рисуют и группу переключателей. Подпись —
 * первый узел корня, пока `label` не пуст: нет подписи — нет и ссылки на неё.
 * Пункты встают в конец корня.
 */

import type { IItemGroup, TAttributesMap } from '@soldy-ui/core'
import { bind, ownerAttributes, type ITemplate, type TTemplateParts } from '../../../adapter'

/** Узел подписи каждой группы — один на всё время жизни элемента. */
const labels = new WeakMap<HTMLElement, HTMLElement>()

export function createGroup(root: HTMLElement): TTemplateParts {
	const label = root.ownerDocument.createElement('div')

	label.className = 'so-menu-group__label'
	labels.set(root, label)

	return { slots: { default: { mode: 'append', node: root } } }
}

export function showLabel(root: HTMLElement, value: string | undefined): void {
	const label = labels.get(root)

	if (!label) return

	const text = value ?? ''

	if (text === '') {
		label.remove()

		return
	}

	label.textContent = text

	if (root.firstChild !== label) root.prepend(label)
}

/** Подпись — разметка без своего экземпляра: её набор (`id`) держит группа. */
export function labelAttributes(root: HTMLElement, set: TAttributesMap | undefined): void {
	const label = labels.get(root)

	if (label) ownerAttributes(label, set)
}

export const menuGroupTemplate: ITemplate<IItemGroup> = {
	create: createGroup,

	bindings: [
		bind('label', ({ root, state }) => showLabel(root, state.label)),
		bind('labelAria', ({ root, state }) => labelAttributes(root, state.labelAria)),
	],
}
