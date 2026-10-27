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

	// Одна иконка на обе стрелки: роли «влево» нет, стрелку «назад» зеркалит тема
	const ARROW = roleIcon('arrowRight')
</script>

<!--
	Стрелки — вне списка: в списке только страницы и пропуски, по порядку окна (`cells`).
	Петля — по ключу места (`cell.key`): страница, оставшаяся при сдвиге окна, — тот же
	экземпляр, и узел с фокусом на нём не пересобирается.
-->
<Dynamic
	rendered={state.rendered}
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
