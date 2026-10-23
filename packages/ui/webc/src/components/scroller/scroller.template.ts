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
import { bind, createDetail, lend, ownerAttributes, type ITemplate } from '../../adapter'
import { TButtonElement, type TButtonElementProps } from '../button'
import { TIconElement, type TIconElementProps } from '../icon'

/** Кнопка и её иконка; иконки нет, когда задан слот значка. */
type TArrow = {
	readonly button: TButtonElementProps
	readonly icon: TIconElementProps | null
}

/** Как построить кнопку: имена мест, класс и слот значка. */
type TArrowSpec = {
	/** Имя места кнопки (`embedded`). */
	readonly embedded: string
	/** Имя места иконки значка. */
	readonly iconEmbedded: string
	/** Класс кнопки: по нему кнопку находит плагин вьюпорта. */
	readonly className: string
	/** Слот значка: заданный заменяет иконку целиком. */
	readonly slot: string
}

const PREV: TArrowSpec = {
	embedded: 'scroller.prev',
	iconEmbedded: 'scroller.prev-icon',
	className: 'so-scroller__prev',
	slot: 'prev-icon',
}

const NEXT: TArrowSpec = {
	embedded: 'scroller.next',
	iconEmbedded: 'scroller.next-icon',
	className: 'so-scroller__next',
	slot: 'next-icon',
}

/** Части ленты — одни на всё время жизни элемента. */
type TScrollerParts = {
	readonly prev: TArrow
	readonly next: TArrow
	readonly viewport: HTMLElement
}

const parts = new WeakMap<HTMLElement, TScrollerParts>()

function isButton(node: Element): node is TButtonElementProps {
	return node instanceof TButtonElement
}

function isIcon(node: Element): node is TIconElementProps {
	return node instanceof TIconElement
}

/** Кнопка — деталь разметки. Своя иконка — только без слота значка. */
function arrowOf(owner: Document, spec: TArrowSpec, slotted: boolean): TArrow {
	const button = createDetail(
		owner,
		'button',
		{ is: 'so-button', embedded: spec.embedded, attributes: { type: 'button' } },
		isButton,
	)

	button.className = spec.className

	if (slotted) return { button, icon: null }

	const icon = createDetail(owner, 'span', { is: 'so-icon', embedded: spec.iconEmbedded }, isIcon)

	// Одна роль на обе кнопки: роли «влево» в контракте иконок нет, и ту
	// стрелку, что смотрит в начало строки, зеркалит тема
	icon.icon = 'arrowRight'
	lend(button, DEFAULT_SLOT, icon)

	return { button, icon }
}

/** Пропсы кнопки и её иконки — только сменившиеся: `disabled` кнопки нативный. */
function syncArrow(arrow: TArrow, size: TButtonElementProps['size'], disabled: boolean): void {
	const { button, icon } = arrow

	if (button.size !== size) button.size = size
	if (button.disabled !== disabled) button.disabled = disabled
	if (icon && icon.size !== size) icon.size = size
}

export const scrollerTemplate: ITemplate<IScroller> = {
	create: (root, { hasSlot }) => {
		const { ownerDocument } = root
		const prev = arrowOf(ownerDocument, PREV, hasSlot(PREV.slot))
		const viewport = ownerDocument.createElement('div')
		const next = arrowOf(ownerDocument, NEXT, hasSlot(NEXT.slot))

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

			syncArrow(own.prev, state.size, state.prevDisabled === true)
			syncArrow(own.next, state.size, state.nextDisabled === true)
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
