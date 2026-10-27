<script lang="ts">
	import { Dynamic, roleIcon, toRootProps } from '../../adapter'
	import { Icon } from '../icon'
	import { setupField } from './setup.component'
	import type { FieldProps } from './base.component'

	let { ref = $bindable(), ...props }: FieldProps = $props()
	const mountId = $props.id()

	const binding = setupField(() => props, mountId, (node) => (ref = node))
	const state = binding.state

	const ERROR = roleIcon('error')
</script>

<!--
	Field — порядок частей один на все стороны, сторону рисует тема. Часть стоит, пока задан
	её текст: ссылки контрола на части ставит ядро, а слотов оно не видит. Текст ошибки — в
	своей обёртке: ряд из значка и текста — флекс. Пробелы по краям блока Svelte срезает сам.
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
	{#if state.label}
		<label class="so-field__label" {...state.labelAria}>
			{#if props['label-content']}
				{@render props['label-content']()}
			{:else}
				{state.label}
			{/if}
		</label>{/if}<div class="so-field__control">{@render props.children?.()}</div>{#if state.helperRendered}
		<div class="so-field__helper" {...state.helperAria}>
			{#if props['helper-content']}
				{@render props['helper-content']()}
			{:else}
				{state.helper}
			{/if}
		</div>{/if}{#if state.errorRendered}
		<div class="so-field__error" {...state.errorAria}>
			<Icon embedded="field.error-icon" class="so-field__error-icon" tag={ERROR} /><div
				class="so-field__error-text"
			>
				{#if props['error-content']}
					{@render props['error-content']()}
				{:else}
					{state.error}
				{/if}
			</div>
		</div>
	{/if}
</Dynamic>
