/**
 * Шаблон группы ListBox.
 *
 * Корень — сам `<div is="so-list-box-group">`: классы, три набора ядра —
 * `role="group"` и `aria-labelledby` на подпись — и скрытие раскладывает на
 * него база (`ElementBase`). Здесь — подпись: первый узел корня, пока `label`
 * не пуст. Нет подписи — нет и её узла, и ссылки на неё у группы тоже нет.
 * Набор подписи (`labelAria`) — её `id` и роль `presentation` — шаблон кладёт
 * на её узел (`ownerAttributes`): в `listbox` ARIA пускает только опции и
 * группы.
 *
 * - Элементы — слот `default`: элементы разметки `<div is="so-list-box-item">`
 *   и элементы из данных, которые в группу ставит шаблон списка. В коллекцию
 *   списка они входят сквозь группу: движок списка находят лифтом вверх по
 *   документу. Встают они в конец корня — подпись остаётся первой.
 */

import type { IItemGroup } from '@soldy-ui/core'
import { bind, ownerAttributes, type ITemplate } from '../../../adapter'

/** Узел подписи каждой группы — один на всё время жизни элемента. */
const labels = new WeakMap<HTMLElement, HTMLElement>()

export const listBoxGroupTemplate: ITemplate<IItemGroup> = {
	create: (root) => {
		const label = root.ownerDocument.createElement('div')

		label.className = 'so-list-box-group__label'
		labels.set(root, label)

		return { slots: { default: { mode: 'append', node: root } } }
	},

	bindings: [
		bind('label', ({ root, state }) => {
			const label = labels.get(root)

			if (!label) return

			const text = String(state.label ?? '')

			if (text === '') {
				label.remove()

				return
			}

			label.textContent = text

			if (root.firstChild !== label) root.prepend(label)
		}),

		bind('labelAria', ({ root, state }) => {
			const label = labels.get(root)

			if (label) ownerAttributes(label, state.labelAria)
		}),
	],
}
