/**
 * Шаблон Field: подпись, контрол, подсказка, ошибка — один порядок на все
 * стороны, сторону рисует тема. Часть стоит, пока задан её текст: ссылки
 * контрола на части ставит ядро, а слотов оно не видит. Части строятся все сразу
 * и в документе: свет едет в них переносом силами базы.
 */

import type { IField } from '@soldy-ui/core'
import { bind, createDetail, ownerAttributes, type ITemplate } from '../../adapter'
import { TIconElement, type TIconElementProps } from '../icon'

/** Части поля, одни на всё время жизни элемента. */
type TFieldParts = {
	readonly label: HTMLLabelElement
	readonly control: HTMLElement
	readonly helper: HTMLElement
	readonly error: HTMLElement
	readonly errorText: HTMLElement
}

const parts = new WeakMap<HTMLElement, TFieldParts>()

/** Значок ошибки каждого поля — строится с первой показанной ошибкой. */
const icons = new WeakMap<HTMLElement, TIconElementProps>()

/** Значок ошибки — деталь разметки поля, перед текстом ошибки. */
function iconOf(root: HTMLElement, error: HTMLElement): TIconElementProps {
	const known = icons.get(root)

	if (known) return known

	const icon = createDetail(root.ownerDocument, TIconElement, { embedded: 'field.error-icon' })

	icon.className = 'so-field__error-icon'
	icon.icon = 'error'
	error.prepend(icon)
	icons.set(root, icon)

	return icon
}

/** Показанная часть встаёт на своё место (`insert`), снятая уходит из документа. */
function place(root: HTMLElement, part: HTMLElement, shown: boolean, insert: () => void): void {
	if (!shown) {
		part.remove()

		return
	}

	if (part.parentNode !== root) insert()
}

/** Своя разметка слота главнее пропа. */
function writeText(node: HTMLElement, slotted: boolean, text: string | undefined): void {
	if (!slotted) node.textContent = text ?? ''
}

export const fieldTemplate: ITemplate<IField> = {
	create: (root) => {
		const { ownerDocument } = root
		const label = ownerDocument.createElement('label')
		const control = ownerDocument.createElement('div')
		const helper = ownerDocument.createElement('div')
		const error = ownerDocument.createElement('div')
		const errorText = ownerDocument.createElement('div')

		label.className = 'so-field__label'
		control.className = 'so-field__control'
		helper.className = 'so-field__helper'
		error.className = 'so-field__error'
		errorText.className = 'so-field__error-text'
		error.appendChild(errorText)
		root.append(label, control, helper, error)
		parts.set(root, { label, control, helper, error, errorText })

		return {
			slots: {
				'label-content': { mode: 'append', node: label },
				default: { mode: 'append', node: control },
				'helper-content': { mode: 'append', node: helper },
				'error-content': { mode: 'append', node: errorText },
			},
		}
	},

	bindings: [
		bind(['label', 'labelAria'], ({ root, state, hasSlot }) => {
			const own = parts.get(root)

			if (!own) return

			writeText(own.label, hasSlot('label-content'), state.label)
			ownerAttributes(own.label, state.labelAria)
			place(root, own.label, Boolean(state.label), () => own.control.before(own.label))
		}),

		bind(['helper', 'helperRendered', 'helperAria'], ({ root, state, hasSlot }) => {
			const own = parts.get(root)

			if (!own) return

			writeText(own.helper, hasSlot('helper-content'), state.helper)
			ownerAttributes(own.helper, state.helperAria)
			place(root, own.helper, state.helperRendered === true, () =>
				own.control.after(own.helper),
			)
		}),

		bind(['error', 'errorRendered', 'errorAria'], ({ root, state, hasSlot }) => {
			const own = parts.get(root)

			if (!own) return

			const shown = state.errorRendered === true

			if (shown) iconOf(root, own.error)

			writeText(own.errorText, hasSlot('error-content'), state.error)
			ownerAttributes(own.error, state.errorAria)
			place(root, own.error, shown, () => root.appendChild(own.error))
		}),
	],
}
