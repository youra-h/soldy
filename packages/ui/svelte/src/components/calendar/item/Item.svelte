<script lang="ts">
	import { Dynamic, toRootProps } from '../../../adapter'
	import { setupCalendarItem } from './setup.component'
	import type { CalendarItemProps } from './base.component'

	let { ref = $bindable(), ...props }: CalendarItemProps = $props()
	const mountId = $props.id()

	const binding = setupCalendarItem(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!--
	CalendarItem — корень сама ячейка (`td`): по APG фокус стоит на ячейке, а кнопка
	внутри развела бы ячейку и то, что фокусируют. Плитка дня — `div`, а не `span`:
	в слот кладут и блочное содержимое.
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
		<div class="so-calendar-item__day">
			{#if props.children}{@render props.children({ text: state.text ?? '' })}{:else}{state.text}{/if}
		</div>
	</Dynamic>
{/if}
