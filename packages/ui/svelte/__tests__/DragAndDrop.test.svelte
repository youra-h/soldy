<script lang="ts">
	/**
	 * Тестовая обёртка: коллекции в обёртке `DragAndDrop`.
	 *
	 * - `collections` — Tabs и Accordion разметкой, ListBox данными, на одном
	 *   составе (`ITEMS`);
	 * - `list` — ListBox данными, пропсы — `list`;
	 * - `nested` — секция Accordion, в её панели — ListBox данными: список в
	 *   элементе коллекции перестановку не наследует.
	 *
	 * Пропсы обёртки — `dragAndDrop`; `wrapped: false` рисует те же коллекции
	 * без обёртки, `listed: false` снимает их, оставляя обёртку.
	 */
	import {
		Accordion,
		DragAndDrop,
		ListBox,
		Tabs,
		type DragAndDropProps,
		type ListBoxProps,
	} from '@soldy-ui/svelte'

	type THarnessProps = {
		kind?: 'collections' | 'list' | 'nested'
		dragAndDrop?: DragAndDropProps
		list?: ListBoxProps
		/** Коллекции — в обёртке. */
		wrapped?: boolean
		/** Рисовать ли коллекции в обёртке. */
		listed?: boolean
	}

	const props: THarnessProps = $props()

	/** Состав коллекций: значение и текст. */
	const ITEMS = ['a', 'b', 'c'].map((value) => ({ value, text: value.toUpperCase() }))
</script>

{#snippet content()}
	{#if props.listed ?? true}
		{#if props.kind === 'list'}
			<ListBox items={ITEMS} aria_label="Пункты" {...props.list} />
		{:else if props.kind === 'nested'}
			<Accordion>
				<Accordion.Item value="a" text="A">
					<ListBox items={ITEMS} aria_label="Пункты" />
				</Accordion.Item>
			</Accordion>
		{:else}
			<Tabs>
				{#each ITEMS as item, index (item.value)}
					<Tabs.Item active={index === 0} {...item} />
				{/each}
			</Tabs>
			<ListBox items={ITEMS} aria_label="Пункты" />
			<Accordion>
				{#each ITEMS as item (item.value)}
					<Accordion.Item {...item}>Содержимое {item.text}</Accordion.Item>
				{/each}
			</Accordion>
		{/if}
	{/if}
{/snippet}

{#if props.wrapped ?? true}
	<DragAndDrop {...props.dragAndDrop}>{@render content()}</DragAndDrop>
{:else}
	<div>{@render content()}</div>
{/if}
