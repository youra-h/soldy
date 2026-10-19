/**
 * Шаблон Field.
 *
 * Корень — сам `<div is="so-field">`: модификаторы стороны и размера, наборы
 * ядра и скрытие раскладывает на него база (`SoldyElement`). Здесь — части
 * поля в одном порядке на все стороны: подпись, контрол, подсказка, ошибка.
 * Сторону рисует тема.
 *
 * - Подпись — `<label>`: текст — проп `label`, своя разметка — слот
 *   `label-content`. Связку с контролом — `id` и `for` — несёт набор
 *   `labelAria`, его кладёт шаблон (`ownerAttributes`): `for` на поле у
 *   контролов с `<input>`, а группу (RadioGroup) называет ссылка
 *   `aria-labelledby` на `id`.
 * - Контрол — слот `default`: Input, CheckBox, Switch, RadioGroup или Label с
 *   контролом. Связку поле опускает ему лифтом при своей сборке, и контрол,
 *   собранный ниже, находит её вверх по документу.
 * - Подсказка — `<div>`: текст — проп `helper`, своя разметка — слот
 *   `helper-content`. Её `id` (набор `helperAria`) — в `aria-describedby`
 *   контрола.
 * - Ошибка — `<div>` со значком и текстом: текст — проп `error`, своя
 *   разметка — слот `error-content`. Значок — деталь
 *   `<span is="so-icon" embedded="field.error-icon">` роли `error`, декор:
 *   смысл несёт текст. Размера у значка нет — его ставит тема. Строится с
 *   первой показанной ошибкой и остаётся за ней.
 *
 * Часть стоит, пока задан её текст: ссылки контрола на части ставит ядро, а
 * слотов оно не видит. Ошибка рисуется при `invalid` и встаёт на место
 * подсказки. Что рисовать, решает ядро (`helperRendered`, `errorRendered`).
 * Части строятся при первом подключении все и сразу, в документе: свет едет в
 * свою часть переносом силами базы, не выходя из документа. Привязки снимают
 * ненужные с первой отрисовки, а показ возвращает часть на её место.
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

function isIcon(node: Element): node is TIconElementProps {
	return node instanceof TIconElement
}

/** Значок ошибки — деталь разметки поля, перед текстом ошибки. */
function iconOf(root: HTMLElement, error: HTMLElement): TIconElementProps {
	const known = icons.get(root)

	if (known) return known

	const icon = createDetail(
		root.ownerDocument,
		'span',
		{ is: 'so-icon', embedded: 'field.error-icon' },
		isIcon,
	)

	icon.className = 'so-field__error-icon'
	icon.icon = 'error'
	error.prepend(icon)
	icons.set(root, icon)

	return icon
}

/**
 * Часть показана или снята. Показанная встаёт на своё место в корне —
 * `insert`, — снятая уходит из документа вместе со своей разметкой.
 */
function place(root: HTMLElement, part: HTMLElement, shown: boolean, insert: () => void): void {
	if (!shown) {
		part.remove()

		return
	}

	if (part.parentNode !== root) insert()
}

/**
 * Текст части — когда её слот не задан: своя разметка слота переопределяет
 * проп. Пустой текст — ни одного узла.
 */
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
