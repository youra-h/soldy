<script lang="ts">
	import { Dynamic, toRootProps } from '../../../adapter'
	import { Button } from '../../button'
	import { setupPaginationItem } from './setup.component'
	import type { PaginationItemProps } from './base.component'

	let { ref = $bindable(), ...props }: PaginationItemProps = $props()
	const mountId = $props.id()

	const binding = setupPaginationItem(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const context = binding.context

	function activate(): void {
		if (context) context.adapters.activation.active = true
	}
</script>

<!--
	Внутренняя часть Pagination: ставит её только владелец, поэтому атрибуты снаружи — на корень.
	Текущая — не выключенная кнопка: каждая страница — своя остановка Tab.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(state, [state.attrs, state.dataset], binding.forwardProps)}
		attach={binding.attachElement}
	>
		<Button
			embedded="pagination.page"
			type="button"
			disabled={state.disabled}
			size={state.size}
			variant={state.variant}
			onclick={activate}
			{...state.aria}
		>
			{#if props.children}
				{@render props.children({ text: state.text ?? '' })}
			{:else}
				{state.text}
			{/if}
		</Button>
	</Dynamic>
{/if}
