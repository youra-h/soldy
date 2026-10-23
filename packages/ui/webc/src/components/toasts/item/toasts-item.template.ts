/**
 * Шаблон тоста: корень — место в списке, в нём плашка `so-toasts-item__card`
 * (место схлопывается переходом высоты, плашка размера не меняет) с коробкой
 * значка, текстом и крестиком-деталью. Пустую часть текста тема сворачивает по
 * `:empty`.
 */

import type { IToastsItem, TToastsItemCollectionFacade, TToastsItemType } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import {
	bind,
	createDetail,
	isToastRender,
	ownerAttributes,
	ownerStyles,
	type ITemplate,
	patch,
} from '../../../adapter'
import { lendRoleIcon } from '../../common/icon-button'
import { TButtonElement, type TButtonElementProps } from '../../button'
import { TIconElement, type TIconElementProps } from '../../icon'
import { TProgressSpinnerElement, type TProgressSpinnerElementProps } from '../../progress-spinner'

/** Роль на каждый вид: в принудительных цветах вид различает только глиф. */
const TYPE_ICONS = {
	info: 'info',
	success: 'success',
	warning: 'warning',
	error: 'error',
} satisfies Record<TToastsItemType, string>

const NOTIFICATION_ICON = 'notification'

type TToastParts = {
	readonly card: HTMLElement
	readonly box: HTMLElement
	readonly spinner: TProgressSpinnerElementProps
	/** `null`, когда задан слот `icon`. */
	readonly glyph: TIconElementProps | null
	readonly text: HTMLElement
	readonly description: HTMLElement
	readonly content: HTMLElement
	readonly close: TButtonElementProps
}

const parts = new WeakMap<HTMLElement, TToastParts>()

function toggleIn(box: HTMLElement, node: HTMLElement | null, shown: boolean): void {
	if (!node) return

	if (!shown) {
		node.remove()
	} else if (node.parentNode !== box) {
		box.appendChild(node)
	}
}

export const toastsItemTemplate: ITemplate<IToastsItem, TToastsItemCollectionFacade> = {
	create: (root, ctx) => {
		const { hasSlot } = ctx

		const { ownerDocument } = root
		const card = ownerDocument.createElement('div')
		const box = ownerDocument.createElement('span')
		const body = ownerDocument.createElement('div')
		const text = ownerDocument.createElement('div')
		const description = ownerDocument.createElement('div')
		const content = ownerDocument.createElement('div')
		const spinner = createDetail(ownerDocument, TProgressSpinnerElement, {
			embedded: 'toasts.spinner',
		})
		const close = createDetail(ownerDocument, TButtonElement, {
			embedded: 'toasts.close',
			attributes: { type: 'button' },
		})

		card.className = 'so-toasts-item__card'
		box.className = 'so-toasts-item__icon'
		box.setAttribute('aria-hidden', 'true')
		body.className = 'so-toasts-item__body'
		text.className = 'so-toasts-item__text'
		description.className = 'so-toasts-item__description'
		content.className = 'so-toasts-item__content'
		close.className = 'so-toasts-item__close'

		// Размер и вариант кольцу не задаются: диаметр и цвет даёт тема по коробке значка
		spinner.indeterminate = true

		const glyph = hasSlot('icon')
			? null
			: createDetail(ownerDocument, TIconElement, { embedded: 'toasts.icon' })

		if (!hasSlot('close-icon')) {
			lendRoleIcon(close, 'close', 'toasts.close-icon')
		}

		close.addEventListener('click', () => ctx.ctrl?.close())

		body.append(text, description, content)
		card.append(box, body, close)
		root.appendChild(card)
		parts.set(root, { card, box, spinner, glyph, text, description, content, close })

		return {
			slots: {
				icon: { mode: 'append', node: box },
				default: { mode: 'append', node: text },
				content: { mode: 'append', node: content },
				'close-icon': { mode: 'append', node: close, slot: DEFAULT_SLOT },
			},
		}
	},

	bindings: [
		bind('order', ({ root, state }) => {
			ownerStyles(
				root,
				typeof state.order === 'number' ? { '--so-toasts-depth': state.order } : undefined,
			)
		}),

		// Раньше `loading`: значок встаёт в коробку уже со своей ролью
		bind('type', ({ root, state }) => {
			const glyph = parts.get(root)?.glyph

			if (!glyph) return

			const role = state.type ? TYPE_ICONS[state.type] : NOTIFICATION_ICON

			patch(glyph, { icon: role })
		}),

		bind('loading', ({ root, state, showSlot }) => {
			const own = parts.get(root)

			if (!own) return

			const loading = state.loading === true

			showSlot('icon', !loading)
			toggleIn(own.box, own.spinner, loading)
			toggleIn(own.box, own.glyph, !loading)
		}),

		bind('text', ({ root, state, hasSlot }) => {
			const text = parts.get(root)?.text
			const value = state.text ?? ''

			if (text && !hasSlot(DEFAULT_SLOT) && text.textContent !== value) {
				text.textContent = value
			}
		}),

		bind('description', ({ root, state }) => {
			const description = parts.get(root)?.description
			const value = state.description ?? ''

			if (description && description.textContent !== value) description.textContent = value
		}),

		bind('render', ({ root, state, ctrl, hasSlot }) => {
			const content = parts.get(root)?.content

			if (!content || hasSlot('content')) return

			const render = state.render

			content.replaceChildren(...(ctrl && isToastRender(render) ? [render(ctrl)] : []))
		}),

		// Крестик — последним в плашке
		bind(['closable', 'closeAria'], ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			ownerAttributes(own.close, state.closeAria)

			if (state.closable !== true) {
				own.close.remove()
			} else if (own.close.parentNode !== own.card) {
				own.card.appendChild(own.close)
			}
		}),
	],
}
