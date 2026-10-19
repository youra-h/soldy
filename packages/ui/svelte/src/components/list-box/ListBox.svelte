<script lang="ts">
	import { Dynamic, toRootProps, toStyleText } from '../../adapter'
	import { ListBoxItem } from './item'
	import { setupListBox } from './setup.component'
	import type { ListBoxProps } from './base.component'

	let { ref = $bindable(), ...props }: ListBoxProps = $props()
	const mountId = $props.id()

	const binding = setupListBox(() => props, mountId, (node) => (ref = node))
	const state = binding.state

	// Узел списка — сам остановка Tab: по элементам ходят стрелки его
	// клавиатуры. Набором ниже набора `aria`, как статика разметки у Vue
	const FOCUSABLE = { tabindex: 0 }
</script>

<!--
	ListBox — список с выбором. Корень — рамка: шапка, узел списка
	(`so-list-box__list`) и подвал. Набор `aria` владельца — это сам список
	(`role="listbox"`, `aria-multiselectable`, имя от `aria_label`), и лежит он
	на узле списка: в `listbox` ARIA пускает только опции, а шапка и подвал —
	место полей и кнопок. На узле списка и остановка Tab: список фокусируется
	сам, и клавиши его клавиатуры (`TListKeyboardPlugin`) — с этого узла. На
	корне — `attrs` и `dataset`, как у Vue.

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

	Пока показанных элементов нет, на их месте слот `empty`, внутри списка, —
	как у Select: пустой `listbox` для скринридера — тупик.

	Элемент, смонтированный внутри, читает движок и регистратор списка лифтом
	(`setContext` списка) и входит в его коллекцию при своей инициализации.

	Части стоят вплотную: пробел между блоками Svelte оставил бы в списке и
	корне текстом.
-->
{#if state.rendered}
	<Dynamic
		tag="div"
		attributes={toRootProps(state, [state.attrs, state.dataset], binding.forwardProps)}
		attach={binding.attachElement}
	>
		{@render props.header?.()}<div class="so-list-box__list" {...FOCUSABLE} {...state.aria}>
			{#if props.children}
				{@render props.children()}
			{:else}
				{#each state.drawn ?? [] as entry (entry.key)}
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
			{/if}{#if state.shown?.length === 0}
				{@render props.empty?.()}
			{/if}
		</div>{@render props.footer?.()}
	</Dynamic>
{/if}
