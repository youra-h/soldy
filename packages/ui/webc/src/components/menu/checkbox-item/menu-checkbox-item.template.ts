/**
 * Шаблон флажка меню: строка пункта (`row.ts`) с отметкой в начале. Обёртка
 * отметки есть и у неотмеченного: она держит колонку, и по ней тема узнаёт, что
 * у меню есть колонка отметок.
 */

import type { IMenuCheckboxItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import { bind, lend, type ITemplate } from '../../../adapter'
import type { TIconElementProps } from '../../icon'
import { createRow, iconSize, partOf, placeMark, roleIconOf, rowBindings } from '../row'

/** Со слотом `indicator-icon` своей иконки нет — `null`. */
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

		// Scope у слотов нет: слот `indicator-icon` выводится только у отмеченного
		bind('selected', ({ root, state, showSlot }) => {
			const own = marks.get(root)
			const selected = state.selected === true

			showSlot('indicator-icon', selected)

			if (own) placeMark(own.indicator, own.icon, selected)
		}),
	],
}
