<script lang="ts">
	import { Dynamic, toRootProps } from '../../adapter'
	import { setupComponentView } from './setup.component'
	import type { ComponentViewProps } from './base.component'

	const props: ComponentViewProps = $props()
	const mountId = $props.id()

	const binding = setupComponentView(() => props, mountId)
	const state = binding.state
</script>

<!--
	ComponentView — рендерит динамический `tag` с классами из Core.

	- `rendered` — `{#if}`: при false корня нет
	- `visible` — `display: none` поверх стиля корня, как `v-show` (`toRootProps`)
	- `attrs`/`aria`/`dataset` — три набора ядра раскладываются на корень, как у
	  Button: сам по себе ComponentView не пишет в них ничего, но наследники
	  (Icon, Skeleton, …) пишут, и без раскладки здесь запись до DOM не доходит.
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
		{@render props.children?.()}
	</Dynamic>
{/if}
