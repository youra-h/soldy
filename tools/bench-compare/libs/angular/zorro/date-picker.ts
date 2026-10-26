import { ChangeDetectionStrategy, Component } from '@angular/core'
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker'

/** A date field with a calendar in a popup — the docs' basic date picker. */
@Component({
	selector: 'bench-date-picker',
	imports: [NzDatePickerModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<nz-date-picker nzPlaceHolder="Дата" />`,
})
export default class DatePickerPage {}
