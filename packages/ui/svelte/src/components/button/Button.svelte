<script lang="ts">
	import { Dynamic, toRootProps } from '../../adapter'
	import { setupButton } from './setup.component'
	import type { ButtonProps } from './base.component'

	const props: ButtonProps = $props()
	const mountId = $props.id()

	const binding = setupButton(() => props, mountId)
	const state = binding.state
</script>

<!--
	Button — рендерит кнопку с текстом из Core.

	- `tag` по умолчанию `button` (из TButton.defaultValues)
	- disabled → нативный `disabled` (`attrs`) или `aria-disabled` (`aria`) по
	  тегу, `data-disabled` для темы (`dataset`) — на любом теге

	Наборы ядра, поверх — атрибуты снаружи (`toRootProps`): `tabindex="-1"`
	строки списка перекрывает `tabindex="0"`, который кнопка на `div` ставит
	себе сама.

	Слоты объявлены в контракте (ButtonDescriptor) и одинаковы во всех
	адаптерах: `leading`, `default` (здесь — `children`, со scope `{ text }`),
	`trailing`.
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
		{#if props.leading}{@render props.leading()}{/if}
		<span class="s-button__text">
			{#if props.children}{@render props.children({ text: state.text ?? '' })}{:else}{state.text}{/if}
		</span>
		{#if props.trailing}{@render props.trailing()}{/if}
	</Dynamic>
{/if}
