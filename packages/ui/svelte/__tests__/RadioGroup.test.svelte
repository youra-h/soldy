<script lang="ts">
	/**
	 * Тестовая обёртка: группа с радио разметки. Радио — по пропсам из `items`,
	 * ключ — значение; подпись — текст из `labels` по значению радио, без него
	 * у радио содержимого нет вовсе. `shown: false` снимает группу целиком.
	 */
	import { RadioGroup, type RadioGroupItemProps, type RadioGroupProps } from '@soldy-ui/svelte'

	type THarnessProps = {
		/** Пропсы группы. */
		group?: RadioGroupProps
		/** Радио разметки — пропсы каждого `RadioGroup.Item`. */
		items?: RadioGroupItemProps[]
		/** Подпись по значению радио. */
		labels?: Readonly<Record<string, string>>
		/** Группа в разметке; `false` — снята. */
		shown?: boolean
	}

	const { group = {}, items = [], labels = {}, shown = true }: THarnessProps = $props()
</script>

{#if shown}
	<RadioGroup {...group}>
		{#each items as item (item.value)}
			{#if labels[String(item.value)] === undefined}
				<RadioGroup.Item {...item} />
			{:else}
				<RadioGroup.Item {...item}>{labels[String(item.value)]}</RadioGroup.Item>
			{/if}
		{/each}
	</RadioGroup>
{/if}
