/**
 * Шаблон CheckBox: поле и коробка-декор под `aria-hidden` — иконки слотов не
 * попадают в имя от подписи. Отметка без слота — голый `<svg>`, а не Icon: она
 * меняется с каждой отметкой, и Icon собирал бы на каждую контекст и плагины —
 * в таблице «выбрать все» тысячами.
 */

import type { ICheckBox } from '@soldy-ui/core'
import { bind, drawRoleIcon, ownerAttributes, roleIcon, type ITemplate, patch } from '../../adapter'

/** Части флажка: поле и коробка, одни на всё время жизни элемента. */
type TCheckBoxParts = {
	readonly field: HTMLInputElement
	readonly container: HTMLElement
}

/** Слот отметки и роль иконки, которая рисуется без него. */
const MARKS = {
	icon: 'check',
	'indeterminate-icon': 'checkIndeterminate',
} as const

type TMarkSlot = keyof typeof MARKS

const parts = new WeakMap<HTMLElement, TCheckBoxParts>()

/** Отметка без слота каждого флажка — своя: создаётся с первой ролью и остаётся за ним. */
const marks = new WeakMap<HTMLElement, SVGSVGElement>()

/** Отметка без слота — рисунок роли на одном узле; роли нет — отметки нет. */
function drawMark(root: HTMLElement, container: HTMLElement, role: string | null): void {
	let svg = marks.get(root)

	if (role === null) {
		svg?.remove()

		return
	}

	if (svg) {
		drawRoleIcon(svg, role)
	} else {
		svg = roleIcon(role)
		svg.setAttribute('class', 'so-check-box__mark')
		marks.set(root, svg)
	}

	if (svg.parentNode !== container) container.appendChild(svg)
}

export const checkBoxTemplate: ITemplate<ICheckBox> = {
	create: (root) => {
		const { ownerDocument } = root
		const field = ownerDocument.createElement('input')
		const container = ownerDocument.createElement('span')

		field.type = 'checkbox'
		container.className = 'so-check-box__container'
		container.setAttribute('aria-hidden', 'true')
		root.append(field, container)
		parts.set(root, { field, container })

		return {
			slots: {
				icon: { mode: 'append', node: container },
				'indeterminate-icon': { mode: 'append', node: container },
			},
			control: field,
		}
	},

	bindings: [
		// Нативные атрибуты поля фиксированного тега — проводка разметки
		bind(['id', 'name', 'disabled', 'required'], ({ root, state }) => {
			const field = parts.get(root)?.field

			if (!field) return

			if (state.id === undefined) field.removeAttribute('id')
			else field.id = state.id

			field.name = state.name ?? ''
			field.disabled = state.disabled === true
			field.required = state.required === true
		}),

		bind('aria', ({ root, state }) => {
			const field = parts.get(root)?.field

			if (field) ownerAttributes(field, state.aria)
		}),

		bind(['value', 'indeterminate'], ({ root, state, hasSlot, showSlot }) => {
			const own = parts.get(root)

			if (!own) return

			const { field, container } = own
			const checked = state.value === true
			const indeterminate = state.indeterminate === true

			// Свойства узла — только если он разошёлся с ядром: после клика
			// браузер уже поставил их сам
			patch(field, { checked, indeterminate })

			// «Выбрано частично» рисуется поверх значения, как у Vue: его снимает
			// клик (`toggle` ядра), а не смена `value`
			const mark: TMarkSlot | null = indeterminate
				? 'indeterminate-icon'
				: checked
					? 'icon'
					: null

			showSlot('icon', mark === 'icon')
			showSlot('indeterminate-icon', mark === 'indeterminate-icon')
			drawMark(root, container, mark === null || hasSlot(mark) ? null : MARKS[mark])
		}),
	],
}
