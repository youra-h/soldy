<script lang="ts">
	import { Dynamic, textareaText, toControlAttrs, toRootForward, toRootProps } from '../../adapter'
	import { setupTextarea } from './setup.component'
	import type { TextareaAttributes, TextareaProps } from './base.component'

	let { ref = $bindable(), ...props }: TextareaProps = $props()
	const mountId = $props.id()

	const binding = setupTextarea(() => props, mountId, (node) => (ref = node))
	const state = binding.state

	// `value` поля — для сервера, там он становится содержимым `<textarea>`; в браузере пуст
	const text = textareaText(() => state.value)
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
	<textarea
		id={state.id}
		name={state.name}
		rows={state.rows}
		maxlength={state.maxlength}
		disabled={state.disabled}
		readonly={state.readonly}
		required={state.required}
		placeholder={state.placeholder}
		{...state.aria}
		{...toControlAttrs<TextareaAttributes>(binding.forwardProps)}
		{...text.attributes}
		value={text.value}
	></textarea>{#if state.counter}<div class="so-textarea__counter" {...state.counterAria}>
			{state.names_counter}
		</div>{/if}
</Dynamic>
