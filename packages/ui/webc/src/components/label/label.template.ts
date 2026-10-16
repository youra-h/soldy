/**
 * Шаблон Label.
 *
 * Корень — сам `<label is="so-label">`: модификаторы стороны, размера и
 * варианта, наборы ядра и скрытие раскладывает на него база (`SoldyElement`).
 * Здесь — две части подписи: контрол и текст. Порядок в DOM один на все
 * стороны — контрол, потом текст, — сторону рисует тема.
 *
 * - контрол — слот `default`: CheckBox, Switch или радио с `tag="span"`
 *   (корень радио сам `label`, а `label` в `label` запрещён). Обёртка
 *   `so-label__control` ровняет контрол по первой строке текста;
 * - текст — слот `content`, без него — проп `text`. Пробелов вокруг нет:
 *   пустую обёртку `so-label__text` тема прячет по `:empty`, и рядом с
 *   одиноким контролом зазора не остаётся.
 *
 * Связки через `for` и `id` нет: контрол — первый labelable-потомок `label`,
 * поэтому клик по тексту переключает его, а текст становится его доступным
 * именем. Внутри — только строчная разметка.
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
