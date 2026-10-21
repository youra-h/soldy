/**
 * Шаблон переключателя меню, как `Menu.RadioItem` у Vue: строка пункта с
 * отметкой-точкой в начале.
 *
 * Корень — сам `<div is="so-menu-radio-item">`: классы, `attrs` и `dataset`
 * (`data-highlighted`, `data-disabled`, `data-selected`) раскладывает на него
 * база, и строка красится от него. Здесь — строка (`row.ts`).
 *
 * - Нажатие — клик строки: решает меню (`adapters.menu.check()`) —
 *   выключенному отказывает, а доступный отмечает — с остальных
 *   переключателей группы отметка снимается — и остаётся открытым.
 *   Отмеченный нажатием не снимается.
 * - Отметка — обёртка `span.so-menu-item__indicator` под `aria-hidden`
 *   (состояние объявляет `aria-checked`), у неотмеченного тоже: она держит
 *   колонку. В обёртке — слот `indicator-icon` или точка темы
 *   `span.so-menu-item__dot`, без иконки, — у отмеченного.
 * - Значок, текст и подсказка сочетания — как у действия
 *   (`menu-item.template.ts`).
 *
 * Scope у слотов нет: слот `indicator-icon` — отметка отмеченного, его
 * выводит привязка (`showSlot`) только у отмеченного, как у флажка.
 */

import type { IMenuRadioItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import { bind, lend, type ITemplate } from '../../../adapter'
import { createRow, partOf, placeMark, rowBindings } from '../row'

/** Отметка переключателя — обёртка и точка в ней (со слотом `indicator-icon` — `null`). */
type TMark = {
	readonly indicator: HTMLElement
	readonly dot: HTMLElement | null
}

const marks = new WeakMap<HTMLElement, TMark>()

export const menuRadioItemTemplate: ITemplate<IMenuRadioItem, TMenuItemCollectionFacade> = {
	create: (root, hasSlot, ctx) => {
		const { ownerDocument } = root
		const row = createRow(root, () => ctx.facade?.context?.adapters.menu.check())
		const indicator = partOf(ownerDocument, 'so-menu-item__indicator', true)
		const icon = partOf(ownerDocument, 'so-menu-item__icon')
		const shortcut = partOf(ownerDocument, 'so-menu-item__shortcut')

		lend(row, 'leading', indicator)
		lend(row, 'leading', icon)
		lend(row, 'trailing', shortcut)

		// Своя точка — только без слота `indicator-icon`: заданный слот заменяет
		// её целиком
		marks.set(root, {
			indicator,
			dot: hasSlot('indicator-icon') ? null : partOf(ownerDocument, 'so-menu-item__dot'),
		})

		return {
			slots: {
				'indicator-icon': { mode: 'append', node: indicator },
				leading: { mode: 'append', node: icon },
				default: { mode: 'append', node: row, slot: DEFAULT_SLOT },
				trailing: { mode: 'append', node: shortcut },
			},
			control: row,
		}
	},

	bindings: [
		...rowBindings(DEFAULT_SLOT),

		// Отметка — у отмеченного: своя точка или слот `indicator-icon`
		bind('selected', ({ root, state, showSlot }) => {
			const own = marks.get(root)
			const selected = state.selected === true

			showSlot('indicator-icon', selected)

			if (own) placeMark(own.indicator, own.dot, selected)
		}),
	],
}
