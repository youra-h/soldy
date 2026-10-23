/**
 * Шаблон Pagination: стрелка «назад», список окна `ol.so-pagination__list`,
 * стрелка «вперёд»; по классам стрелок их находит плагин фокуса. Окно — петлёй
 * по ключу места: страница, оставшаяся при сдвиге окна, — тот же узел, и фокус
 * с неё не слетает. docs/architecture.md, Layer 8d, «Коллекция».
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

/** Слот пагинации → слот страницы; сторож — `setup/__tests__/item-slots.spec.ts`. */
export const PAGINATION_ITEM_SLOTS: TItemSlots = {
	item: 'default',
}

type TArrowSpec = TIconButtonSpec & {
	readonly slot: string
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

type TPaginationContext = ITemplateContext<IPagination, TPaginationCollectionFacade>

type TPaginationParts = {
	readonly prev: TIconButton
	readonly next: TIconButton
	readonly loop: TKeyedLoop<TPaginationCell, number, HTMLElement>
}

const parts = new WeakMap<HTMLElement, TPaginationParts>()

/** Роли «влево» нет: стрелку «назад» зеркалит тема. */
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

/** Странице `ctrl` и копия образца — до вставки. */
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
