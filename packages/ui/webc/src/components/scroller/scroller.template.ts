/**
 * Шаблон Scroller: кнопка «назад», вьюпорт, кнопка «вперёд». Кнопки — снаружи
 * вьюпорта: роль ряда (`role="listbox"` у тегов) приходит на вьюпорт, а кнопке
 * внутри листбокса места нет. Клики кнопок ловит плагин вьюпорта на корне.
 * Элементы содержимого — прямые дети вьюпорта: по ним тема ставит снап.
 */

import type { IScroller } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import { bind, ownerAttributes, type ITemplate } from '../../adapter'
import {
	iconButton,
	syncIconButton,
	type TIconButton,
	type TIconButtonSpec,
} from '../common/icon-button'

/** Как построить кнопку: имена мест, класс и слот значка. */
type TArrowSpec = TIconButtonSpec & {
	/** Слот значка: заданный заменяет иконку целиком. */
	readonly slot: string
}

const PREV: TArrowSpec = {
	embedded: 'scroller.prev',
	iconEmbedded: 'scroller.prev-icon',
	className: 'so-scroller__prev',
	role: 'arrowRight',
	slot: 'prev-icon',
}

const NEXT: TArrowSpec = {
	embedded: 'scroller.next',
	iconEmbedded: 'scroller.next-icon',
	className: 'so-scroller__next',
	role: 'arrowRight',
	slot: 'next-icon',
}

/** Части ленты — одни на всё время жизни элемента. */
type TScrollerParts = {
	readonly prev: TIconButton
	readonly next: TIconButton
	readonly viewport: HTMLElement
}

const parts = new WeakMap<HTMLElement, TScrollerParts>()

export const scrollerTemplate: ITemplate<IScroller> = {
	create: (root, { hasSlot }) => {
		const { ownerDocument } = root
		const prev = iconButton(ownerDocument, PREV, hasSlot(PREV.slot))
		const viewport = ownerDocument.createElement('div')
		const next = iconButton(ownerDocument, NEXT, hasSlot(NEXT.slot))

		viewport.className = 'so-scroller__viewport'
		root.append(prev.button, viewport, next.button)
		parts.set(root, { prev, next, viewport })

		return {
			// Содержимое — прямо во вьюпорт, значки — в слот по умолчанию своей кнопки
			slots: {
				default: { mode: 'append', node: viewport },
				'prev-icon': { mode: 'append', node: prev.button, slot: DEFAULT_SLOT },
				'next-icon': { mode: 'append', node: next.button, slot: DEFAULT_SLOT },
			},
		}
	},

	bindings: [
		bind(['size', 'prevDisabled', 'nextDisabled'], ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			syncIconButton(own.prev, state.size, state.prevDisabled === true)
			syncIconButton(own.next, state.size, state.nextDisabled === true)
		}),

		bind('prevAria', ({ root, state }) => {
			const button = parts.get(root)?.prev.button

			if (button) ownerAttributes(button, state.prevAria)
		}),

		bind('nextAria', ({ root, state }) => {
			const button = parts.get(root)?.next.button

			if (button) ownerAttributes(button, state.nextAria)
		}),

		// `tabindex` ленты, поверх — атрибуты потребителя: одним слоем владельца
		bind(['viewportTabIndex', 'viewportAria'], ({ root, state }) => {
			const viewport = parts.get(root)?.viewport
			const tabindex =
				state.viewportTabIndex === undefined ? null : String(state.viewportTabIndex)

			if (viewport) ownerAttributes(viewport, { tabindex, ...state.viewportAria })
		}),
	],
}
