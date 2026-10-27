<script lang="ts">
	import { Dynamic, TextSpan, roleIcon, toRootProps } from '../../adapter'
	import { Button } from '../button'
	import { Icon } from '../icon'
	import { setupDateInput } from './setup.component'
	import type { DateInputProps } from './base.component'

	let { ref = $bindable(), ...props }: DateInputProps = $props()
	const mountId = $props.id()

	const binding = setupDateInput(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const ctrl = binding.ctrl

	const CLOSE = roleIcon('close')

	function clear(event: MouseEvent): void {
		event.stopPropagation()
		ctrl.clear()
	}
</script>

<!--
	DateInput — каждая часть и разделитель — своя коробка: в строке текста Chrome переносит
	начало протяжки в соседний текст. Ключ части — тип, разделителя — место: при наборе узел
	части с фокусом остаётся. Текст части — только `TextSpan`: на касание она редактируемая.
	Узлы вплотную: пробел Svelte оставил бы текстом, а ряд буфер обмена копирует целиком.
-->
<Dynamic
	rendered={state.rendered}
	tag={state.tag}
	attributes={{
		id: state.id,
		...toRootProps(state, [state.attrs, state.aria, state.dataset], binding.forwardProps),
	}}
	attach={binding.attachElement}
>
	{#if props.leading}<div class="so-date-input__leading">
			{@render props.leading({ ctrl })}
		</div>{/if}<span class="so-date-input__segments" {...state.segmentsAttrs}
		>{#each state.segments ?? [] as segment (segment.key)}{#if segment.type === 'literal'}<span
					class="so-date-input__literal"
					{...segment.aria}>{segment.text}</span
				>{:else}<TextSpan
					class="so-date-input__segment"
					{...segment.attrs}
					{...segment.aria}
					{...segment.dataset}
					text={segment.text}
				/>{/if}{/each}</span
	>{#if state.clearable || props.clear || props.trailing}<div
			class="so-date-input__trailing"
		>
			{#if props.clear}
				{@render props.clear({ clear: ctrl.clear })}
			{:else if state.clearable}
				<Button
					embedded="date-input.clear"
					type="button"
					class="so-date-input__clear"
					size={state.size}
					disabled={state.disabled}
					{...state.clearAria}
					onActionClick={clear}
				>
					<Icon embedded="date-input.clear-icon" tag={CLOSE} size={state.size} />
				</Button>
			{/if}{@render props.trailing?.({ ctrl })}
		</div>{/if}<input
		type="hidden"
		name={state.name}
		value={state.value ?? ''}
		disabled={state.disabled}
	/>
</Dynamic>
