/**
 * Шаблон группы меню, как `Group.vue` у Vue.
 *
 * Корень — сам `<div is="so-menu-group">`: классы и три набора ядра —
 * `role="group"` и `aria-labelledby` на подпись — раскладывает на него база
 * (`ElementBase`). Здесь — подпись: первый узел корня, пока `label` не пуст.
 * Нет подписи — нет и её узла, и ссылки на неё у группы тоже нет. Набор
 * подписи (`labelAria`) — её `id` — шаблон кладёт на её узел
 * (`ownerAttributes`): подпись — разметка без своего экземпляра.
 *
 * - Пункты — слот `default`: пункты разметки и пункты из данных, которые в
 *   группу ставит шаблон меню. В коллекцию меню они входят сквозь группу:
 *   движок меню находят лифтом вверх по документу, и навигация ходит по ним,
 *   как по одному списку. Встают они в конец корня — подпись остаётся первой.
 *
 * Разметка у группы переключателей та же (`menu-radio-group.template.ts`), и
 * подпись обе рисуют функциями этого модуля.
 */

import type { IItemGroup, TAttributesMap } from '@soldy-ui/core'
import { bind, ownerAttributes, type ITemplate, type TTemplateParts } from '../../../adapter'

/** Узел подписи каждой группы — один на всё время жизни элемента. */
const labels = new WeakMap<HTMLElement, HTMLElement>()

/** Подпись группы — узел, который встаёт в корень с первым непустым `label`. */
export function createGroup(root: HTMLElement): TTemplateParts {
	const label = root.ownerDocument.createElement('div')

	label.className = 'so-menu-group__label'
	labels.set(root, label)

	return { slots: { default: { mode: 'append', node: root } } }
}

/** Текст подписи — первым узлом корня; пустой — подписи нет. */
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

/** Набор подписи — её `id`, на который ссылается группа. */
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
