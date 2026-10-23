/**
 * Шаблон Tooltip: триггер (слот `trigger`), панель-деталь Frame с обёрткой текста
 * — она держит ширину панели по тексту. `triggerAria` лежит на триггере всегда:
 * панель в документе с первой отрисовки, и описание не запаздывает за фокусом.
 * `rendered` панели не пишется: увезённую прячет база Frame по поддереву
 * (AGENTS.md (Web Components), «Поддерево»).
 */

import type { ITooltip } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import { bind, createDetail, lend, ownerAttributes, type ITemplate, patch } from '../../adapter'
import { TFrameElement, type TFrameElementProps } from '../frame'
import type { TTooltipOutputs } from './setup.component'

/** Панель подсказки каждого элемента — одна на всё время его жизни. */
const panels = new WeakMap<HTMLElement, TFrameElementProps>()

/** Триггер — первый элемент слота: текст вокруг него ссылки не несёт. */
function triggerOf(nodes: readonly ChildNode[]): Element | undefined {
	return nodes.find((node): node is Element => node instanceof Element)
}

export const tooltipTemplate: ITemplate<ITooltip, unknown, TTooltipOutputs> = {
	create: (root) => {
		const { ownerDocument } = root
		const panel = createDetail(ownerDocument, TFrameElement, { embedded: 'tooltip.frame' })
		const content = ownerDocument.createElement('div')

		panel.className = 'so-tooltip__panel'
		panel.position = 'fixed'
		panel.anchor_anchor = root
		panel.anchor_offset = 6
		content.className = 'so-tooltip__content'

		// Сначала обёртка в панель, потом панель в корень: одной вставкой
		lend(panel, DEFAULT_SLOT, content)
		root.appendChild(panel)
		panels.set(root, panel)

		return {
			slots: {
				trigger: { mode: 'before', node: panel },
				default: { mode: 'append', node: content },
			},
		}
	},

	bindings: [
		// Пропсы панели — только сменившиеся
		bind(['open', 'placement'], ({ root, state }) => {
			const panel = panels.get(root)

			if (!panel) return

			const visible = state.open === true

			patch(panel, { visible, anchor_placement: state.placement })
		}),

		// Наборы панели — одним слоем владельца
		bind(['aria', 'dismiss_ownerAttribute'], ({ root, state }) => {
			const panel = panels.get(root)

			if (panel) ownerAttributes(panel, { ...state.aria, ...state.dismiss_ownerAttribute })
		}),

		// Ссылка на панель — триггеру, слоем владельца
		bind('triggerAria', ({ state, slotted }) => {
			const trigger = triggerOf(slotted('trigger'))

			if (trigger) ownerAttributes(trigger, state.triggerAria)
		}),
	],
}
