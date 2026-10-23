/**
 * Шаблон пункта меню — действия, как `Menu.Item` у Vue.
 *
 * Корень — сам `<div is="so-menu-item">`: классы (размер меню и свой вариант),
 * `attrs` и `dataset` — состояние для темы (`data-highlighted`,
 * `data-disabled`) — раскладывает на него база (`ElementBase`), и строка
 * красится от него: носитель `dataset` один. Здесь — строка, как у Vue.
 *
 * - Строка — Button на `div` (`menu.row`, см. `row.ts`). Нажатие — действие:
 *   решает меню (`adapters.menu.choose()`) — выключенному отказывает, а
 *   доступный выполняет, закрывается и сообщает `choose`.
 * - Значок — слот `leading` в обёртке `span.so-menu-item__icon` у начала
 *   строки: обёртка есть у каждого пункта — пустая места не занимает, а если
 *   значок есть хоть у одного пункта меню, держит его колонку.
 * - Текст — слот `default`, без него — текст пункта (`text`).
 * - Подсказка сочетания клавиш (`Ctrl+S`) — слот `trailing` в обёртке
 *   `span.so-menu-item__shortcut` у конца строки; пустая места не занимает.
 *
 * Scope у слотов нет, как у всех слотов Web Components: текст пункта
 * содержимое слота берёт у элемента (`el.ctrl`).
 */

import type { IMenuItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import { lend, type ITemplate } from '../../../adapter'
import { createRow, partOf, rowBindings } from '../row'

export const menuItemTemplate: ITemplate<IMenuItem, TMenuItemCollectionFacade> = {
	create: (root, _hasSlot, ctx) => {
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
