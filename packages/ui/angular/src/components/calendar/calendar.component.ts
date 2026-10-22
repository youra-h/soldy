import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { ICalendar } from '@soldy-ui/core'
import {
	AttributesDirective,
	RoleIconDirective,
	SlotDirective,
	provideElevator,
} from '../../adapter'
import { TButtonComponent } from '../button'
import { TIconComponent } from '../icon'
import { TListBoxComponent } from '../list-box'
import { TPopoverComponent } from '../popover'
import { TCalendarItemComponent } from './item'
import { TCalendarSurface } from '../../generated/calendar.metadata'
import { setupCalendar } from './setup.component'

/**
 * Календарь: сетки показанных месяцев, одна пара кнопок листания и подвал.
 * AGENTS.md (Angular), «Даты — поле из частей, сетка из `td`, поле с календарём в панели».
 */
@Component({
	selector: 'div[so-calendar], [so-calendar]',
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		SlotDirective,
		TButtonComponent,
		TIconComponent,
		TListBoxComponent,
		TPopoverComponent,
		TCalendarItemComponent,
	],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './calendar.component.html',
})
export class TCalendarComponent extends TCalendarSurface<ICalendar> {
	constructor() {
		super((ctrl, inputs) => setupCalendar(ctrl, inputs, this.engine), { strategy: 'host' })
	}
}
