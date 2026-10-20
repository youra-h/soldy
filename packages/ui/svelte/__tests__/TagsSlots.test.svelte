<script lang="ts">
	/**
	 * Тестовая обёртка: слоты набора, которые объявляются только в `.svelte`, —
	 * по условию внутри сниппета и со своей разметкой. Имя слота с дефисом — не
	 * имя сниппета, поэтому сниппет передаётся атрибутом.
	 *
	 * - `close-icon` — набор из данных, крестик-проброс рисуется только у тега
	 *   `b`;
	 * - `own` — набор из данных со своей раскладкой показанных тегов: обёртка
	 *   `.own` и в ней по `Tags.Item` на тег.
	 */
	import type { ITagsItem } from '@soldy-ui/core'
	import { Tags } from '@soldy-ui/svelte'

	type THarnessProps = {
		case: 'close-icon' | 'own'
	}

	const props: THarnessProps = $props()

	const ITEMS = [
		{ value: 'a', text: 'Первый' },
		{ value: 'b', text: 'Второй' },
	]

	const CITIES = ['Москва', 'Тверь', 'Тула'].map((text) => ({ value: text, text }))
</script>

{#snippet closeIcon({ item }: { item: ITagsItem })}
	{#if item.value === 'b'}<b class="probe">×</b>{/if}
{/snippet}

{#snippet own({ shown }: { shown: ReadonlyArray<ITagsItem> })}
	<div class="own">
		{#each shown as item (item.uid)}
			<Tags.Item ctrl={item} />
		{/each}
	</div>
{/snippet}

{#if props.case === 'close-icon'}
	<Tags closable items={ITEMS} item-close-icon={closeIcon} />
{:else}
	<Tags closable items={CITIES} children={own} />
{/if}
