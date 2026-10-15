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
	Skeleton — заглушка поверх будущего содержимого.

	Корень есть всегда: в нём лежит содержимое (`children`), а `rendered` и
	`visible` решают только, показана ли заглушка (`present`). Поэтому видимость
	в раскладку корня не передаётся — скрыть его она не должна.

	Заглушка декоративна: она изображает будущий текст, а не является им.
	`aria-hidden` стоит на ней, а не на корне — скрывать содержимое нельзя.
	Пока заглушка показана, ядро помечает корень `aria-busy`.
-->
<Dynamic
	tag={state.tag}
	attributes={toRootProps(
		{ classes: state.classes, layout_styles: state.layout_styles },
		[state.attrs, state.aria],
		binding.forwardProps,
	)}
	attach={binding.attachElement}
>
	{#if state.present}
		<div class="s-skeleton__placeholder" aria-hidden="true"></div>
	{/if}
	{@render props.children?.()}
</Dynamic>
