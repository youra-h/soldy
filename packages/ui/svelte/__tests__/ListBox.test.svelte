<script lang="ts">
	/**
	 * Тестовая обёртка: список с элементами разметки. Элементы — по пропсам из
	 * `items`, ключ — значение: смена пропсов элемента — смена пропсов того же
	 * компонента, новое значение — новый элемент. Смена `items` или `list` в
	 * `reactiveProps` — перерисовка родителя.
	 */
	import { ListBox, type ListBoxItemProps, type ListBoxProps } from '@soldy-ui/svelte'

	type THarnessProps = {
		/** Пропсы списка. */
		list?: ListBoxProps
		/** Элементы разметки — пропсы каждого `ListBox.Item`. */
		items?: ListBoxItemProps[]
	}

	const { list = {}, items = [] }: THarnessProps = $props()
</script>

<ListBox {...list}>
	{#each items as item (item.value)}
		<ListBox.Item {...item} />
	{/each}
</ListBox>
