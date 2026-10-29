import { Button, DatePicker, Input, Select, Table } from '@soldy-ui/react'
import { DialogDemo } from './dialog-demo'

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

/**
 * A server component, as a page of Next.js is by default: it renders the
 * library's components without a `'use client'` of its own.
 */
export default function Home() {
	return (
		<main>
			<DialogDemo />
			<Input placeholder="Name" aria_label="Name" />
			<Select placeholder="City" aria_label="City" items={cities} />
			<Table aria_label="Staff" columns={columns} items={rows} />
			<DatePicker aria_label="Date" />
			{false && (
				// @ts-expect-error `disabled` is a boolean: the adapter's types reach the project
				<Button disabled="yes" />
			)}
		</main>
	)
}
