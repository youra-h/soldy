<script lang="ts">
	/**
	 * Тестовая обёртка: набор с тегами разметки. Теги — по пропсам из `items`,
	 * ключ — значение: смена пропсов тега — смена пропсов того же компонента,
	 * новое значение — новый тег. Смена `items` или `tags` в `reactiveProps` —
	 * перерисовка родителя.
	 */
	import { Tags, type TagsItemProps, type TagsProps } from '@soldy-ui/svelte'

	type THarnessProps = {
		/** Пропсы набора. */
		tags?: TagsProps
		/** Теги разметки — пропсы каждого `Tags.Item`. */
		items?: TagsItemProps[]
	}

	const { tags = {}, items = [] }: THarnessProps = $props()
</script>

<Tags {...tags}>
	{#each items as item (item.value)}
		<Tags.Item {...item} />
	{/each}
</Tags>
