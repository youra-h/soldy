<script lang="ts">
	import {
		Dynamic,
		fieldText,
		roleIcon,
		toControlAttrs,
		toRootForward,
		toRootProps,
	} from '../../adapter'
	import { Button } from '../button'
	import { Icon } from '../icon'
	import { setupInput } from './setup.component'
	import type { InputAttributes, InputProps } from './base.component'

	let { ref = $bindable(), ...props }: InputProps = $props()
	const mountId = $props.id()

	const binding = setupInput(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const ctrl = binding.ctrl

	// Не `value` в спреде: Svelte писал бы текст узлу на каждое нажатие
	const text = fieldText(() => state.value)

	const CLOSE = roleIcon('close')

	/** Всплытие гасится: select-only Select открывает панель по клику поля. */
	function clear(event: MouseEvent): void {
		event.stopPropagation()
		ctrl.clear()
	}
</script>

<Dynamic
	rendered={state.rendered}
	tag={state.tag}
	attributes={toRootProps(
		state,
		[state.attrs, state.dataset],
		toRootForward(binding.forwardProps),
	)}
	attach={binding.attachElement}
>
	{#if props.leading}<div class="so-input__leading">{@render props.leading({ ctrl })}</div>{/if}<input
		type="text"
		id={state.id}
		name={state.name}
		disabled={state.disabled}
		readonly={state.readonly}
		required={state.required}
		placeholder={state.placeholder}
		{...state.aria}
		{...toControlAttrs<InputAttributes>(binding.forwardProps)}
		{...text}
	/>{#if state.clearable || props.clear || props.trailing}
		<!-- The clear button and `trailing` are glued: Svelte would keep a space as text. -->
		<div class="so-input__trailing">
			{#if props.clear}
				{@render props.clear({ clear: ctrl.clear })}
			{:else if state.clearable}
				<Button
					embedded="input.clear"
					type="button"
					class="so-input__clear"
					size={state.size}
					disabled={state.disabled}
					{...state.clearAria}
					onActionClick={clear}
				>
					<Icon embedded="input.clear-icon" tag={CLOSE} size={state.size} />
				</Button>
			{/if}{#if props.trailing}{@render props.trailing({ ctrl })}{/if}
		</div>{/if}
</Dynamic>
