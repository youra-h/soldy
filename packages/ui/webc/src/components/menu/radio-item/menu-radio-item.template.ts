/**
 * Шаблон переключателя меню: строка пункта (`row.ts`) с отметкой-точкой темы в
 * начале. Обёртка отметки есть и у неотмеченного: она держит колонку.
 */

import type { IMenuRadioItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import { bind, lend, type ITemplate } from '../../../adapter'
import { createRow, partOf, placeMark, rowBindings } from '../row'

/** Со слотом `indicator-icon` своей точки нет — `null`. */
type TMark = {
	readonly indicator: HTMLElement
	readonly dot: HTMLElement | null
}

const marks = new WeakMap<HTMLElement, TMark>()

export const menuRadioItemTemplate: ITemplate<IMenuRadioItem, TMenuItemCollectionFacade> = {
	create: (root, ctx) => {
		const { hasSlot } = ctx

		const { ownerDocument } = root
		const row = createRow(root, () => ctx.facade?.context?.adapters.menu.check())
		const indicator = partOf(ownerDocument, 'so-menu-item__indicator', true)
		const icon = partOf(ownerDocument, 'so-menu-item__icon')
		const shortcut = partOf(ownerDocument, 'so-menu-item__shortcut')

		lend(row, 'leading', indicator)
		lend(row, 'leading', icon)
		lend(row, 'trailing', shortcut)

		marks.set(root, {
			indicator,
			dot: hasSlot('indicator-icon') ? null : partOf(ownerDocument, 'so-menu-item__dot'),
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

		// Scope у слотов нет: слот `indicator-icon` выводится только у отмеченного
		bind('selected', ({ root, state, showSlot }) => {
			const own = marks.get(root)
			const selected = state.selected === true

			showSlot('indicator-icon', selected)

			if (own) placeMark(own.indicator, own.dot, selected)
		}),
	],
}
