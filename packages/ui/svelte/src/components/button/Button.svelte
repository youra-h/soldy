<script lang="ts">
	import { setupButton } from './setup.component'
	import type { ButtonProps } from './base.component'

	const props: ButtonProps = $props()

	const binding = setupButton(() => props)
	const state = binding.state

	/**
	 * Атрибуты собираются в один объект: у `<svelte:element>` тип атрибутов
	 * обобщённый, поэтому `disabled` нельзя поставить отдельным атрибутом —
	 * он уходит через спред.
	 */
	const attrs = $derived.by(() => {
		const rest = binding.forwardProps
		const isNativeButton = state.tag === 'button'

		return {
			...rest,
			class: [(state.classes as string[]).join(' '), rest.class].filter(Boolean).join(' '),
			...(isNativeButton ? { disabled: state.disabled } : {}),
			// aria вычисляет ядро: role, tabindex, aria-disabled.
			// null в значении Svelte понимает как «атрибут не ставить».
			...(state.aria as Record<string, string | null>),
		}
	})
</script>

<!--
	Button — рендерит кнопку с текстом из Core.

	- `tag` по умолчанию `button` (из TButton.defaultValues)

	Слоты объявлены в контракте (ButtonContribution) и одинаковы во всех
	адаптерах: `leading`, `default` (здесь — `children`, со scope `{ text }`),
	`trailing`.
-->
{#if state.rendered}
	<svelte:element
		this={state.tag as string}
		{...attrs}
		{@attach binding.attachElement}
		style:display={state.visible ? null : 'none'}
	>
		{#if props.leading}{@render props.leading()}{/if}
		<span class="s-button__text">
			{#if props.children}{@render props.children({ text: state.text as string })}{:else}{state.text}{/if}
		</span>
		{#if props.trailing}{@render props.trailing()}{/if}
	</svelte:element>
{/if}
