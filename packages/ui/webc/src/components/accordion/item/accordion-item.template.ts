/**
 * Шаблон секции Accordion: заголовок — деталь Button (поле корня, слоты
 * секции — его свет), панель под ним со слотом `default`.
 * docs/architecture.md, Layer 8d, «Коллекция».
 */

import type { IAccordionItem, TAccordionItemCollectionFacade } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import {
	bind,
	createDetail,
	lend,
	ownerAttributes,
	type ITemplate,
	type TLendAt,
	patch,
} from '../../../adapter'
import { TButtonElement, type TButtonElementProps } from '../../button'
import { TIconElement, type TIconElementProps } from '../../icon'

/**
 * Класс стрелки — на обёртке, а не на иконке: тема поворачивает по ней и
 * иконку из слота; обёртку она ждёт ребёнком заголовка.
 */
type TArrow = {
	readonly wrapper: HTMLElement
	readonly icon: TIconElementProps | null
}

type TSectionParts = {
	readonly header: TButtonElementProps
	readonly start: TArrow
	readonly end: TArrow
	readonly content: HTMLElement
}

const parts = new WeakMap<HTMLElement, TSectionParts>()

function arrowOf(owner: Document, slotted: boolean): TArrow {
	const wrapper = owner.createElement('span')

	wrapper.className = 'so-accordion-item__arrow'

	if (slotted) return { wrapper, icon: null }

	const icon = createDetail(owner, TIconElement, { embedded: 'accordion.arrow' })

	icon.icon = 'arrowRight'
	wrapper.appendChild(icon)

	return { wrapper, icon }
}

/** `lend`: до сборки заголовка — в его слот, после — его краем, то есть туда же. */
function edge(
	header: TButtonElementProps,
	arrow: TArrow,
	shown: boolean,
	slot: string,
	at: TLendAt,
): void {
	if (!shown) {
		arrow.wrapper.remove()

		return
	}

	if (arrow.wrapper.parentNode !== header) lend(header, slot, arrow.wrapper, at)
}

export const accordionItemTemplate: ITemplate<IAccordionItem, TAccordionItemCollectionFacade> = {
	create: (root, ctx) => {
		const { hasSlot } = ctx

		const { ownerDocument } = root
		const header = createDetail(ownerDocument, TButtonElement, {
			embedded: 'accordion.header',
			attributes: { type: 'button' },
		})
		const start = arrowOf(ownerDocument, hasSlot('leading-icon'))
		const end = arrowOf(ownerDocument, hasSlot('trailing-icon'))
		const body = ownerDocument.createElement('div')
		const content = ownerDocument.createElement('div')

		header.className = 'so-accordion-item__header'
		body.className = 'so-accordion-item__body'
		content.className = 'so-accordion-item__content'
		body.appendChild(content)

		header.addEventListener('click', () => {
			ctx.facade?.context?.adapters.selection.toggle()
		})

		root.append(header, body)
		parts.set(root, { header, start, end, content })

		return {
			slots: {
				'leading-icon': { mode: 'append', node: start.wrapper },
				leading: { mode: 'append', node: header, slot: 'leading' },
				header: { mode: 'append', node: header, slot: DEFAULT_SLOT },
				trailing: { mode: 'append', node: header, slot: 'trailing' },
				'trailing-icon': { mode: 'append', node: end.wrapper },
				default: { mode: 'append', node: content },
			},
			control: header,
		}
	},

	bindings: [
		// Только сменившееся: `disabled` кнопки нативный, и запись прошла бы через атрибут
		bind(['view', 'disabled', 'size', 'variant'], ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			const { header, start, end } = own
			const disabled = state.disabled === true

			patch(header, { view: state.view, disabled, size: state.size, variant: state.variant })

			for (const { icon } of [start, end]) {
				if (icon && icon.size !== state.size) icon.size = state.size
			}
		}),

		bind('aria', ({ root, state }) => {
			const header = parts.get(root)?.header

			if (header) ownerAttributes(header, state.aria)
		}),

		bind('contentAria', ({ root, state }) => {
			const content = parts.get(root)?.content

			if (content) ownerAttributes(content, state.contentAria)
		}),

		bind('text', ({ root, state, hasSlot }) => {
			const header = parts.get(root)?.header
			const text = state.text ?? ''

			if (header && !hasSlot('header') && header.text !== text) header.text = text
		}),

		bind('arrowPlacement', ({ root, state, hasSlot }) => {
			const own = parts.get(root)

			if (!own) return

			const { header, start, end } = own
			const placement = state.arrowPlacement

			edge(
				header,
				start,
				hasSlot('leading-icon') || placement === 'start',
				'leading',
				'start',
			)
			edge(header, end, hasSlot('trailing-icon') || placement === 'end', 'trailing', 'end')
		}),
	],
}
