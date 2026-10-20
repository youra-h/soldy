<script lang="ts">
	/**
	 * Тестовая обёртка: группа списка разметкой — «Вода» над группой «Фрукты»,
	 * «Сок» под ней, группы в `groups` не заявлены. Движок — снаружи: по нему
	 * тест читает секции. Смена подписи в `reactiveProps` — перерисовка родителя.
	 */
	import { ListBox } from '@soldy-ui/svelte'
	import type { TListBoxCollection } from '@soldy-ui/core'

	type THarnessProps = {
		/** Движок списка. */
		engine: TListBoxCollection
		/** Подпись группы. */
		label?: string
	}

	const { engine, label = 'Фрукты' }: THarnessProps = $props()
</script>

<ListBox {engine}>
	<ListBox.Item value="water" text="Вода" />
	<ListBox.Group {label}>
		<ListBox.Item value="apple" text="Яблоко" />
		<ListBox.Item value="pear" text="Груша" />
	</ListBox.Group>
	<ListBox.Item value="juice" text="Сок" />
</ListBox>
