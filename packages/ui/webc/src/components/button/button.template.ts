/**
 * Шаблон Button.
 *
 * Внутри корня — span для текста; в него же переносится пользовательское
 * содержимое. Текст из props показывается только когда содержимое не задано.
 */

import { bind, type ITemplate } from '../../adapter'

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
		 * У нативного button — настоящий атрибут disabled (он даёт и блокировку
		 * фокуса, и неучастие в форме). У остальных тегов остаётся только
		 * сообщить о состоянии вспомогательным технологиям.
		 */
		bind(['disabled', 'tag'], ({ root, state }) => {
			const isNativeButton = root.tagName.toLowerCase() === 'button'
			const disabled = Boolean(state.disabled)

			root.toggleAttribute('disabled', isNativeButton && disabled)

			if (isNativeButton || !disabled) {
				root.removeAttribute('aria-disabled')
			} else {
				root.setAttribute('aria-disabled', 'true')
			}
		}),

		bind('text', ({ content, state, hasLight }) => {
			if (hasLight) return

			content.textContent = String(state.text ?? '')
		}),
	],
}
