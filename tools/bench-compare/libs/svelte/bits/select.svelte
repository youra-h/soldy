<script lang="ts">
	import { Combobox } from 'bits-ui'
	import { COLLECTION_ITEMS } from '../../../data'

	/**
	 * Select with typing and filtering — `Combobox`, as the soldy `editable`
	 * preview. Bits leaves filtering to the application: the list is filtered
	 * by the typed text, as its documentation shows.
	 */
	const items = COLLECTION_ITEMS.map((item) => ({ value: item.value, label: item.text }))
	let search = $state('')
	const shown = $derived(
		search === ''
			? items
			: items.filter((item) => item.label.toLowerCase().includes(search.toLowerCase())),
	)
</script>

<Combobox.Root
	type="single"
	{items}
	onOpenChange={(open) => {
		if (!open) search = ''
	}}
>
	<div class="bits-combobox">
		<Combobox.Input
			placeholder="Выберите"
			oninput={(event) => (search = event.currentTarget.value)}
		/>
		<Combobox.Trigger aria-label="Открыть">▾</Combobox.Trigger>
	</div>
	<Combobox.Portal>
		<Combobox.Content>
			{#each shown as item (item.value)}
				<Combobox.Item value={item.value} label={item.label}>
					{#snippet children({ selected })}{item.label}{selected ? ' ✓' : ''}{/snippet}
				</Combobox.Item>
			{/each}
		</Combobox.Content>
	</Combobox.Portal>
</Combobox.Root>
