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
	Tabs — набор табов: список (`so-tabs__list`) и панели рядом с ним.

	Набор `aria` владельца — это список табов: `role="tablist"` и
	`aria-orientation` пишет ядро, имя из `aria_label` — `TAriaPlugin`. Корень
	его не получает: рядом со списком там лежат панели. На корне — `attrs` и
	`dataset`, как у Vue: выключенный набор тема гасит корнем, вместе с
	панелями (`data-disabled`).

	Атрибуты потребителя делятся, как у поля и у Vue: класс и стиль — корню,
	остальное — списку табов, поверх его `aria`, и attachment потребителя —
	тоже ему: `aria-label` и `id` потребителя называют список, а не корень без
	роли. `ref` — корень.

	Табы — содержимое (`<Tabs.Item>`), а без него — `shown` коллекции, по
	`TabsItem` на элемент. Слоты элементов статические и получают элемент
	через scope. Проброс целиком: у каждого слота таба есть `item-<слот>`
	(`default` — `item`), и scope у него — scope слота таба плюс сам таб.
	Проброс — сниппет, который таб зовёт со своим scope, и отдаётся он табу,
	только когда слот задан набору: сниппет непрозрачен, и без `item-close-icon`
	таб рисует свою иконку крестика, без `item` — текст.

	Панели (`<Tabs.Content>`) — слот `content`, вне списка: содержимое лежит
	внутри `[role=tablist]`, и панель там оказалась бы в списке табов. Тема
	рисует вид набора от его корня дочерними комбинаторами: список и панели —
	дети корня, табы — дети списка.

	Таб, смонтированный внутри, входит в коллекцию набора при своей
	инициализации, а панель находит свой таб в её движке.

	Части стоят вплотную: пробел между блоками Svelte оставил бы в списке и
	корне текстом.
-->
{#if state.rendered}
	<Dynamic
		tag="div"
		attributes={toRootProps(
			state,
			[state.attrs, state.dataset],
			toRootForward(binding.forwardProps),
		)}
		attach={binding.attachElement}
	>
		<div
			class="so-tabs__list"
			{...state.aria}
			{...toControlAttrs<TabsAttributes>(binding.forwardProps)}
		>
			{#if props.leading}
				<div class="so-tabs__list--leading">{@render props.leading()}</div>
			{/if}{#if props.children}
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
			{/if}{#if props.trailing}
				<div class="so-tabs__list--trailing">{@render props.trailing()}</div>
			{/if}
		</div>{@render props.content?.()}
	</Dynamic>
{/if}
