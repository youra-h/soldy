/**
 * Шаблон Button.
 *
 * Слоты контракта: `leading`, `default`, `trailing`. Внутри корня создаётся
 * только span для текста — `leading` кладётся перед ним, `trailing`
 * дописывается в корень (то есть после него). Узлов-обёрток нет: в остальных
 * пяти адаптерах их тоже нет, а лишний span сломал бы селекторы темы.
 */

import { ariaBinding, bind, type ITemplate } from '../../adapter'

export const buttonTemplate: ITemplate = {
	tag: (state) => String(state.tag ?? 'button'),

	create: (root) => {
		const text = document.createElement('span')

		text.className = 's-button__text'
		root.appendChild(text)

		return {
			leading: { mode: 'before', node: text },
			default: { mode: 'append', node: text },
			trailing: { mode: 'append', node: root },
		}
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

		bind('text', ({ content, state, hasSlot }) => {
			// Содержимое слота по умолчанию переопределяет проп text
			if (hasSlot('default')) return

			content.textContent = String(state.text ?? '')
		}),
	],
}
