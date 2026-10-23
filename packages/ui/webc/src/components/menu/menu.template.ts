/**
 * Шаблон Menu: триггер — слот `trigger` в корне перед панелью, панель — деталь
 * Frame (`menu.frame`) со списком `div.so-menu__list`. `data-open` на корне —
 * для потребителя, который красит свой триггер по контексту.
 * docs/architecture.md, Layer 8d, «Меню».
 *
 * Триггер в корне: нажатие по открытому триггеру — нажатие внутри владельца, и
 * панель не мигает. `tabindex="-1"` панели — фокус на ней, пока пункт не
 * подсвечен; у списка роли нет: узел с ролью и фокусом один. Открытость —
 * `visible` панели, а не `rendered`: пункты входят в коллекцию при
 * монтировании, и закрытие не должно её вычищать; увезённую панель прячет база
 * Frame — AGENTS.md (Web Components), «Поддерево».
 */

import type { IMenu, TMenuCollectionFacade } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import {
	bind,
	createDetail,
	lend,
	ownerAttributes,
	ownerClasses,
	type ITemplate,
	patch,
} from '../../adapter'
import { TFrameElement, type TFrameElementProps } from '../frame'
import { drawItems, drawItemsIn } from './items'
import type { TMenuOutputs } from './setup.component'

/** Панель каждого меню — одна на всё время жизни элемента. */
const panels = new WeakMap<HTMLElement, TFrameElementProps>()

/** Триггер — первый элемент слота: текст вокруг него набора не несёт. */
function triggerOf(nodes: readonly ChildNode[]): Element | undefined {
	return nodes.find((node): node is Element => node instanceof Element)
}

export const menuTemplate: ITemplate<IMenu, TMenuCollectionFacade, TMenuOutputs> = {
	create: (root, { hasSlot }) => {
		const { ownerDocument } = root
		const panel = createDetail(ownerDocument, TFrameElement, {
			embedded: 'menu.frame',
			attributes: { tabindex: '-1' },
		})
		const list = ownerDocument.createElement('div')

		panel.position = 'fixed'
		panel.anchor_anchor = root
		panel.anchor_offset = 4
		list.className = 'so-menu__list'

		// Сначала список в панель, потом панель в корень: они входят в документ
		// одной вставкой и собираются по одному разу
		lend(panel, DEFAULT_SLOT, list)
		root.appendChild(panel)

		// Пункты разметки — сами пункты меню: петли из данных при них нет
		if (!hasSlot(DEFAULT_SLOT)) drawItemsIn(root, list)

		panels.set(root, panel)

		return {
			slots: {
				trigger: { mode: 'before', node: panel },
				default: { mode: 'append', node: list },
				item: { mode: 'sample' },
				'item-leading': { mode: 'sample' },
				'item-trailing': { mode: 'sample' },
				'item-header': { mode: 'sample' },
				'item-arrow-icon': { mode: 'sample' },
				'item-content': { mode: 'sample' },
			},
		}
	},

	bindings: [
		bind(['open', 'placement', 'point'], ({ root, state }) => {
			const panel = panels.get(root)

			if (!panel) return

			const visible = state.open === true
			const point = state.point ?? null

			patch(panel, { visible, anchor_placement: state.placement, anchor_point: point })
		}),

		// Свой набор классов: модификаторы корня до увезённой панели не доходят
		bind('panelClasses', ({ root, state }) => {
			const panel = panels.get(root)

			if (panel) ownerClasses(panel, state.panelClasses)
		}),

		// Наборы панели — одним слоем владельца, в порядке Vue
		bind(['aria', 'dismiss_ownerAttribute'], ({ root, state }) => {
			const panel = panels.get(root)

			if (panel) ownerAttributes(panel, { ...state.aria, ...state.dismiss_ownerAttribute })
		}),

		// Scope у слотов нет: связку и вид «нажат» триггеру кладёт шаблон
		bind(['triggerAria', 'triggerDataset'], ({ state, slotted }) => {
			const trigger = triggerOf(slotted('trigger'))

			if (trigger) ownerAttributes(trigger, { ...state.triggerAria, ...state.triggerDataset })
		}),

		bind(['sections', 'submenus', 'groupSeparators'], (ctx) => {
			drawItems(
				ctx,
				ctx.state.sections,
				ctx.state.submenus,
				ctx.state.groupSeparators === true,
			)
		}),
	],
}
