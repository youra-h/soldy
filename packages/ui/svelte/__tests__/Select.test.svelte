<script lang="ts">
	/**
	 * Тестовая обёртка: Select с опциями разметки, как `Select.test.vue` у Vue,
	 * — по умолчанию три города, «Тула» выключена, имя поля «Город». Опции — по
	 * пропсам из `items`, ключ — значение: смена пропсов опции — смена пропсов
	 * того же компонента. Смена `select` или `items` в `reactiveProps` —
	 * перерисовка родителя.
	 */
	import { Select, type SelectItemProps, type SelectProps } from '@soldy-ui/svelte'

	type THarnessProps = {
		/** Пропсы Select. */
		select?: SelectProps
		/** Опции разметки — пропсы каждого `Select.Item`. */
		items?: SelectItemProps[]
	}

	const CITIES: SelectItemProps[] = [
		{ value: 'msk', text: 'Москва' },
		{ value: 'tver', text: 'Тверь' },
		{ value: 'tula', text: 'Тула', disabled: true },
	]

	const { select = {}, items = CITIES }: THarnessProps = $props()
</script>

<Select name="Город" {...select}>
	{#each items as item (item.value)}
		<Select.Item {...item} />
	{/each}
</Select>
