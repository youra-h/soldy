/**
 * Шаблон Button: в корне только `span` текста, `leading` — перед ним,
 * `trailing` — в конце корня. Обёрток нет: лишний узел сломал бы селекторы
 * темы.
 */

import type { IButton } from '@soldy-ui/core'
import { bind, type ITemplate } from '../../adapter'

export const buttonTemplate: ITemplate<IButton> = {
	create: (root) => {
		const text = document.createElement('span')

		text.className = 'so-button__text'
		root.appendChild(text)

		return {
			slots: {
				leading: { mode: 'before', node: text },
				default: { mode: 'append', node: text },
				trailing: { mode: 'append', node: root },
			},
		}
	},

	bindings: [
		bind('text', ({ content, state, hasSlot }) => {
			// Слот по умолчанию главнее пропа `text`
			if (hasSlot('default')) return

			content.textContent = String(state.text ?? '')
		}),
	],
}
