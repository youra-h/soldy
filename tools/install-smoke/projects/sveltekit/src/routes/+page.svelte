<script lang="ts">
	import type { ComponentProps } from 'svelte'
	import { Button, DatePicker, Dialog, Input, Select, Table } from '@soldy-ui/svelte'

	let open = $state(false)

	const cities = [
		{ value: 'kzn', text: 'Kazan' },
		{ value: 'msk', text: 'Moscow' },
		{ value: 'oms', text: 'Omsk' },
	]

	const columns = [
		{ field: 'name', text: 'Name', rowHeader: true },
		{ field: 'age', text: 'Age', align: 'end' as const },
	]

	const rows = [{ data: { name: 'Anna', age: 30 } }, { data: { name: 'Boris', age: 41 } }]

	// @ts-expect-error `disabled` is a boolean: the adapter's types reach the project
	const typed: ComponentProps<typeof Button> = { disabled: 'yes' }

	void typed
</script>

<main>
	<Button text="Open dialog" onclick={() => (open = true)} />
	<Dialog visible={open} onChangeVisible={(value: boolean) => (open = value)}>
		{#snippet title()}Settings{/snippet}
		<p>Dialog content</p>
	</Dialog>
	<Input placeholder="Name" aria_label="Name" />
	<Select placeholder="City" aria_label="City" items={cities} />
	<Table aria_label="Staff" {columns} items={rows} />
	<DatePicker aria_label="Date" />
</main>
