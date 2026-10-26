/**
 * Шаблон пункта с подменю: строка (`row.ts`) со значком и стрелкой, панель —
 * деталь Frame (`menu.submenu-frame`) у конца строки (`end-start`) со списком,
 * как у меню. docs/architecture.md, Layer 8d, «Меню».
 *
 * Открытость — `visible` панели, а не `rendered`: пункты входят в коллекцию
 * подменю при монтировании, и закрытие не должно её вычищать; увезённую панель
 * прячет база Frame — AGENTS.md (Web Components), «Поддерево».
 */

import type { IMenuSubmenu, TMenuCollectionFacade, TMenuItemCollectionFacade } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import {
	bind,
	createDetail,
	lend,
	ownerAttributes,
	ownerClasses,
	type ITemplate,
} from '../../../adapter'
import { TFrameElement, type TFrameElementProps } from '../../frame'
import type { TIconElementProps } from '../../icon'
import { drawItems, drawItemsIn } from '../items'
import { createRow, iconSize, partOf, roleIconOf, rowBindings } from '../row'
import type { TMenuSubmenuOutputs } from './setup.component'

/** Части пункта с подменю — одни на всё время жизни элемента. */
type TSubmenuParts = {
	readonly panel: TFrameElementProps
	/** Со слотом `arrow-icon` — `null`. */
	readonly arrow: TIconElementProps | null
}

const parts = new WeakMap<HTMLElement, TSubmenuParts>()

export const menuSubmenuTemplate: ITemplate<
	IMenuSubmenu,
	TMenuItemCollectionFacade,
	TMenuSubmenuOutputs,
	TMenuCollectionFacade
> = {
	create: (root, ctx) => {
		const { hasSlot } = ctx

		const { ownerDocument } = root
		const row = createRow(root, () => ctx.facade?.context?.adapters.menu.open())
		const icon = partOf(ownerDocument, 'so-menu-item__icon')
		const arrowPart = partOf(ownerDocument, 'so-menu-item__arrow', true)
		const arrow = hasSlot('arrow-icon')
			? null
			: roleIconOf(ownerDocument, 'menu.arrow', 'arrowRight')
		const panel = createDetail(ownerDocument, TFrameElement, {
			embedded: 'menu.submenu-frame',
			attributes: { tabindex: '-1' },
		})
		const list = ownerDocument.createElement('div')

		if (arrow) arrowPart.appendChild(arrow)

		panel.position = 'fixed'
		panel.anchor_anchor = root
		panel.anchor_placement = 'end-start'
		list.className = 'so-menu__list'

		lend(row, 'leading', icon)
		lend(row, 'trailing', arrowPart)
		// Сначала список в панель, потом панель в корень: они входят в документ
		// одной вставкой и собираются по одному разу
		lend(panel, DEFAULT_SLOT, list)
		root.appendChild(panel)

		// Пункты разметки — сами пункты подменю: петли из данных при них нет
		if (!hasSlot(DEFAULT_SLOT)) drawItemsIn(root, list)

		parts.set(root, { panel, arrow })

		return {
			slots: {
				leading: { mode: 'append', node: icon },
				header: { mode: 'append', node: row, slot: DEFAULT_SLOT },
				'arrow-icon': { mode: 'append', node: arrowPart },
				default: { mode: 'append', node: list },
				item: { mode: 'sample' },
				'item-leading': { mode: 'sample' },
				'item-trailing': { mode: 'sample' },
				'item-header': { mode: 'sample' },
				'item-arrow-icon': { mode: 'sample' },
				'item-content': { mode: 'sample' },
			},
			control: row,
		}
	},

	bindings: [
		...rowBindings('header'),

		bind('size', ({ root, state }) => iconSize(parts.get(root)?.arrow ?? null, state.size)),

		bind('open', ({ root, state }) => {
			const panel = parts.get(root)?.panel
			const visible = state.open === true

			if (panel && panel.visible !== visible) panel.visible = visible
		}),

		// Свой набор классов: модификаторы корня до увезённой панели не доходят
		bind('panelClasses', ({ root, state }) => {
			const panel = parts.get(root)?.panel

			if (panel) ownerClasses(panel, state.panelClasses)
		}),

		// Наборы панели — одним слоем владельца, в порядке Vue
		bind(['panelAria', 'dismiss_ownerAttribute'], ({ root, state }) => {
			const panel = parts.get(root)?.panel

			if (panel)
				ownerAttributes(panel, { ...state.panelAria, ...state.dismiss_ownerAttribute })
		}),

		// Items from the panel's first opening on (`contentRendered`): markup
		// items stay out of the document and are not assembled until then
		bind('contentRendered', ({ state, showSlot }) => {
			showSlot(DEFAULT_SLOT, state.contentRendered === true)
		}),

		// Items from data — likewise drawn from the first opening on
		bind(['sections', 'submenus', 'groupSeparators', 'contentRendered'], (ctx) => {
			if (ctx.state.contentRendered !== true) return

			drawItems(
				ctx,
				ctx.state.sections,
				ctx.state.submenus,
				ctx.state.groupSeparators === true,
			)
		}),
	],
}
