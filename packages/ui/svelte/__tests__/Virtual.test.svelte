<script lang="ts">
	/**
	 * Тестовая обёртка: коллекция в окне `Virtual`.
	 *
	 * - `list` — ListBox, пропсы — `list`;
	 * - `table` — Table, пропсы — `table`;
	 * - `nested` — ListBox из данных (`list`), в слоте первого элемента — свой
	 *   ListBox на 55 элементов: списки в слотах элементов окна не наследуют.
	 *
	 * Пропсы обёртки — `virtual`; `listed: false` снимает коллекцию, оставляя
	 * обёртку.
	 */
	import type { IListBoxItem } from '@soldy-ui/core'
	import {
		ListBox,
		Table,
		Virtual,
		type ListBoxProps,
		type TableProps,
		type VirtualProps,
	} from '@soldy-ui/svelte'

	type THarnessProps = {
		kind?: 'list' | 'table' | 'nested'
		virtual?: VirtualProps
		list?: ListBoxProps
		table?: TableProps
		/** Рисовать ли коллекцию в обёртке. */
		listed?: boolean
	}

	const props: THarnessProps = $props()

	/** Элементы вложенного списка. */
	const INNER = Array.from({ length: 55 }, (_, index) => ({
		value: `i${index + 1}`,
		text: `Вложенный ${index + 1}`,
	}))
</script>

{#snippet item({ item }: { item: IListBoxItem; text: string; selected: boolean })}
	{#if item.value === 'v1'}<ListBox class="inner" items={INNER} />{:else}{item.text}{/if}
{/snippet}

<Virtual {...props.virtual}>
	{#if props.listed ?? true}
		{#if props.kind === 'table'}
			<Table {...props.table} />
		{:else if props.kind === 'nested'}
			<ListBox class="outer" {...props.list} {item} />
		{:else}
			<ListBox {...props.list} />
		{/if}
	{/if}
</Virtual>
