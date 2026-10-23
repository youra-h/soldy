/**
 * Шаблон таба.
 *
 * Корень — сам `<div is="so-tabs-item">`: классы, `attrs`, `dataset` (тема
 * красит активный таб по `data-selected`) и место в коллекции (`order`)
 * раскладывает на него база (`ElementBase`). Здесь — строка и кнопка закрытия
 * рядом с ней, как у Vue.
 *
 * - Строка — деталь `<button is="so-button" embedded="tabs.row" type="button">`,
 *   узел поля корня: на неё база переносит статические атрибуты разметки
 *   таба, а шаблон кладёт `aria` таба верхним слоем её раскладчика — вся ARIA
 *   таба на элементе, который и есть таб: роль, `aria-selected` и остановка Tab
 *   (`tabindex`) от коллекции, связка с панелью (`id`, `aria-controls`). Она
 *   главнее того, что кнопка пишет себе сама. Слоты таба — свет строки: точки
 *   `leading`, `default` и `trailing` ведут в её одноимённые слоты (свет детали),
 *   а без `default` строке уходит текст таба (`text`). Клик по строке делает
 *   таб активным — через контекст элемента фасада текущей связки.
 * - Кнопка закрытия — сосед строки, а не её часть: интерактивный потомок у
 *   `<button role="tab">` HTML запрещает, а подпись крестика вошла бы в имя
 *   таба. Деталь `<button is="so-button" embedded="tabs.close" type="button">`
 *   стоит в табе, только пока его можно закрыть (`tab_closable` фасада), сразу
 *   после строки. Имя ей ядро собирает с текстом таба (`closeAria`), и на
 *   кнопку его кладёт шаблон верхним слоем. Размер и `disabled` — явно: от
 *   строки она их не наследует. Клик закрывает таб и не всплывает, как
 *   `@click.stop` у Vue: корни таба и набора слушают нативный клик
 *   (`TActionPlugin`), и всплывший клик дал бы им `action:press`. В кнопке —
 *   слот `close-icon` или иконка роли `close`,
 *   `<span is="so-icon" embedded="tabs.close-icon">`.
 *
 * У строки и кнопки нет `view`: значения вида объявляет тема, и разметка
 * библиотеки их не знает — обе части тема красит по контексту.
 *
 * Scope у слотов нет, как у всех слотов Web Components: текст и активность
 * содержимое слота берёт у элемента (`el.ctrl`, `el.state.active`).
 */

import type { ITabsItem, TTabsItemCollectionFacade } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import { bind, createDetail, lend, ownerAttributes, type ITemplate } from '../../../adapter'
import { TButtonElement, type TButtonElementProps } from '../../button'
import { TIconElement, type TIconElementProps } from '../../icon'

/** Части таба: строка, кнопка закрытия и иконка в ней — одни на всё время жизни элемента. */
type TTabParts = {
	readonly row: TButtonElementProps
	readonly close: TButtonElementProps
	/** Иконка крестика — без слота `close-icon`. */
	readonly icon: TIconElementProps | null
}

const parts = new WeakMap<HTMLElement, TTabParts>()

function isButton(node: Element): node is TButtonElementProps {
	return node instanceof TButtonElement
}

function isIcon(node: Element): node is TIconElementProps {
	return node instanceof TIconElement
}

export const tabsItemTemplate: ITemplate<ITabsItem, TTabsItemCollectionFacade> = {
	create: (root, ctx) => {
		const { hasSlot } = ctx

		const { ownerDocument } = root
		const row = createDetail(
			ownerDocument,
			'button',
			{ is: 'so-button', embedded: 'tabs.row', attributes: { type: 'button' } },
			isButton,
		)
		const close = createDetail(
			ownerDocument,
			'button',
			{ is: 'so-button', embedded: 'tabs.close', attributes: { type: 'button' } },
			isButton,
		)

		close.className = 'so-tabs-item__close'

		// Своя иконка крестика — только без слота `close-icon`: заданный слот
		// заменяет её целиком
		let icon: TIconElementProps | null = null

		if (!hasSlot('close-icon')) {
			icon = createDetail(
				ownerDocument,
				'span',
				{ is: 'so-icon', embedded: 'tabs.close-icon' },
				isIcon,
			)
			icon.icon = 'close'
			lend(close, DEFAULT_SLOT, icon)
		}

		row.addEventListener('click', () => {
			const context = ctx.facade?.context

			if (context) context.adapters.activation.active = true
		})

		close.addEventListener('click', (event) => {
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
		// Пропсы деталей — только сменившиеся: `disabled` кнопки нативный, и
		// каждая запись прошла бы через его атрибут
		bind(['disabled', 'size', 'variant'], ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			const { row, close, icon } = own
			const disabled = state.disabled === true

			if (row.disabled !== disabled) row.disabled = disabled
			if (row.size !== state.size) row.size = state.size
			if (row.variant !== state.variant) row.variant = state.variant
			if (close.disabled !== disabled) close.disabled = disabled
			if (close.size !== state.size) close.size = state.size
			if (icon && icon.size !== state.size) icon.size = state.size
		}),

		bind('aria', ({ root, state }) => {
			const row = parts.get(root)?.row

			if (row) ownerAttributes(row, state.aria)
		}),

		// Текст таба — строке, пока содержимое не задано слотом `default`
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
