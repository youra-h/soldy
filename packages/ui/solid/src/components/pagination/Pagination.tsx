import type { Accessor, JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import type { IPaginationItem, TPaginationCell } from '@soldy-ui/core'
import {
	Elevate,
	KeyedFor,
	createRootProps,
	relaySlot,
	resolveSlot,
	roleIcon,
	rootTag,
} from '../../adapter'
import { Show } from '../../adapter/runtime/flow'
import { Button } from '../button'
import { Icon } from '../icon'
import { PaginationItem } from './item'
import { setupPagination } from './setup.component'
import type { PaginationProps } from './base.component'

/** Одна иконка на обе стрелки: роли «влево» нет, стрелку «назад» зеркалит тема. */
const ARROW = roleIcon('arrowRight')

/** Страница места окна; у пропуска страницы нет. */
function pageOf(cell: TPaginationCell): IPaginationItem | undefined {
	return cell.kind === 'item' ? cell.item : undefined
}

/** Пагинация: стрелка «назад», список страниц и пропусков, стрелка «вперёд». */
export function Pagination(props: PaginationProps): JSX.Element {
	const binding = setupPagination(props)
	const state = binding.state
	const ctrl = binding.ctrl
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
	}))

	/** Место окна: страница — элемент коллекции, пропуск — многоточие текстом. */
	function cell(entry: Accessor<TPaginationCell>): JSX.Element {
		return (
			<Show when={pageOf(entry())} fallback={<li class="so-pagination__ellipsis">…</li>}>
				{(page) => (
					<PaginationItem ctrl={page()}>
						{relaySlot(props.item, { item: page() })}
					</PaginationItem>
				)}
			</Show>
		)
	}

	/** Содержимое корня — под слоем лифта пагинации: зовёт его `Elevate`, внутри себя. */
	function content(): JSX.Element {
		const prevIcon = resolveSlot(
			() => props['prev-icon'],
			() => ({}),
		)
		const nextIcon = resolveSlot(
			() => props['next-icon'],
			() => ({}),
		)

		return (
			<>
				<Button
					embedded="pagination.prev"
					type="button"
					class="so-pagination__prev"
					size={state.size}
					variant={state.variant}
					disabled={state.prevDisabled}
					{...state.prevAria}
					onClick={() => ctrl.prev()}
				>
					{prevIcon() ?? (
						<Icon embedded="pagination.prev-icon" tag={ARROW} size={state.size} />
					)}
				</Button>
				<ol class="so-pagination__list">
					<KeyedFor each={state.cells} by={(entry) => entry.key}>
						{cell}
					</KeyedFor>
				</ol>
				<Button
					embedded="pagination.next"
					type="button"
					class="so-pagination__next"
					size={state.size}
					variant={state.variant}
					disabled={state.nextDisabled}
					{...state.nextAria}
					onClick={() => ctrl.next()}
				>
					{nextIcon() ?? (
						<Icon embedded="pagination.next-icon" tag={ARROW} size={state.size} />
					)}
				</Button>
			</>
		)
	}

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Elevate layer={binding.layer}>{content()}</Elevate>
			</Dynamic>
		</Show>
	)
}
