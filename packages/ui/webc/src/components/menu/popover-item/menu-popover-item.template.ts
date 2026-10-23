/**
 * Шаблон пункта с панелью: строка (`row.ts`) со значком и стрелкой, панель —
 * деталь Frame (`menu.popover-item-frame`) у конца строки (`end-start`) с
 * обёрткой содержимого `div.so-menu-item__content`.
 * docs/architecture.md, Layer 8d, «Меню».
 *
 * Модификаторов размера и варианта у панели нет: содержимое красится само.
 * Открытость — `visible` панели; увезённую панель прячет база Frame —
 * AGENTS.md (Web Components), «Поддерево».
 */

import type { IMenuPopoverItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import { bind, createDetail, lend, ownerAttributes, type ITemplate } from '../../../adapter'
import { TFrameElement, type TFrameElementProps } from '../../frame'
import type { TIconElementProps } from '../../icon'
import { createRow, iconSize, partOf, roleIconOf, rowBindings } from '../row'
import type { TMenuPopoverItemOutputs } from './setup.component'

/** Части пункта с панелью — одни на всё время жизни элемента. */
type TPopoverItemParts = {
	readonly panel: TFrameElementProps
	/** Со слотом `arrow-icon` — `null`. */
	readonly arrow: TIconElementProps | null
}

const parts = new WeakMap<HTMLElement, TPopoverItemParts>()

export const menuPopoverItemTemplate: ITemplate<
	IMenuPopoverItem,
	TMenuItemCollectionFacade,
	TMenuPopoverItemOutputs
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
			embedded: 'menu.popover-item-frame',
			attributes: { tabindex: '-1' },
		})
		const content = ownerDocument.createElement('div')

		if (arrow) arrowPart.appendChild(arrow)

		panel.className = 'so-menu-item__panel'
		panel.position = 'fixed'
		panel.anchor_anchor = root
		panel.anchor_placement = 'end-start'
		content.className = 'so-menu-item__content'

		lend(row, 'leading', icon)
		lend(row, 'trailing', arrowPart)
		// Сначала обёртка содержимого в панель, потом панель в корень: они входят
		// в документ одной вставкой и собираются по одному разу
		lend(panel, DEFAULT_SLOT, content)
		root.appendChild(panel)
		parts.set(root, { panel, arrow })

		return {
			slots: {
				leading: { mode: 'append', node: icon },
				header: { mode: 'append', node: row, slot: DEFAULT_SLOT },
				'arrow-icon': { mode: 'append', node: arrowPart },
				default: { mode: 'append', node: content },
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

		// Наборы панели — одним слоем владельца, в порядке Vue
		bind(['panelAria', 'dismiss_ownerAttribute'], ({ root, state }) => {
			const panel = parts.get(root)?.panel

			if (panel)
				ownerAttributes(panel, { ...state.panelAria, ...state.dismiss_ownerAttribute })
		}),

		// `lazyMount` — только на слот: обёртка остаётся, а содержимое до первого
		// открытия вне документа, и элементы soldy в нём не собираются
		bind('contentRendered', ({ state, showSlot }) => {
			showSlot(DEFAULT_SLOT, state.contentRendered === true)
		}),
	],
}
