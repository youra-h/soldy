import { ChangeDetectionStrategy, Component, signal } from '@angular/core'
import { AutoComplete } from 'primeng/autocomplete'
import { COLLECTION_ITEMS } from '../../../data'

type TItem = (typeof COLLECTION_ITEMS)[number]

/**
 * Select with typing and filtering — `p-autocomplete` with its dropdown
 * button, as the soldy `editable` preview; the filter is the docs' one
 * (`completeMethod`): options whose text contains the typed one.
 */
@Component({
	selector: 'bench-select',
	imports: [AutoComplete],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<p-autocomplete
			[suggestions]="shown()"
			(completeMethod)="filter($event.query)"
			optionLabel="text"
			[dropdown]="true"
			placeholder="Выберите"
		/>
	`,
})
export default class SelectPage {
	readonly shown = signal<TItem[]>([])

	filter(query: string): void {
		const text = query.toLowerCase()

		this.shown.set(COLLECTION_ITEMS.filter((item) => item.text.toLowerCase().includes(text)))
	}
}
