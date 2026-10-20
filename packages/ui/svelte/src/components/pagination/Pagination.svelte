<script lang="ts">
	import { Dynamic, roleIcon, toRootProps } from '../../adapter'
	import { Button } from '../button'
	import { Icon } from '../icon'
	import { PaginationItem } from './item'
	import { setupPagination } from './setup.component'
	import type { PaginationProps } from './base.component'

	let { ref = $bindable(), ...props }: PaginationProps = $props()
	const mountId = $props.id()

	const binding = setupPagination(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const ctrl = binding.ctrl

	// Одна иконка на обе стрелки: роли «влево» в контракте иконок нет, и ту
	// стрелку, что смотрит в начало строки, зеркалит тема. Метка одна на роль
	const ARROW = roleIcon('arrowRight')
</script>

<!--
	Pagination — ряд в одну строку: стрелка «назад», список страниц, стрелка
	«вперёд». Корень рисуется по `tag` (по умолчанию `nav`): ориентир для
	скринридера. Имя ему даёт приложение — `aria_label` или `aria_labelledBy`,
	они в наборе `aria`: что листают, знает только оно. На корне — модификаторы
	`--size-*` и `--variant-*` и `data-disabled`.

	Стрелки стоят вне списка: в списке только страницы и пропуски. Отдельных
	кнопок «в начало» и «в конец» нет — их роль играют первая и последняя
	страницы, они видны всегда.

	Стрелка «назад» — на предыдущую страницу (`ctrl.prev()`), «вперёд» — на
	следующую (`ctrl.next()`). `size` и `variant` — пагинации: цвет тема берёт
	с модификатора кнопки. Выключенность считает пагинация (`prevDisabled` и
	`nextDisabled`: край, текущей нет или выключен компонент), имена из локали
	— в наборах `prevAria` и `nextAria`. Вида нет: `plain` и квадрат даёт тема
	по контексту. Иконка — роль `arrowRight`, у обеих стрелок: «назад» тема
	зеркалит по направлению строки. Слоты `prev-icon` и `next-icon` — своя
	иконка; в слот кладут стрелку, которая смотрит в конец строки, — тема
	зеркалит и её.

	Страницы и пропуски — по порядку окна (`cells`): первая страница, пропуск,
	N страниц вокруг текущей, пропуск, последняя (`1 … 4 5 6 … 10`). Страница —
	элемент коллекции; в коллекции только страницы окна. Пропуск — разметка
	владельца там, где между соседними страницами окна пропущены две и больше.
	Петля — по ключу места (`cell.key`, у страницы — её `uid`): страница,
	оставшаяся на экране при сдвиге окна, — тот же экземпляр, и узел с фокусом
	на нём не пересобирается.

	Слот страницы пробрасывается целиком: `item`, scope — scope слота страницы
	(`text`) плюс сама страница. Проброс — сниппет, который страница зовёт со
	своим scope, и отдаётся он странице, только когда слот задан пагинации:
	сниппет непрозрачен, и без `item` страница рисует свой текст.

	Пропуск — не кнопка и не иконка: на нём ничего не нажимают, и фокуса у него
	нет. Многоточие — текстом. Клетку той же ширины, что узкая страница, даёт
	тема.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(
			state,
			[state.attrs, state.aria, state.dataset],
			binding.forwardProps,
		)}
		attach={binding.attachElement}
	>
		<Button
			embedded="pagination.prev"
			type="button"
			class="so-pagination__prev"
			size={state.size}
			variant={state.variant}
			disabled={state.prevDisabled}
			onclick={() => ctrl.prev()}
			{...state.prevAria}
		>
			{#if props['prev-icon']}
				{@render props['prev-icon']()}
			{:else}
				<Icon embedded="pagination.prev-icon" tag={ARROW} size={state.size} />
			{/if}
		</Button>
		<ol class="so-pagination__list">
			{#each state.cells ?? [] as cell (cell.key)}
				{#if cell.kind === 'item'}
					{@const page = cell.item}
					{#snippet content(scope: { text: string })}
						{@render props.item?.({ ...scope, item: page })}
					{/snippet}
					<PaginationItem ctrl={page} children={props.item ? content : undefined} />
				{:else}
					<li class="so-pagination__ellipsis">…</li>
				{/if}
			{/each}
		</ol>
		<Button
			embedded="pagination.next"
			type="button"
			class="so-pagination__next"
			size={state.size}
			variant={state.variant}
			disabled={state.nextDisabled}
			onclick={() => ctrl.next()}
			{...state.nextAria}
		>
			{#if props['next-icon']}
				{@render props['next-icon']()}
			{:else}
				<Icon embedded="pagination.next-icon" tag={ARROW} size={state.size} />
			{/if}
		</Button>
	</Dynamic>
{/if}
