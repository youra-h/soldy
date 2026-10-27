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
	import { setupNumberInput } from './setup.component'
	import type { NumberInputAttributes, NumberInputProps } from './base.component'

	let { ref = $bindable(), ...props }: NumberInputProps = $props()
	const mountId = $props.id()

	const binding = setupNumberInput(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const ctrl = binding.ctrl

	// Буфер правки ядра, а не `value`: пока набирают — набранное, после — строка формата
	const text = fieldText(() => state.text)

	const CLOSE = roleIcon('close')
	const MINUS = roleIcon('minus')
	const PLUS = roleIcon('plus')

	function clear(event: MouseEvent): void {
		event.stopPropagation()
		ctrl.clear()
	}
</script>

<!--
	NumberInput — кнопки шага последними из видимых, у края поля: их место не зависит от
	слотов. Ввод и кнопки плагины находят по классам. `name` у ввода нет: в форму уходит
	число скрытым полем, а не текст.
-->
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
	{#if props.leading}<div class="so-number-input__leading">{@render props.leading({ ctrl })}</div>{/if}<input
		type="text"
		class="so-number-input__input"
		id={state.id}
		placeholder={state.placeholder}
		disabled={state.disabled}
		readonly={state.readonly}
		required={state.required}
		autocomplete="off"
		spellcheck="false"
		{...state.inputAttrs}
		{...state.aria}
		{...state.inputAria}
		{...toControlAttrs<NumberInputAttributes>(binding.forwardProps)}
		{...text}
	/>{#if state.clearable || props.clear || props.trailing}
		<div class="so-number-input__trailing">
			{#if props.clear}
				{@render props.clear({ clear: ctrl.clear })}
			{:else if state.clearable}
				<Button
					embedded="number-input.clear"
					type="button"
					class="so-number-input__clear"
					size={state.size}
					disabled={state.disabled}
					{...state.clearAria}
					onActionClick={clear}
				>
					<Icon embedded="number-input.clear-icon" tag={CLOSE} size={state.size} />
				</Button>
			{/if}{#if props.trailing}{@render props.trailing({ ctrl })}{/if}
		</div>{/if}<div class="so-number-input__stepper">
		<Button
			embedded="number-input.decrement"
			type="button"
			class="so-number-input__decrement"
			size={state.size}
			disabled={state.decrementDisabled}
			{...state.decrementAria}
			{...state.decrementDataset}
		>
			{#if props['decrement-icon']}
				{@render props['decrement-icon']()}
			{:else}
				<Icon embedded="number-input.decrement-icon" tag={MINUS} size={state.size} />
			{/if}
		</Button><Button
			embedded="number-input.increment"
			type="button"
			class="so-number-input__increment"
			size={state.size}
			disabled={state.incrementDisabled}
			{...state.incrementAria}
			{...state.incrementDataset}
		>
			{#if props['increment-icon']}
				{@render props['increment-icon']()}
			{:else}
				<Icon embedded="number-input.increment-icon" tag={PLUS} size={state.size} />
			{/if}
		</Button>
	</div><input
		type="hidden"
		name={state.name}
		value={state.value === undefined ? '' : String(state.value)}
		disabled={state.disabled}
	/>
</Dynamic>
