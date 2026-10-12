<script lang="ts">
	/**
	 * Тестовая обёртка: набор с табами и панелями разметки. Табы — по пропсам из
	 * `items`, ключ — значение. Панели — `{ value, text }` по порядку, ключ —
	 * место: смена `value` — смена пропа той же панели, как у потребителя,
	 * который переносит панель к другому табу. Панели — в слоте `content`, а с
	 * `panelsInList` — в содержимом, то есть внутри `[role=tablist]`.
	 *
	 * Без табов разметки содержимого у набора нет, и он рисует табы из своих
	 * данных (`tabs.items`).
	 */
	import { Tabs, type TabsItemProps, type TabsProps } from '@soldy-ui/svelte'

	type TPanel = { value: string; text: string }

	type THarnessProps = {
		/** Пропсы набора. */
		tabs?: TabsProps
		/** Табы разметки — пропсы каждого `Tabs.Item`. */
		items?: TabsItemProps[]
		/** Панели разметки. */
		panels?: TPanel[]
		/** Панели — в содержимом набора, рядом с табами. */
		panelsInList?: boolean
	}

	const { tabs = {}, items = [], panels = [], panelsInList = false }: THarnessProps = $props()
</script>

{#snippet contents()}
	{#each panels as panel, index (index)}
		<Tabs.Content value={panel.value}>{panel.text}</Tabs.Content>
	{/each}
{/snippet}

{#snippet markup()}
	{#each items as item (item.value)}
		<Tabs.Item {...item} />
	{/each}
	{#if panelsInList}
		{@render contents()}
	{/if}
{/snippet}

<Tabs
	{...tabs}
	content={panelsInList ? undefined : contents}
	children={items.length > 0 || panelsInList ? markup : undefined}
/>
