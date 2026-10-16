/**
 * Шаблон CheckBox.
 *
 * Корень — сам `<span is="so-check-box">`: классы, `attrs` (`dir`) и скрытие
 * раскладывает на него база (`SoldyElement`). Здесь — поле и коробка; внутри
 * корня только строчная разметка: флажок кладут в подпись `Label`.
 *
 * - Поле — `<input type="checkbox">`, узел поля корня: на него база переносит
 *   статические атрибуты разметки корня, а шаблон кладёт `aria` ядра
 *   (`ownerAttributes`) и нативные `id`, `name`, `disabled` и `required` —
 *   ARIA-дублей им ядро не пишет. Отметку и «выбрано частично» скринридеру
 *   сообщают нативные `checked` и `indeterminate`, `aria-checked` ядро не
 *   пишет. Оба — свойства узла: шаблон пишет их на смену значения ядра и
 *   только если узел с ним расходится. Переключает значение плагин флажка по
 *   `change` поля.
 * - Коробка — декор: `aria-hidden` не пускает иконки слотов в доступное имя,
 *   которое флажку даёт подпись. Отметка — слот `icon` у выбранного и
 *   `indeterminate-icon` у частично выбранного: их выводит привязка
 *   (`showSlot`), неактивный — вне документа. Без слота — `<svg>` с рисунком
 *   роли `check` или `checkIndeterminate` (`roleIcon`), а не элемент Icon: она
 *   появляется и пропадает с каждой сменой отметки, и Icon собирал бы на
 *   каждую свой контекст и плагины — в таблице «выбрать все» собирала их
 *   тысячами. Размер и цвет отметке даёт тема флажка по `so-check-box__mark`.
 *
 * Scope у слотов нет, как у всех слотов Web Components: состояние флажка
 * содержимое слота читает у элемента (`el.ctrl`).
 */

import type { ICheckBox } from '@soldy-ui/core'
import { bind, drawRoleIcon, ownerAttributes, roleIcon, type ITemplate } from '../../adapter'

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

/** Слот отметки — см. `MARKS`. */
type TMarkSlot = keyof typeof MARKS

const parts = new WeakMap<HTMLElement, TCheckBoxParts>()

/** Отметка без слота каждого флажка — своя: создаётся с первой ролью и остаётся за ним. */
const marks = new WeakMap<HTMLElement, SVGSVGElement>()

/**
 * Отметка без слота: рисунок роли в коробке; роли нет — отметки нет. Узел у
 * флажка один, и смена отметки рисует на нём другую роль.
 */
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
			if (field.checked !== checked) field.checked = checked
			if (field.indeterminate !== indeterminate) field.indeterminate = indeterminate

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
