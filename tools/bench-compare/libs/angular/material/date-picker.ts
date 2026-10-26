import { ChangeDetectionStrategy, Component } from '@angular/core'
import { MatDatepickerModule } from '@angular/material/datepicker'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'

/** A date field with a calendar in a popup — the docs' basic datepicker. */
@Component({
	selector: 'bench-date-picker',
	imports: [MatDatepickerModule, MatFormFieldModule, MatInputModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<mat-form-field>
			<mat-label>Дата</mat-label>
			<input matInput [matDatepicker]="picker" />
			<mat-datepicker-toggle matIconSuffix [for]="picker" />
			<mat-datepicker #picker />
		</mat-form-field>
	`,
})
export default class DatePickerPage {}
