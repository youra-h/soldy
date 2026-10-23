/**
 * Шаблон Popover: триггер в слоте `trigger`, панель — деталь Frame с полосой
 * жеста, содержимым и крестиком; открытие и закрытие — плагины поповера.
 * docs/architecture.md, Layer 8d, «Панель у триггера».
 */

import type { IPopover } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import { bind, createDetail, lend, ownerAttributes, type ITemplate, patch } from '../../adapter'
import { lendRoleIcon } from '../common/icon-button'
import { TButtonElement, type TButtonElementProps } from '../button'
import { TFrameElement, type TFrameElementProps } from '../frame'
import type { TPopoverOutputs } from './setup.component'

type TPopoverParts = {
	readonly panel: TFrameElementProps
	readonly handle: HTMLElement
	readonly close: TButtonElementProps
}

const parts = new WeakMap<HTMLElement, TPopoverParts>()

/** Триггер — первый элемент слота: текст вокруг него набора не несёт. */
function triggerOf(nodes: readonly ChildNode[]): Element | undefined {
	return nodes.find((node): node is Element => node instanceof Element)
}

export const popoverTemplate: ITemplate<IPopover, unknown, TPopoverOutputs> = {
	create: (root, ctx) => {
		const { hasSlot } = ctx

		const { ownerDocument } = root
		// `tabindex="-1"`: фокус встаёт на панель, когда внутри нечего фокусировать
		const panel = createDetail(ownerDocument, TFrameElement, {
			embedded: 'popover.frame',
			attributes: { tabindex: '-1' },
		})
		const handle = ownerDocument.createElement('div')
		const content = ownerDocument.createElement('div')
		const close = createDetail(ownerDocument, TButtonElement, {
			embedded: 'popover.close',
			attributes: { type: 'button' },
		})

		panel.className = 'so-popover__panel'
		panel.position = 'fixed'
		panel.anchor_anchor = root
		panel.anchor_offset = 8
		handle.className = 'so-popover__handle'
		handle.setAttribute('aria-hidden', 'true')
		content.className = 'so-popover__content'
		close.className = 'so-popover__close'

		if (!hasSlot('close-icon')) {
			lendRoleIcon(close, 'close', 'popover.close-icon')
		}

		// Только закрыть: куда вернуть фокус, решает плагин фокуса
		close.addEventListener('click', () => {
			const popover = ctx.ctrl

			if (popover) popover.open = false
		})

		// Панель в корень последней: всё входит в документ одной вставкой и собирается один раз
		lend(panel, DEFAULT_SLOT, content)
		lend(panel, DEFAULT_SLOT, close)
		root.appendChild(panel)
		parts.set(root, { panel, handle, close })

		return {
			slots: {
				// Триггер в корне: нажатие по нему — внутри владельца, и панель не мигает
				trigger: { mode: 'before', node: panel },
				default: { mode: 'append', node: content },
				'close-icon': { mode: 'append', node: close, slot: DEFAULT_SLOT },
			},
		}
	},

	bindings: [
		// `rendered` панели не пишется: увезённую панель прячет база Frame по признаку поддерева
		bind(['open', 'contained', 'placement'], ({ root, state }) => {
			const panel = parts.get(root)?.panel

			if (!panel) return

			const visible = state.open === true
			const contained = state.contained === true

			patch(panel, { visible, contained, anchor_placement: state.placement })
		}),

		bind(['aria', 'panelDataset', 'dismiss_ownerAttribute'], ({ root, state }) => {
			const panel = parts.get(root)?.panel

			if (panel) {
				ownerAttributes(panel, {
					...state.aria,
					...state.panelDataset,
					...state.dismiss_ownerAttribute,
				})
			}
		}),

		// Scope у слота нет, связку триггеру кладёт шаблон — одним слоем: два затёрли бы друг друга
		bind(['triggerAria', 'triggerDataset'], ({ state, slotted }) => {
			const trigger = triggerOf(slotted('trigger'))

			if (trigger) ownerAttributes(trigger, { ...state.triggerAria, ...state.triggerDataset })
		}),

		bind('handleRendered', ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			const { panel, handle } = own

			if (state.handleRendered !== true) {
				handle.remove()
			} else if (handle.parentNode !== panel) {
				lend(panel, DEFAULT_SLOT, handle, 'start')
			}
		}),

		// Крестик последним: фокус при открытии встаёт в содержимое, крестик — последняя остановка Tab
		bind(['closable', 'closeAria'], ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			const { panel, close } = own

			ownerAttributes(close, state.closeAria)

			if (state.closable !== true) {
				close.remove()
			} else if (close.parentNode !== panel) {
				lend(panel, DEFAULT_SLOT, close)
			}
		}),

		// `lazyMount`: до первого открытия содержимое вне документа и не собирается
		bind('contentRendered', ({ state, showSlot }) => {
			showSlot(DEFAULT_SLOT, state.contentRendered === true)
		}),
	],
}
