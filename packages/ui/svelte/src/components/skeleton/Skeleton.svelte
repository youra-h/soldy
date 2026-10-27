<script lang="ts">
	import { Dynamic, toRootProps } from '../../adapter'
	import { setupSkeleton } from './setup.component'
	import type { SkeletonProps } from './base.component'

	let { ref = $bindable(), ...props }: SkeletonProps = $props()
	const mountId = $props.id()

	const binding = setupSkeleton(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!--
	Корень есть всегда — в нём содержимое; `rendered` и `visible` решают только, показана ли
	заглушка, поэтому видимость в раскладку корня не передаётся. `aria-hidden` — на заглушке:
	скрывать содержимое нельзя.
-->
<Dynamic
	rendered
	tag={state.tag}
	attributes={toRootProps(
		{ classes: state.classes, layout_styles: state.layout_styles },
		[state.attrs, state.aria],
		binding.forwardProps,
	)}
	attach={binding.attachElement}
>
	{#if state.present}
		<div class="so-skeleton__placeholder" aria-hidden="true"></div>
	{/if}
	{@render props.children?.()}
</Dynamic>
