/**
 * Шаблон Scroller.
 *
 * Корень — сам `<div is="so-scroller">`: классы, все три набора ядра (`attrs`
 * с `dir`, `aria`, `dataset` с `data-can-prev` и `data-can-next` — по ним тема
 * гасит подсказку у края и снимает обе кнопки, когда листать нечего) и
 * скрытие раскладывает на него база (`ElementBase`). Здесь — ряд из трёх
 * мест, как у Vue: кнопка «назад», вьюпорт, кнопка «вперёд». Кнопки стоят
 * снаружи вьюпорта намеренно: роль ряда у первого потребителя
 * (`role="listbox"` у тегов) приходит на вьюпорт, а листбокс владеет только
 * опциями — кнопке внутри него места нет.
 *
 * - Кнопки — детали `<button is="so-button" embedded="scroller.prev"
 *   type="button">` (и `scroller.next`) с классами `so-scroller__prev` и
 *   `__next`. Обработчиков у них нет: клики ловит плагин вьюпорта слушателем
 *   на корне и зовёт команды ядра. Размер — ленты, выключенность считает ядро
 *   (`prevDisabled`, `nextDisabled`: выключена лента или упёрлись в край),
 *   имя от локали — набор `prevAria` или `nextAria` верхним слоем раскладчика
 *   кнопки. Вида нет: тема красит кнопку по контексту.
 * - Значок кнопки — слот `prev-icon` или `next-icon` в слот по умолчанию её
 *   кнопки, а без слота — иконка роли `arrowRight`
 *   (`<span is="so-icon" embedded="scroller.prev-icon">`) размером ленты, у
 *   обеих кнопок: стрелку «назад» зеркалит тема.
 * - Вьюпорт `div.so-scroller__viewport` — он же ряд: обёртки-дорожки между ним
 *   и содержимым нет. Содержимое — слот по умолчанию, его элементы — прямые
 *   дети вьюпорта: по ним тема ставит точки снапа, а плагин считает края. На
 *   вьюпорте — `tabindex` ленты (`viewportTabIndex`: `0`, когда листать есть
 *   куда, а своих остановок нет) и атрибуты потребителя `viewportAria` поверх:
 *   ряд с roving tabindex сам решает, кому быть остановкой. Слой владельца у
 *   узла один, поэтому оба кладёт одна привязка.
 *
 * Scope у слотов нет, как у всех слотов Web Components: состояние ленты
 * содержимое слота берёт у элемента (`el.ctrl`).
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
