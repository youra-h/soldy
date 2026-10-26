import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core'
import { MatAutocompleteModule } from '@angular/material/autocomplete'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { COLLECTION_ITEMS } from '../../../data'

/**
 * Select with typing and filtering — `mat-autocomplete` over a field, as the
 * soldy `editable` preview; the filter is the one of the docs example
 * («Filter autocomplete»): options whose text contains the typed one.
 */
@Component({
	selector: 'bench-select',
	imports: [MatAutocompleteModule, MatFormFieldModule, MatInputModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<mat-form-field>
			<input
				#field
				matInput
				placeholder="Выберите"
				[matAutocomplete]="auto"
				[value]="query()"
				(input)="query.set(field.value)"
			/>
			<mat-autocomplete
				#auto="matAutocomplete"
				(optionSelected)="query.set($event.option.value)"
			>
				@for (item of shown(); track item.value) {
					<mat-option [value]="item.text">{{ item.text }}</mat-option>
				}
			</mat-autocomplete>
		</mat-form-field>
	`,
})
export default class SelectPage {
	readonly query = signal('')
	readonly shown = computed(() => {
		const text = this.query().toLowerCase()

		return COLLECTION_ITEMS.filter((item) => item.text.toLowerCase().includes(text))
	})
}
