import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IDatePicker } from '@soldy-ui/core'
import {
	AttributesDirective,
	RoleIconDirective,
	SlotDirective,
	provideElevator,
} from '../../adapter'
import { TButtonComponent } from '../button'
import { TCalendarComponent } from '../calendar'
import { TDateInputComponent } from '../date-input'
import { TFrameComponent } from '../frame'
import { TIconComponent } from '../icon'
import { TDatePickerSurface } from '../../generated/date-picker.metadata'
import { setupDatePicker } from './setup.component'

/**
 * Поле даты и календарь в панели, как Select — поле и список (APG, Date Picker Dialog).
 * AGENTS.md (Angular), «Даты — поле из частей, сетка из `td`, поле с календарём в панели».
 */
@Component({
	selector: 'div[so-date-picker], [so-date-picker]',
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		SlotDirective,
		TButtonComponent,
		TCalendarComponent,
		TDateInputComponent,
		TFrameComponent,
		TIconComponent,
	],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './date-picker.component.html',
})
export class TDatePickerComponent extends TDatePickerSurface<IDatePicker> {
	constructor() {
		super(setupDatePicker, { strategy: 'host', aria: 'rootAria', id: 'id' })
	}

	/** Очистка — командой DatePicker'а; клик не всплывает, как `@click.stop` у Vue. */
	protected clearClick(event: Event): void {
		event.stopPropagation()
		this.instance()?.clear()
	}

	/** «Отмена» подвала: закрыть панель; черновик выбора сбрасывает само закрытие. */
	protected close(): void {
		const picker = this.instance()

		if (picker) picker.open = false
	}
}
