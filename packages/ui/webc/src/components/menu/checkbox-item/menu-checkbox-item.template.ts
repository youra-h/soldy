/**
 * Шаблон флажка меню, как `Menu.CheckboxItem` у Vue: строка пункта с
 * отметкой в начале.
 *
 * Корень — сам `<div is="so-menu-checkbox-item">`: классы, `attrs` и `dataset`
 * (`data-highlighted`, `data-disabled`, `data-selected`) раскладывает на него
 * база, и строка красится от него. Здесь — строка (`row.ts`).
 *
 * - Нажатие — клик строки: решает меню (`adapters.menu.toggle()`) —
 *   выключенному отказывает, а доступному переключает отметку — выбор
 *   коллекции — и остаётся открытым.
 * - Отметка — обёртка `span.so-menu-item__indicator` под `aria-hidden`
 *   (состояние объявляет `aria-checked`), первая у начала строки, — у
 *   неотмеченного флажка тоже: она держит колонку, а её наличие в списке тема
 *   читает как «у меню есть колонка отметок». В обёртке — слот
 *   `indicator-icon` или иконка роли `check`,
 *   `<span is="so-icon" embedded="menu.indicator">`, — у отмеченного.
 * - Значок, текст и подсказка сочетания — как у действия
 *   (`menu-item.template.ts`).
 *
 * Scope у слотов нет: отметку содержимое слота берёт у элемента
 * (`el.state.selected`). Поэтому слот `indicator-icon` — отметка отмеченного,
 * как своя иконка: его выводит привязка (`showSlot`) только у отмеченного, у
 * остальных он вне документа.
 */

import type { IMenuCheckboxItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import { bind, lend, type ITemplate } from '../../../adapter'
import type { TIconElementProps } from '../../icon'
import { createRow, iconSize, partOf, placeMark, roleIconOf, rowBindings } from '../row'

/** Отметка флажка — обёртка и своя иконка в ней (со слотом `indicator-icon` — `null`). */
type TMark = {
	readonly indicator: HTMLElement
	readonly icon: TIconElementProps | null
}

const marks = new WeakMap<HTMLElement, TMark>()

export const menuCheckboxItemTemplate: ITemplate<IMenuCheckboxItem, TMenuItemCollectionFacade> = {
	create: (root, ctx) => {
		const { hasSlot } = ctx

		const { ownerDocument } = root
		const row = createRow(root, () => ctx.facade?.context?.adapters.menu.toggle())
		const indicator = partOf(ownerDocument, 'so-menu-item__indicator', true)
		const icon = partOf(ownerDocument, 'so-menu-item__icon')
		const shortcut = partOf(ownerDocument, 'so-menu-item__shortcut')

		lend(row, 'leading', indicator)
		lend(row, 'leading', icon)
		lend(row, 'trailing', shortcut)

		// Своя отметка — только без слота `indicator-icon`: заданный слот
		// заменяет её целиком
		marks.set(root, {
			indicator,
			icon: hasSlot('indicator-icon')
				? null
				: roleIconOf(ownerDocument, 'menu.indicator', 'check'),
		})

		return {
			slots: {
				'indicator-icon': { mode: 'append', node: indicator },
				leading: { mode: 'append', node: icon },
				default: { mode: 'append', node: row, slot: DEFAULT_SLOT },
				trailing: { mode: 'append', node: shortcut },
			},
			control: row,
		}
	},

	bindings: [
		...rowBindings(DEFAULT_SLOT),

		bind('size', ({ root, state }) => iconSize(marks.get(root)?.icon ?? null, state.size)),

		// Отметка — у отмеченного: своя иконка или слот `indicator-icon`
		bind('selected', ({ root, state, showSlot }) => {
			const own = marks.get(root)
			const selected = state.selected === true

			showSlot('indicator-icon', selected)

			if (own) placeMark(own.indicator, own.icon, selected)
		}),
	],
}
