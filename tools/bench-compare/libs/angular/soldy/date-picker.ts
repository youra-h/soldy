import { ChangeDetectionStrategy, Component } from '@angular/core'
import { TDatePickerComponent } from '@soldy-ui/angular'

/** The preview of `packages/playground/vue/src/hosts/angular/` with `PREVIEW_PROPS`. */
@Component({
	selector: 'bench-date-picker',
	imports: [TDatePickerComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `<div so-date-picker aria_label="Дата"></div>`,
})
export default class DatePickerPage {}
