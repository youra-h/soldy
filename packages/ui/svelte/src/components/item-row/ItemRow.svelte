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

<!--
	Slots render by a call, not by a block around: the owners (an option, a menu item) hand their
	markup to all three slots of the row, and a set slot behind `{#if}` cost two blocks. The text
	falls back to `state.text` in the block of the content. The parts are glued: Svelte would keep
	a space between them as text.
-->
{#snippet plain()}{state.text}{/snippet}
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
	{@render props.leading?.()}<span class="so-button__text"
		>{@render (props.children ?? plain)({ text: state.text ?? '' })}</span
	>{@render props.trailing?.()}
</Dynamic>
