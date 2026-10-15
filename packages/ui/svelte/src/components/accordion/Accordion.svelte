<script lang="ts">
	import { Dynamic, toRootProps } from '../../adapter'
	import { AccordionItem } from './item'
	import { setupAccordion } from './setup.component'
	import type { AccordionProps } from './base.component'

	let { ref = $bindable(), ...props }: AccordionProps = $props()
	const mountId = $props.id()

	const binding = setupAccordion(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!--
	Accordion — набор раскрывающихся секций. На корне — `attrs`, как у Vue.

	Секции — содержимое (`<Accordion.Item>`), а без него — `shown` коллекции,
	по `AccordionItem` на элемент. Слоты элементов статические и получают
	элемент через scope: `item` — заголовок, `item-leading` и `item-trailing` —
	по его краям, `item-leading-icon` и `item-trailing-icon` — стрелки,
	`item-content` — содержимое панели. Отдельного `Accordion.Content` нет:
	панель лежит внутри секции и отдельно от неё не существует.

	Проброс целиком: у каждого слота секции есть `item-<слот>`, и scope у него —
	scope слота секции плюс сама секция. Проброс — сниппет, и отдаётся он
	секции, только когда слот задан аккордеону: по наличию слота стрелки секция
	решает, стоять ли обёртке стрелки на этой стороне, а без `item` рисует
	текст.

	Секция, смонтированная внутри, входит в коллекцию аккордеона при своей
	инициализации.
-->
{#if state.rendered}
	<Dynamic
		tag="div"
		attributes={toRootProps(state, [state.attrs], binding.forwardProps)}
		attach={binding.attachElement}
	>
		{#if props.children}
			{@render props.children()}
		{:else}
			{#each state.shown ?? [] as section (section.uid)}
				{#snippet leadingIcon()}
					{@render props['item-leading-icon']?.({ item: section })}
				{/snippet}
				{#snippet leading()}{@render props['item-leading']?.({ item: section })}{/snippet}
				{#snippet header(scope: { text: string; selected: boolean })}
					{@render props.item?.({ ...scope, item: section })}
				{/snippet}
				{#snippet trailing()}{@render props['item-trailing']?.({ item: section })}{/snippet}
				{#snippet trailingIcon()}
					{@render props['item-trailing-icon']?.({ item: section })}
				{/snippet}
				{#snippet content()}{@render props['item-content']?.({ item: section })}{/snippet}
				<AccordionItem
					ctrl={section}
					leading-icon={props['item-leading-icon'] ? leadingIcon : undefined}
					leading={props['item-leading'] ? leading : undefined}
					header={props.item ? header : undefined}
					trailing={props['item-trailing'] ? trailing : undefined}
					trailing-icon={props['item-trailing-icon'] ? trailingIcon : undefined}
					children={props['item-content'] ? content : undefined}
				/>
			{/each}
		{/if}
	</Dynamic>
{/if}
