/**
 * Шаблон Label: контрол (слот `default`), потом текст (`content` или проп
 * `text`); сторону рисует тема. Контрол — CheckBox, Switch или радио с
 * `tag="span"`: `label` в `label` запрещён.
 */

import type { ILabel } from '@soldy-ui/core'
import { bind, type ITemplate } from '../../adapter'

/** Обёртка текста каждой подписи — одна на всё время жизни элемента. */
const texts = new WeakMap<HTMLElement, HTMLElement>()

export const labelTemplate: ITemplate<ILabel> = {
	create: (root) => {
		const { ownerDocument } = root
		const control = ownerDocument.createElement('span')
		const text = ownerDocument.createElement('span')

		control.className = 'so-label__control'
		text.className = 'so-label__text'
		root.append(control, text)
		texts.set(root, text)

		return {
			slots: {
				default: { mode: 'append', node: control },
				content: { mode: 'append', node: text },
			},
		}
	},

	bindings: [
		bind('text', ({ root, state, hasSlot }) => {
			// Содержимое слота `content` переопределяет проп text
			if (hasSlot('content')) return

			const text = texts.get(root)

			// Пустой текст — ни одного узла: обёртку тема прячет по `:empty`
			if (text) text.textContent = String(state.text ?? '')
		}),
	],
}
