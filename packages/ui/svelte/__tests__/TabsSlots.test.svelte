<script lang="ts">
	/**
	 * Тестовая обёртка: набор табов из данных с крестиком-пробросом, который
	 * рисуется только у таба `a`, — по условию внутри сниппета. Такой сниппет
	 * объявляется только в `.svelte`; имя слота с дефисом — не имя сниппета,
	 * поэтому сниппет передаётся атрибутом.
	 */
	import type { ITabsItem } from '@soldy-ui/core'
	import { Tabs } from '@soldy-ui/svelte'

	const ITEMS = [
		{ value: 'a', text: 'A', _: { active: true } },
		{ value: 'b', text: 'B' },
	]
</script>

{#snippet closeIcon({ item }: { item: ITabsItem })}
	{#if item.value === 'a'}<b class="probe">×</b>{/if}
{/snippet}

<Tabs closable items={ITEMS} item-close-icon={closeIcon} />
