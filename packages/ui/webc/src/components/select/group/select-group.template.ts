/**
 * Шаблон группы опций Select: подпись — первый узел корня, пока `label` не
 * пуст; опции — в конце корня.
 */

import type { IItemGroup } from '@soldy-ui/core'
import { bind, ownerAttributes, type ITemplate } from '../../../adapter'

const labels = new WeakMap<HTMLElement, HTMLElement>()

export const selectGroupTemplate: ITemplate<IItemGroup> = {
	create: (root) => {
		const label = root.ownerDocument.createElement('div')

		label.className = 'so-select-group__label'
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

		// Роль `presentation`: в `listbox` ARIA пускает только опции и группы
		bind('labelAria', ({ root, state }) => {
			const label = labels.get(root)

			if (label) ownerAttributes(label, state.labelAria)
		}),
	],
}
