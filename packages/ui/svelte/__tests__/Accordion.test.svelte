<script lang="ts">
	/**
	 * Тестовая обёртка: аккордеон с секциями разметки. Секции — по пропсам из
	 * `items`, ключ — значение; содержимое панели — абзац с текстом из
	 * `bodies` по значению секции.
	 */
	import { Accordion, type AccordionItemProps, type AccordionProps } from '@soldy-ui/svelte'

	type THarnessProps = {
		/** Пропсы аккордеона. */
		accordion?: AccordionProps
		/** Секции разметки — пропсы каждого `Accordion.Item`. */
		items?: AccordionItemProps[]
		/** Текст панели по значению секции; нет — панель пуста. */
		bodies?: Readonly<Record<string, string>>
	}

	const { accordion = {}, items = [], bodies = {} }: THarnessProps = $props()
</script>

<Accordion {...accordion}>
	{#each items as item (item.value)}
		<Accordion.Item {...item}>
			{#if bodies[String(item.value)]}<p>{bodies[String(item.value)]}</p>{/if}
		</Accordion.Item>
	{/each}
</Accordion>
