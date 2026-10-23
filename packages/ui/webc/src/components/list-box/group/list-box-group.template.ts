/**
 * Шаблон группы ListBox: подпись — первый узел корня, пока `label` не пуст;
 * её набор (`labelAria`, роль `presentation`) — на её узле: в `listbox` ARIA
 * пускает только опции и группы.
 */

import type { IItemGroup } from '@soldy-ui/core'
import { bind, ownerAttributes, type ITemplate } from '../../../adapter'

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
