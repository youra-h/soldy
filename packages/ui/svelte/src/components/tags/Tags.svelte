<script lang="ts">
	import { Dynamic, toRootProps } from '../../adapter'
	import { TagsItem } from './item'
	import { setupTags } from './setup.component'
	import type { TagsProps } from './base.component'

	let { ref = $bindable(), ...props }: TagsProps = $props()
	const mountId = $props.id()

	const binding = setupTags(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!--
	Слот `default` получает показанные теги в scope и петлю заменяет: каждый тег рисуется
	ровно один раз — вторая отрисовка перетёрла бы его запись в реестре bundles.
-->
<Dynamic
	rendered={state.rendered}
	tag="div"
	attributes={toRootProps(
		state,
		[state.attrs, state.aria, state.dataset],
		binding.forwardProps,
	)}
	attach={binding.attachElement}
>
	{#if props.children}
		{@render props.children({ shown: state.shown ?? [] })}
	{:else}
		{#each state.shown ?? [] as tag (tag.uid)}
			{#snippet leading()}{@render props['item-leading']?.({ item: tag })}{/snippet}
			{#snippet content(scope: { text: string; selected: boolean })}
				{@render props.item?.({ ...scope, item: tag })}
			{/snippet}
			{#snippet trailing()}{@render props['item-trailing']?.({ item: tag })}{/snippet}
			{#snippet closeIcon()}
				{@render props['item-close-icon']?.({ item: tag })}
			{/snippet}
			<TagsItem
				ctrl={tag}
				leading={props['item-leading'] ? leading : undefined}
				trailing={props['item-trailing'] ? trailing : undefined}
				close-icon={props['item-close-icon'] ? closeIcon : undefined}
				children={props.item ? content : undefined}
			/>
		{/each}
	{/if}
</Dynamic>
