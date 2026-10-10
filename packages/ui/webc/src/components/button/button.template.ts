/**
 * Шаблон Button.
 *
 * Корень — сам `<so-button>`: классы, наборы `aria`, `attrs` и `dataset`
 * (`data-disabled` для темы) и скрытие на него раскладывает база
 * (`TSoldyElement`), здесь остаётся своё.
 *
 * Слоты контракта: `leading`, `default`, `trailing`. В корне создаётся только
 * span для текста — `leading` кладётся перед ним, `trailing` дописывается в
 * корень (то есть после него). Узлов-обёрток нет: в остальных пяти адаптерах их
 * тоже нет, а лишний span сломал бы селекторы темы.
 *
 * Реакция — действие формы на нажатие (`formAction`): корень не нативная
 * кнопка, и отправить или сбросить форму браузер за него не может.
 */

import type { IButton } from '@soldy-ui/core'
import { bind, formAction, on, type ITemplate } from '../../adapter'

export const buttonTemplate: ITemplate<IButton> = {
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
		bind('text', ({ content, state, hasSlot }) => {
			// Содержимое слота по умолчанию переопределяет проп text
			if (hasSlot('default')) return

			content.textContent = String(state.text ?? '')
		}),
	],

	reactions: [on('action:press', formAction)],
}
