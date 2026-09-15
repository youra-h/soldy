/**
 * Шаблон Button.
 *
 * Слоты контракта: `leading`, `default`, `trailing`. Внутри корня создаётся
 * только span для текста — `leading` кладётся перед ним, `trailing`
 * дописывается в корень (то есть после него). Узлов-обёрток нет: в остальных
 * пяти адаптерах их тоже нет, а лишний span сломал бы селекторы темы.
 */

import type { IButton } from '@soldy/core'
import { ariaBinding, bind, datasetBinding, type ITemplate } from '../../adapter'

/**
 * Нативный `disabled` там, где он есть у тега (`NATIVE_DISABLED_TAGS`) — ядро
 * уже решило, есть ли он, и в каком наборе: `attrs` для нативного атрибута,
 * `aria` для `aria-disabled` на остальных тегах. `attrs` (в т.ч. `dir`)
 * раскладывает база (`TSoldyElement._flush`) для всех компонентов сразу —
 * здесь остаются `aria` и `dataset`: из последнего тема читает
 * `data-disabled`, одинаковый на любом теге.
 */
export const buttonTemplate: ITemplate<IButton> = {
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
		ariaBinding,
		datasetBinding,

		bind('text', ({ content, state, hasSlot }) => {
			// Содержимое слота по умолчанию переопределяет проп text
			if (hasSlot('default')) return

			content.textContent = String(state.text ?? '')
		}),
	],
}
