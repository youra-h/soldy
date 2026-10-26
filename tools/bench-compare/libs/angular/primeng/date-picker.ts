import { ChangeDetectionStrategy, Component } from '@angular/core'
import { DatePicker } from 'primeng/datepicker'

/** A date field with a calendar in a popup — the docs' datepicker with its icon button. */
@Component({
	selector: 'bench-date-picker',
	imports: [DatePicker],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<p-datepicker [showIcon]="true" placeholder="Дата" ariaLabel="Дата" />`,
})
export default class DatePickerPage {}
