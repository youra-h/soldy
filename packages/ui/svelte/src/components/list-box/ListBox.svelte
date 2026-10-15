<script lang="ts">
	import { Dynamic, toRootProps, toStyleText } from '../../adapter'
	import { ListBoxItem } from './item'
	import { setupListBox } from './setup.component'
	import type { ListBoxProps } from './base.component'

	let { ref = $bindable(), ...props }: ListBoxProps = $props()
	const mountId = $props.id()

	const binding = setupListBox(() => props, mountId, (node) => (ref = node))
	const state = binding.state

	// Список — сам остановка Tab: по элементам ходят стрелки его клавиатуры.
	// Набором ниже наборов ядра — атрибут потребителя `tabindex` его перекроет
	const FOCUSABLE = { tabindex: '0' }
</script>

<!--
	ListBox — список с выбором. Корень — `div` с `tabindex="0"`: список
	фокусируется сам, и его клавиатура (`TListKeyboardPlugin`) слушает корень.

	Элементы — содержимое (`<ListBox.Item>`), а без него — то, что рисует
	коллекция (`drawn`), по порядку, ключ — ключ записи. Без окна это все
	показанные элементы, по `ListBoxItem` на каждый. В окне — видимые и
	распорки на месте пропущенных: `div` под `aria-hidden`, высоту которого
	тема берёт из его стиля, а стиль пишет ядро. Одна петля на элементы и
	распорки: петли по блокам перемонтировали бы элемент, когда он переходит из
	блока в блок.

	Слоты элементов статические и получают элемент через scope. Проброс
	целиком: у каждого слота элемента есть `item-<слот>` (`default` — `item`),
	и scope у него — scope слота элемента плюс сам элемент: проброс — сниппет,
	который элемент зовёт со своим scope. Сниппет непрозрачен, и пустоту его
	отрисовки элемент не видит, поэтому проброс отдаётся элементу, только когда
	слот задан списку: без отметки элемент рисует свою, без `item` — текст.

	Пока показанных элементов нет, на их месте слот `empty` — как у Select:
	пустой `listbox` для скринридера — тупик.

	Элемент, смонтированный внутри, читает движок и регистратор списка лифтом
	(`setContext` списка) и входит в его коллекцию при своей инициализации.

	Части стоят вплотную: пробел между блоками Svelte оставил бы в списке
	текстом.
-->
{#if state.rendered}
	<Dynamic
		tag="div"
		attributes={toRootProps(
			state,
			[FOCUSABLE, state.attrs, state.aria, state.dataset],
			binding.forwardProps,
		)}
		attach={binding.attachElement}
	>
		{@render props.header?.()}{#if props.children}
			{@render props.children()}
		{:else}
			{#each state.drawn ?? [] as entry (entry.key)}
				{#if entry.kind === 'filler'}
					<div
						class="s-list-box__filler"
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
		{/if}{#if state.shown?.length === 0}
			{@render props.empty?.()}
		{/if}{@render props.footer?.()}
	</Dynamic>
{/if}
