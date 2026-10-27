<script lang="ts">
	import { Dynamic, toRootProps } from '../../adapter'
	import { setupItemRow } from './setup.component'
	import type { ButtonProps } from '../button/base.component'

	let { ref = $bindable(), ...props }: ButtonProps = $props()
	const mountId = $props.id()

	const binding = setupItemRow(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!--
	Строка элемента коллекции — деталь разметки ListBox.Item, опции Select,
	пунктов меню и тега. Пропсы и разметка — Button, сборка своя — по
	`ItemRowDescriptor`: её экземпляр (`TItemRow`) роль и остановку Tab себе не
	пишет, их несёт набор `aria` элемента, который разметка кладёт на строку.

	Экземпляр создаёт это монтирование и отпускает его снятие: строка живёт,
	пока нарисована, и окно `Virtual` держит их столько, сколько показывает.
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
	{#if props.leading}{@render props.leading()}{/if}
	<span class="so-button__text">
		{#if props.children}{@render props.children({ text: state.text ?? '' })}{:else}{state.text}{/if}
	</span>
	{#if props.trailing}{@render props.trailing()}{/if}
</Dynamic>
