<script lang="ts">
	import type { IListBoxItem, TDrawnEntry } from '@soldy-ui/core'
	import { Dynamic, toControlAttrs, toRootForward, toRootProps, toStyleText } from '../../adapter'
	import { ListBoxItem } from './item'
	import { ListBoxGroup } from './group'
	import { setupListBox } from './setup.component'
	import type { ListBoxAttributes, ListBoxProps } from './base.component'

	let { ref = $bindable(), ...props }: ListBoxProps = $props()
	const mountId = $props.id()

	const binding = setupListBox(() => props, mountId, (node) => (ref = node))
	const state = binding.state

	// Остановка Tab — набором ниже `aria` и атрибутов потребителя: их `tabindex` главнее
	const FOCUSABLE = { tabindex: 0 }
</script>

<!--
	Набор `aria` — на узле списка, а не на корне: шапка и подвал — место полей и кнопок, а в
	`listbox` ARIA пускает только опции и группы (поэтому и разделитель немой).
	Одна петля на элементы и распорки: петли по блокам перемонтировали бы элемент. Проброс
	слотов — только заданных: сниппет непрозрачен. Части вплотную: пробел Svelte оставил бы текстом.
-->
{#snippet entries(list: ReadonlyArray<TDrawnEntry<IListBoxItem>>)}
	{#each list as entry (entry.key)}
		{#if entry.kind === 'filler'}
			<div
				class="so-list-box__filler"
				aria-hidden="true"
				style={toStyleText(entry.style)}
			></div>
		{:else}
			{#snippet leading()}
				{@render props['item-leading']?.({ item: entry.item })}
			{/snippet}
			{#snippet content(scope: { text: string; selected: boolean })}
				{@render props.item?.({ ...scope, item: entry.item })}
			{/snippet}
			{#snippet trailing()}
				{@render props['item-trailing']?.({ item: entry.item })}
			{/snippet}
			{#snippet indicator(scope: { selected: boolean })}
				{@render props['item-indicator-icon']?.({ ...scope, item: entry.item })}
			{/snippet}
			<ListBoxItem
				ctrl={entry.item}
				leading={props['item-leading'] ? leading : undefined}
				trailing={props['item-trailing'] ? trailing : undefined}
				indicator-icon={props['item-indicator-icon'] ? indicator : undefined}
				children={props.item ? content : undefined}
			/>
		{/if}
	{/each}
{/snippet}
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
	{@render props.header?.()}<div
		class="so-list-box__list"
		{...FOCUSABLE}
		{...state.aria}
		{...toControlAttrs<ListBoxAttributes>(binding.forwardProps)}
	>
		{#if props.children}
			{@render props.children()}
		{:else}
			{#each state.drawnSections ?? [] as section, index (section.key)}
				{#if state.groupSeparators && index > 0}<div
						class="so-list-box__separator"
						aria-hidden="true"
					></div>{/if}{#if section.group}<ListBoxGroup label={section.group.label}
						>{@render entries(section.entries)}</ListBoxGroup
					>{:else}{@render entries(section.entries)}{/if}
			{/each}
		{/if}{#if state.shown?.length === 0}
			{@render props.empty?.()}
		{/if}
	</div>{@render props.footer?.()}
</Dynamic>
