/**
 * Шаблон Pagination.
 *
 * Корень — сам `<nav is="so-pagination">`, ориентир для скринридера: классы
 * (`--size-*`, `--variant-*`), все три набора ядра (`attrs`, `aria` с именем
 * от приложения — `aria_label`, `aria_labelledBy`, — и `dataset` с
 * `data-disabled`) и скрытие раскладывает на него база (`ElementBase`).
 * Здесь — ряд в одну строку, как у Vue: стрелка «назад», список страниц,
 * стрелка «вперёд». Стрелки стоят вне списка: в списке только страницы и
 * пропуски.
 *
 * - Стрелки — детали `<button is="so-button" embedded="pagination.prev"
 *   type="button">` (и `pagination.next`) с классами `so-pagination__prev` и
 *   `__next`: по ним их находит плагин фокуса. `size` и `variant` —
 *   пагинации, выключенность считает пагинация (`prevDisabled`,
 *   `nextDisabled`: край, текущей нет или выключен компонент), имя от локали
 *   — набор `prevAria` или `nextAria` верхним слоем раскладчика кнопки.
 *   Нажатие — `prev()` или `next()` инстанса текущей связки. Вида нет: `plain`
 *   и квадрат даёт тема по контексту.
 * - Значок стрелки — слот `prev-icon` или `next-icon` в слот по умолчанию её
 *   кнопки, а без слота — иконка роли `arrowRight`
 *   (`<span is="so-icon" embedded="pagination.prev-icon">`) размером
 *   пагинации, у обеих стрелок: стрелку «назад» тема зеркалит по направлению
 *   строки, как и стрелку из слота.
 * - Список `ol.so-pagination__list` — окно (`cells`): страницы и пропуски по
 *   порядку. Страница — элемент коллекции `<li is="so-pagination-item">` с
 *   инстансом страницы и копией образца `item` в её слоте по умолчанию; в
 *   коллекцию её кладёт расширение `pagination`, разметкой её не ставят.
 *   Пропуск — разметка владельца `li.so-pagination__ellipsis` с многоточием
 *   текстом: на нём ничего не нажимают, и фокуса у него нет.
 *
 * Записи окна — новые на каждую смену, поэтому петля идёт по ключу места
 * (`TKeyedLoop`, `cell.key` — у страницы её `uid`): страница, оставшаяся на
 * экране при сдвиге окна, — тот же экземпляр и тот же узел, и фокус с неё не
 * слетает.
 *
 * Слот со scope (`item`) у Web Components — образец (`<template slot="item">`):
 * копию получает каждая страница. Данные копия берёт у страницы — `el.ctrl`
 * ближайшего `.so-pagination-item`: элемент страницы строит код
 * (`createElement` с `is`), и атрибута `is` у него нет.
 */

import type { IPagination, TPaginationCell, TPaginationCollectionFacade } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import {
	TKeyedLoop,
	bind,
	createItem,
	lendSamples,
	ownerAttributes,
	type ITemplate,
	type ITemplateContext,
	type TItemSlots,
	patch,
} from '../../adapter'
import {
	iconButton,
	syncIconButton,
	type TIconButton,
	type TIconButtonSpec,
} from '../common/icon-button'
import { type TButtonElementProps } from '../button'
import { TPaginationItemElement } from './item'

/**
 * Копия образца в страницу: слот пагинации → слот страницы, как проброс у
 * остальных адаптеров (`setup/__tests__/item-slots.spec.ts`).
 */
export const PAGINATION_ITEM_SLOTS: TItemSlots = {
	item: 'default',
}

/** Как построить стрелку: имена мест, класс, слот значка и команда нажатия. */
type TArrowSpec = TIconButtonSpec & {
	/** Слот значка: заданный заменяет иконку целиком. */
	readonly slot: string
	/** Команда пагинации на нажатие. */
	readonly go: (ctrl: IPagination) => void
}

const PREV: TArrowSpec = {
	embedded: 'pagination.prev',
	iconEmbedded: 'pagination.prev-icon',
	className: 'so-pagination__prev',
	role: 'arrowRight',
	slot: 'prev-icon',
	go: (ctrl) => ctrl.prev(),
}

const NEXT: TArrowSpec = {
	embedded: 'pagination.next',
	iconEmbedded: 'pagination.next-icon',
	className: 'so-pagination__next',
	role: 'arrowRight',
	slot: 'next-icon',
	go: (ctrl) => ctrl.next(),
}

/** Контекст привязок пагинации. */
type TPaginationContext = ITemplateContext<IPagination, TPaginationCollectionFacade>

/** Части пагинации — одни на всё время жизни элемента. */
type TPaginationParts = {
	readonly prev: TIconButton
	readonly next: TIconButton
	/** Петля окна в списке — по ключу места. */
	readonly loop: TKeyedLoop<TPaginationCell, number, HTMLElement>
}

const parts = new WeakMap<HTMLElement, TPaginationParts>()

/** Стрелка с командой пагинации: роли «влево» нет, стрелку в начало строки зеркалит тема. */
function arrowOf(ctx: TPaginationContext, spec: TArrowSpec, slotted: boolean): TIconButton {
	const arrow = iconButton(ctx.root.ownerDocument, spec, slotted)

	arrow.button.addEventListener('click', () => {
		if (ctx.ctrl) spec.go(ctx.ctrl)
	})

	return arrow
}

function syncArrow(
	arrow: TIconButton,
	size: TButtonElementProps['size'],
	variant: TButtonElementProps['variant'],
	disabled: boolean,
): void {
	syncIconButton(arrow, size, disabled)

	patch(arrow.button, { variant })
}

/** Место окна: страница — инстанс и копия образца до вставки, пропуск — многоточие. */
function cellOf(ctx: TPaginationContext, cell: TPaginationCell): HTMLElement {
	const { ownerDocument } = ctx.root

	if (cell.kind === 'ellipsis') {
		const ellipsis = ownerDocument.createElement('li')

		ellipsis.className = 'so-pagination__ellipsis'
		ellipsis.textContent = '…'

		return ellipsis
	}

	const page = createItem(ownerDocument, TPaginationItemElement)

	page.ctrl = cell.item
	lendSamples(ctx, page, PAGINATION_ITEM_SLOTS)

	return page
}

export const paginationTemplate: ITemplate<IPagination, TPaginationCollectionFacade> = {
	create: (root, ctx) => {
		const { hasSlot } = ctx

		const list = root.ownerDocument.createElement('ol')
		const prev = arrowOf(ctx, PREV, hasSlot(PREV.slot))
		const next = arrowOf(ctx, NEXT, hasSlot(NEXT.slot))

		list.className = 'so-pagination__list'
		root.append(prev.button, list, next.button)
		parts.set(root, {
			prev,
			next,
			loop: new TKeyedLoop(list, null, (cell: TPaginationCell) => cell.key),
		})

		return {
			// Значки — в слот по умолчанию своей стрелки; содержимое страницы —
			// образец: копию шаблон кладёт в каждую страницу
			slots: {
				item: { mode: 'sample' },
				'prev-icon': { mode: 'append', node: prev.button, slot: DEFAULT_SLOT },
				'next-icon': { mode: 'append', node: next.button, slot: DEFAULT_SLOT },
			},
		}
	},

	bindings: [
		bind(['size', 'variant', 'prevDisabled', 'nextDisabled'], ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			syncArrow(own.prev, state.size, state.variant, state.prevDisabled === true)
			syncArrow(own.next, state.size, state.variant, state.nextDisabled === true)
		}),

		bind('prevAria', ({ root, state }) => {
			const button = parts.get(root)?.prev.button

			if (button) ownerAttributes(button, state.prevAria)
		}),

		bind('nextAria', ({ root, state }) => {
			const button = parts.get(root)?.next.button

			if (button) ownerAttributes(button, state.nextAria)
		}),

		bind('cells', (ctx) => {
			parts.get(ctx.root)?.loop.draw(ctx.state.cells ?? [], (cell) => cellOf(ctx, cell))
		}),
	],
}
