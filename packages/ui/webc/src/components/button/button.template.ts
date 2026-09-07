/**
 * Шаблон Button.
 *
 * Внутри корня — span для текста; в него же переносится пользовательское
 * содержимое. Текст из props показывается только когда содержимое не задано.
 */

import { ariaBinding, bind, type ITemplate } from '../../adapter'

export const buttonTemplate: ITemplate = {
	tag: (state) => String(state.tag ?? 'button'),

	create: (root) => {
		const text = document.createElement('span')

		text.className = 's-button__text'
		root.appendChild(text)

		return text
	},

	bindings: [
		/**
		 * Только нативный атрибут disabled — он даёт и блокировку фокуса,
		 * и неучастие в форме, чего aria-disabled не умеет. Всё остальное
		 * (aria-disabled, role, tabindex) вычисляет ядро и ставит ariaBinding.
		 */
		bind(['disabled', 'tag'], ({ root, state }) => {
			const isNativeButton = root.tagName.toLowerCase() === 'button'

			root.toggleAttribute('disabled', isNativeButton && Boolean(state.disabled))
		}),

		ariaBinding,

		bind('text', ({ content, state, hasLight }) => {
			if (hasLight) return

			content.textContent = String(state.text ?? '')
		}),
	],
}
