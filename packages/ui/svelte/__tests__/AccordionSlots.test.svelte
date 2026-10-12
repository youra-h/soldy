<script lang="ts">
	/**
	 * Тестовая обёртка: аккордеон из данных со стрелкой-пробросом, которая
	 * рисуется только у одной секции, — по условию внутри сниппета. Такой
	 * сниппет объявляется только в `.svelte`; имя слота с дефисом — не имя
	 * сниппета, поэтому сниппет передаётся атрибутом.
	 *
	 * - `leading-icon` — стрелка в начале, только у секции `a`;
	 * - `trailing-icon` — стрелка в конце, только у секции `b`.
	 */
	import type { IAccordionItem } from '@soldy-ui/core'
	import { Accordion } from '@soldy-ui/svelte'

	type THarnessProps = {
		case: 'leading-icon' | 'trailing-icon'
	}

	const props: THarnessProps = $props()

	const ITEMS = [
		{ value: 'a', text: 'Первый' },
		{ value: 'b', text: 'Второй' },
	]
</script>

{#snippet leadingIcon({ item }: { item: IAccordionItem })}
	{#if item.value === 'a'}<b class="probe">›</b>{/if}
{/snippet}

{#snippet trailingIcon({ item }: { item: IAccordionItem })}
	{#if item.value === 'b'}<b class="probe">›</b>{/if}
{/snippet}

{#if props.case === 'leading-icon'}
	<Accordion items={ITEMS} item-leading-icon={leadingIcon} />
{:else}
	<Accordion items={ITEMS} item-trailing-icon={trailingIcon} />
{/if}
