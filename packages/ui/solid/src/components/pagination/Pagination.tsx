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

/**
 * Одна иконка на обе стрелки: роли «влево» в контракте иконок нет, и ту
 * стрелку, что смотрит в начало строки, зеркалит тема. Компонент на роль —
 * один на модуль: `tag` у Icon — корень, а не роль.
 */
const ARROW = roleIcon('arrowRight')

/** Страница места окна; у пропуска страницы нет. */
function pageOf(cell: TPaginationCell): IPaginationItem | undefined {
	return cell.kind === 'item' ? cell.item : undefined
}

/**
 * Pagination — ряд в одну строку: стрелка «назад», список страниц, стрелка
 * «вперёд». Корень рисуется по `tag` (по умолчанию `nav`): ориентир для
 * скринридера. Имя ему даёт приложение — `aria_label` или `aria_labelledBy`,
 * они в наборе `aria`: что листают, знает только оно. На корне — модификаторы
 * `--size-*` и `--variant-*` и `data-disabled`, атрибуты потребителя — поверх
 * наборов, как у Vue.
 *
 * Стрелки стоят вне списка: в списке только страницы и пропуски. Стрелка —
 * `Button` на соседнюю страницу (`ctrl.prev()`, `ctrl.next()`), с `size` и
 * `variant` пагинации; выключенность считает пагинация (`prevDisabled`,
 * `nextDisabled`), имена из локали — в наборах `prevAria` и `nextAria`. Вида
 * нет: `plain` и квадрат даёт тема по контексту. Значок — слот `prev-icon` или
 * `next-icon`, по умолчанию — иконка роли `arrowRight`; стрелку «назад» тема
 * зеркалит по направлению строки.
 *
 * Страницы и пропуски — по порядку окна (`cells`). Страница — элемент
 * коллекции, внутренняя часть `PaginationItem`; пропуск — разметка владельца:
 * не кнопка и не иконка, на нём ничего не нажимают, и фокуса у него нет.
 * Записи окна — новые на каждую смену, поэтому петля идёт по ключу места
 * (`KeyedFor`, `cell.key` — у страницы её `uid`): страница, оставшаяся на
 * экране при сдвиге окна, — тот же экземпляр и тот же узел, и фокус с неё не
 * слетает. Слот страницы пробрасывается целиком: `item`, scope — scope слота
 * страницы (`text`) плюс сама страница (`relaySlot`).
 *
 * Всё содержимое — в слое лифта пагинации (`Elevate`): страница,
 * смонтированная внутри, прочтёт движок и регистратор этой пагинации. Слоты
 * разворачиваются там же: узлы слота Solid создаёт там, где его развернули.
 */
export function Pagination(props: PaginationProps): JSX.Element {
	const binding = setupPagination(props)
	const state = binding.state
	const ctrl = binding.ctrl
	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
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
