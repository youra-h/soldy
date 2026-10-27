<script lang="ts" module>
	import type { IMenuItem, TGroupSection, TMenuSubmenuEntries } from '@soldy-ui/core'
	import { MenuGroup } from '../group'
	import { MenuItem } from '../item'
	import { MenuSeparator } from '../separator'
	import MenuSubmenu from './Submenu.svelte'
	import type { MenuSubmenuProps } from './base.component'

	/** Что пунктам из данных нужно от состояния владельца — меню или подменю. */
	type TItemsState = {
		readonly sections?: ReadonlyArray<TGroupSection<IMenuItem>>
		readonly submenus?: TMenuSubmenuEntries
		readonly groupSeparators?: boolean
	}

	/** Слоты пунктов из данных — одни на все уровни: подменю получает их под теми же именами. */
	type TItemSlots = Pick<
		MenuSubmenuProps,
		'item' | 'item-leading' | 'item-trailing' | 'item-header' | 'item-arrow-icon' | 'item-content'
	>

	export { drawItems }
</script>

<script lang="ts">
	import { chainHandler, Dynamic, roleIcon, toControlAttrs, toRootForward, toRootProps } from '../../../adapter'
	import { ItemRow } from '../../item-row'
	import { Frame } from '../../frame'
	import { Icon } from '../../icon'
	import { setupMenuSubmenu } from './setup.component'
	import type { MenuSubmenuAttributes } from './base.component'

	let { ref = $bindable(), ...props }: MenuSubmenuProps = $props()
	const mountId = $props.id()

	const binding = setupMenuSubmenu(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const context = binding.context

	const ARROW = roleIcon('arrowRight')
</script>

<!--
	Пункты из данных — сниппет модуля, один на меню и подменю: инстансного `<script>` он
	не видит, поэтому части меню и само подменю — импорты модуля.
-->
{#snippet drawItems(state: TItemsState, slots: TItemSlots)}
	{#each state.sections ?? [] as section, index (section.key)}
		{#if state.groupSeparators && index > 0}<MenuSeparator />{/if}{#if section.group}
			<MenuGroup label={section.group.label}
				>{@render drawSection(section, state, slots)}</MenuGroup
			>
		{:else}
			{@render drawSection(section, state, slots)}
		{/if}
	{/each}
{/snippet}

{#snippet drawSection(section: TGroupSection<IMenuItem>, state: TItemsState, slots: TItemSlots)}
	{#each section.items as item (item.uid)}
		{@render drawItem(item, state, slots)}
	{/each}
{/snippet}

<!--
	Снятое с пунктом подменю Svelte читает и после ухода записи: спред пустой записи безопасен,
	а `entry.ctrl` бросил бы. Проброс — только заданного слота: сниппет непрозрачен.
-->
{#snippet drawItem(item: IMenuItem, state: TItemsState, slots: TItemSlots)}
	{@const entry = state.submenus?.get(item)}
	{#snippet leading()}
		{@render slots['item-leading']?.({ item })}
	{/snippet}
	{#snippet content(scope: { text: string })}
		{@render slots.item?.({ ...scope, item })}
	{/snippet}
	{#snippet trailing()}
		{@render slots['item-trailing']?.({ item })}
	{/snippet}
	{#snippet header(scope: { text: string; open: boolean })}
		{@render slots['item-header']?.({ ...scope, item })}
	{/snippet}
	{#snippet arrow()}
		{@render slots['item-arrow-icon']?.({ item })}
	{/snippet}
	{#snippet panel()}
		{@render slots['item-content']?.({ item })}
	{/snippet}
	{#if entry}
		<MenuSubmenu
			{...entry}
			leading={slots['item-leading'] ? leading : undefined}
			header={slots['item-header'] ? header : undefined}
			arrow-icon={slots['item-arrow-icon'] ? arrow : undefined}
			children={slots['item-content'] ? panel : undefined}
			item={slots.item}
			item-leading={slots['item-leading']}
			item-trailing={slots['item-trailing']}
			item-header={slots['item-header']}
			item-arrow-icon={slots['item-arrow-icon']}
			item-content={slots['item-content']}
		/>
	{:else}
		<MenuItem
			ctrl={item}
			leading={slots['item-leading'] ? leading : undefined}
			trailing={slots['item-trailing'] ? trailing : undefined}
			children={slots.item ? content : undefined}
		/>
	{/if}
{/snippet}

<!--
	Открытость — `visible` панели, а не `rendered`: закрытие не должно вычищать коллекцию.
	Пункты в панели читают лифт подменю: `Teleport` монтирует её с контекстами места.
	Части и обёртка значка — вплотную: пробел между блоками Svelte оставил бы текст, а пустой
	значок тема прячет по `:empty`.
-->
{#snippet arrowIcon()}
	{#if props['arrow-icon']}
		{@render props['arrow-icon']()}
	{:else}
		<Icon embedded="menu.arrow" tag={ARROW} size={state.size} />
	{/if}
{/snippet}

<Dynamic
	rendered={state.rendered}
	tag={state.tag}
	attributes={toRootProps(
		state,
		[state.dataset, state.attrs],
		toRootForward(binding.forwardProps),
	)}
	attach={binding.attachElement}
>
	<ItemRow
		embedded="menu.row"
		tag="div"
		size={state.size}
		disabled={state.disabled}
		{...state.aria}
		{...toControlAttrs<MenuSubmenuAttributes>(binding.forwardProps)}
		onclick={chainHandler(() => context?.adapters.menu.open(), binding.forwardProps.onclick)}
	>
		{#snippet leading()}
			<span class="so-menu-item__icon">{@render props.leading?.()}</span>
		{/snippet}
		{#if props.header}
			{@render props.header({ text: state.text ?? '', open: state.open ?? false })}
		{:else}
			{state.text}
		{/if}
		{#snippet trailing()}
			<span class="so-menu-item__arrow" aria-hidden="true">{@render arrowIcon()}</span>
		{/snippet}
	</ItemRow><Frame
		embedded="menu.submenu-frame"
		class={state.panelClasses}
		tabindex={-1}
		visible={state.open}
		position="fixed"
		anchor_anchor={binding.rootElement}
		anchor_placement="end-start"
		{...state.panelAria}
		{...state.dismiss_ownerAttribute}
	>
		<!-- Items from the panel's first opening on (`contentRendered`) -->
		<div class="so-menu__list">
			{#if state.contentRendered}
				{#if props.children}
					{@render props.children()}
				{:else}
					{@render drawItems(state, props)}
				{/if}
			{/if}
		</div>
	</Frame>
</Dynamic>
