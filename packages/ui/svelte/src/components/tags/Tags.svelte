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
	Tags — набор тегов: ряд (`div`), в нём теги, как у Vue.

	На корне — три набора ядра: `attrs`, `aria` и `dataset`. Роль ряда
	(`list` без выбора, `listbox` с выбором, `aria-orientation`,
	`aria-multiselectable`) пишет коллекция в `aria`, режим переполнения
	уезжает в тему через `data-overflow` (`dataset`), и раскладка ряда —
	перенос, прокрутка — целиком её дело. Атрибуты потребителя ложатся на корень
	поверх наборов, как у Vue: ряд с ролью и есть набор.

	Теги — содержимое (`<Tags.Item>`), а без него — показанные теги коллекции
	(`shown`), по `TagsItem` на тег, ключ — `uid` тега. `shown`, а не `items`:
	это то, что осталось после отбора, — скрытый тег размонтируется, но из
	коллекции не исчезает. Слот `default` получает показанные теги в scope и
	петлю заменяет: своя разметка раскладывает их, как ей нужно, — в ленту, в
	ряд с хвостом в панели, — и каждый тег рисуется ровно один раз: вторая
	отрисовка перетёрла бы его запись в реестре bundles.

	Слоты тегов статические и получают тег через scope. Проброс целиком: у
	каждого слота тега есть `item-<слот>` (`default` — `item`), и scope у него —
	scope слота тега плюс сам тег. Проброс — сниппет, который тег зовёт со своим
	scope, и отдаётся он тегу, только когда слот задан набору: сниппет
	непрозрачен, и без `item-close-icon` тег рисует свою иконку крестика, без
	`item` — текст.

	Тег, смонтированный внутри, входит в коллекцию набора при своей
	инициализации.
-->
{#if state.rendered}
	<Dynamic
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
{/if}
