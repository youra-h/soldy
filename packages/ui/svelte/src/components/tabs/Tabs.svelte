<script lang="ts">
	import { Dynamic, toControlAttrs, toRootForward, toRootProps } from '../../adapter'
	import { TabsItem } from './item'
	import { setupTabs } from './setup.component'
	import type { TabsAttributes, TabsProps } from './base.component'

	let { ref = $bindable(), ...props }: TabsProps = $props()
	const mountId = $props.id()

	const binding = setupTabs(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!--
	Набор `aria` и атрибуты потребителя — списку табов, а не корню: рядом со списком лежат панели.
	Список стоит в ряду, слоты `leading` и `trailing` — по краям ряда, а не в списке:
	в `[role=tablist]` ARIA пускает только `tab`.
	Панели (слот `content`) — вне ряда, иначе оказались бы внутри `[role=tablist]`.
	Части стоят вплотную: пробел между блоками Svelte оставил бы в ряду и корне текстом.
-->
<Dynamic
	rendered={state.rendered}
	tag="div"
	attributes={toRootProps(
		state,
		[state.attrs, state.dataset],
		toRootForward(binding.forwardProps),
	)}
	attach={binding.attachElement}
>
	<div class="so-tabs__bar">
		{#if props.leading}
			<div class="so-tabs__leading">{@render props.leading()}</div>
		{/if}<div
			class="so-tabs__list"
			{...state.aria}
			{...toControlAttrs<TabsAttributes>(binding.forwardProps)}
		>
			{#if props.children}
				{@render props.children()}
			{:else}
				{#each state.shown ?? [] as tab (tab.uid)}
					{#snippet leading()}{@render props['item-leading']?.({ item: tab })}{/snippet}
					{#snippet content(scope: { text: string; active: boolean })}
						{@render props.item?.({ ...scope, item: tab })}
					{/snippet}
					{#snippet trailing()}{@render props['item-trailing']?.({ item: tab })}{/snippet}
					{#snippet closeIcon()}
						{@render props['item-close-icon']?.({ item: tab })}
					{/snippet}
					<TabsItem
						ctrl={tab}
						leading={props['item-leading'] ? leading : undefined}
						trailing={props['item-trailing'] ? trailing : undefined}
						close-icon={props['item-close-icon'] ? closeIcon : undefined}
						children={props.item ? content : undefined}
					/>
				{/each}
			{/if}
		</div>{#if props.trailing}
			<div class="so-tabs__trailing">{@render props.trailing()}</div>
		{/if}
	</div>{@render props.content?.()}
</Dynamic>
