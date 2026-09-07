<script lang="ts">
	import { setupComponentView } from './setup.component'
	import type { ComponentViewProps } from './base.component'

	const props: ComponentViewProps = $props()

	const binding = setupComponentView(() => props)
	const state = binding.state

	/**
	 * forwardProps раскладывается ПЕРВЫМ, чтобы вычисленный ядром class не был
	 * перекрыт пользовательским: ниже он переопределяется осознанно, со слиянием.
	 */
	const attrs = $derived.by(() => {
		const rest = binding.forwardProps

		return {
			...rest,
			class: [(state.classes as string[]).join(' '), rest.class].filter(Boolean).join(' '),
			// dir вычисляет ядро: null для 'inherit' — Svelte трактует как «атрибут не ставить»
			dir: (state.dir as 'ltr' | 'rtl' | null) ?? undefined,
		}
	})
</script>

<!-- ComponentView — рендерит динамический `tag` с классами из Core. -->
{#if state.rendered}
	<svelte:element
		this={state.tag as string}
		{...attrs}
		{@attach binding.attachElement}
		style:display={state.visible ? null : 'none'}
	>
		{@render props.children?.()}
	</svelte:element>
{/if}
