import { Component, signal } from '@angular/core'
import {
	TButtonComponent,
	TDatePickerComponent,
	TDialogComponent,
	TInputComponent,
	TSelectComponent,
	TTableComponent,
} from '@soldy-ui/angular'

@Component({
	selector: 'app-root',
	imports: [
		TButtonComponent,
		TDatePickerComponent,
		TDialogComponent,
		TInputComponent,
		TSelectComponent,
		TTableComponent,
	],
	template: `
		<main>
			<button so-button text="Open dialog" variant="accent" (click)="open.set(true)"></button>
			<div so-dialog [visible]="open()" (soChangeVisible)="open.set($event)">
				<span slot="title">Settings</span>
				<p>Dialog content</p>
			</div>
			<div so-input placeholder="Name" aria_label="Name"></div>
			<div so-select placeholder="City" aria_label="City" [items]="cities"></div>
			<div so-table aria_label="Staff" [columns]="columns" [items]="rows"></div>
			<div so-date-picker aria_label="Date"></div>
		</main>
	`,
})
export class App {
	protected readonly open = signal(false)

	protected readonly cities = [
		{ value: 'kzn', text: 'Kazan' },
		{ value: 'msk', text: 'Moscow' },
		{ value: 'oms', text: 'Omsk' },
	]

	protected readonly columns = [
		{ field: 'name', text: 'Name', rowHeader: true },
		{ field: 'age', text: 'Age', align: 'end' as const },
	]

	protected readonly rows = [
		{ data: { name: 'Anna', age: 30 } },
		{ data: { name: 'Boris', age: 41 } },
	]
}
