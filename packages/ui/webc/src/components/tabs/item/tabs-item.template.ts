/**
 * Шаблон таба: строка — деталь Button с ARIA таба; закрытие — её сосед, а не часть:
 * интерактивный потомок у `role="tab"` HTML запрещает, а подпись крестика вошла бы
 * в имя таба. `view` частям не пишется — их красит тема по контексту.
 */

import type { ITabsItem, TTabsItemCollectionFacade } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import { bind, createDetail, lend, ownerAttributes, type ITemplate, patch } from '../../../adapter'
import { TButtonElement, type TButtonElementProps } from '../../button'
import { TIconElement, type TIconElementProps } from '../../icon'

type TTabParts = {
	readonly row: TButtonElementProps
	readonly close: TButtonElementProps
	readonly icon: TIconElementProps | null
}

const parts = new WeakMap<HTMLElement, TTabParts>()

export const tabsItemTemplate: ITemplate<ITabsItem, TTabsItemCollectionFacade> = {
	create: (root, ctx) => {
		const { hasSlot } = ctx

		const { ownerDocument } = root
		const row = createDetail(ownerDocument, TButtonElement, {
			embedded: 'tabs.row',
			attributes: { type: 'button' },
		})
		const close = createDetail(ownerDocument, TButtonElement, {
			embedded: 'tabs.close',
			attributes: { type: 'button' },
		})

		close.className = 'so-tabs-item__close'

		let icon: TIconElementProps | null = null

		if (!hasSlot('close-icon')) {
			icon = createDetail(ownerDocument, TIconElement, { embedded: 'tabs.close-icon' })
			icon.icon = 'close'
			lend(close, DEFAULT_SLOT, icon)
		}

		row.addEventListener('click', () => {
			const context = ctx.facade?.context

			if (context) context.adapters.activation.active = true
		})

		close.addEventListener('click', (event) => {
			// Как `@click.stop` у Vue: всплывший клик дал бы корням таба и набора `action:press`
			event.stopPropagation()
			ctx.facade?.context?.adapters.tabs.close()
		})

		root.appendChild(row)
		parts.set(root, { row, close, icon })

		return {
			slots: {
				leading: { mode: 'append', node: row, slot: 'leading' },
				default: { mode: 'append', node: row, slot: DEFAULT_SLOT },
				trailing: { mode: 'append', node: row, slot: 'trailing' },
				'close-icon': { mode: 'append', node: close, slot: DEFAULT_SLOT },
			},
			control: row,
		}
	},

	bindings: [
		bind(['disabled', 'size', 'variant'], ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			const { row, close, icon } = own
			const disabled = state.disabled === true

			patch(row, { disabled, size: state.size, variant: state.variant })
			patch(close, { disabled, size: state.size })
			if (icon && icon.size !== state.size) icon.size = state.size
		}),

		bind('aria', ({ root, state }) => {
			const row = parts.get(root)?.row

			if (row) ownerAttributes(row, state.aria)
		}),

		bind('text', ({ root, state, hasSlot }) => {
			const row = parts.get(root)?.row
			const text = state.text ?? ''

			if (row && !hasSlot(DEFAULT_SLOT) && row.text !== text) row.text = text
		}),

		bind(['tab_closable', 'closeAria'], ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			const { row, close } = own

			ownerAttributes(close, state.closeAria)

			if (state.tab_closable !== true) {
				close.remove()
			} else if (close.previousSibling !== row) {
				row.after(close)
			}
		}),
	],
}
