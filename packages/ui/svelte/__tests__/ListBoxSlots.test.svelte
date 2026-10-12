<script lang="ts">
	/**
	 * Тестовая обёртка: слоты списка и элемента, которые рисуют своё не всегда —
	 * по условию внутри сниппета. Такой сниппет объявляется только в `.svelte`.
	 * Имя слота с дефисом — не имя сниппета, поэтому сниппет передаётся
	 * атрибутом.
	 *
	 * - `indicator` — элемент разметки с отметкой-слотом, которая рисуется
	 *   только у выбранного;
	 * - `owner-indicator` — список из данных, отметка-проброс рисуется только у
	 *   элемента `a`.
	 */
	import type { IListBoxItem } from '@soldy-ui/core'
	import { ListBox } from '@soldy-ui/svelte'

	type THarnessProps = {
		case: 'indicator' | 'owner-indicator'
	}

	const props: THarnessProps = $props()

	const ITEMS = [
		{ value: 'a', text: 'Первый' },
		{ value: 'b', text: 'Второй' },
	]
</script>

{#snippet indicatorIcon({ selected }: { selected: boolean })}
	{#if selected}<b class="custom">V</b>{/if}
{/snippet}

{#snippet itemIndicatorIcon({ item, selected }: { item: IListBoxItem; selected: boolean })}
	{#if item.value === 'a'}<b class="probe">{selected}</b>{/if}
{/snippet}

{#if props.case === 'indicator'}
	<ListBox indicator="start">
		<ListBox.Item value="a" text="A" indicator-icon={indicatorIcon} />
	</ListBox>
{:else}
	<ListBox
		items={ITEMS}
		mode="multiple"
		indicator="start"
		item-indicator-icon={itemIndicatorIcon}
	/>
{/if}
