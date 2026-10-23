/**
 * Шаблон пункта-действия: строка (`row.ts`) со значком и подсказкой сочетания.
 * Обёртка значка есть у каждого пункта: пустая места не занимает, а значок хоть
 * у одного пункта держит колонку всего меню.
 */

import type { IMenuItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import { lend, type ITemplate } from '../../../adapter'
import { createRow, partOf, rowBindings } from '../row'

export const menuItemTemplate: ITemplate<IMenuItem, TMenuItemCollectionFacade> = {
	create: (root, ctx) => {
		const { ownerDocument } = root
		const row = createRow(root, () => ctx.facade?.context?.adapters.menu.choose())
		const icon = partOf(ownerDocument, 'so-menu-item__icon')
		const shortcut = partOf(ownerDocument, 'so-menu-item__shortcut')

		lend(row, 'leading', icon)
		lend(row, 'trailing', shortcut)

		return {
			slots: {
				leading: { mode: 'append', node: icon },
				default: { mode: 'append', node: row, slot: DEFAULT_SLOT },
				trailing: { mode: 'append', node: shortcut },
			},
			control: row,
		}
	},

	bindings: rowBindings(DEFAULT_SLOT),
}
