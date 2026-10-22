import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { ICalendarItem } from '@soldy-ui/core'
import { TCalendarItemSurface } from '../../../generated/calendar-item.metadata'
import { setupCalendarItem } from './setup.component'

/**
 * День календаря — сама ячейка `td`: чужой тег внутри `table` браузер выкинет.
 * Кнопки внутри нет: фокус по APG стоит на ячейке.
 */
@Component({
	selector: 'td[so-calendar-item], [so-calendar-item]',
	imports: [NgTemplateOutlet],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './calendar-item.component.html',
})
export class TCalendarItemComponent extends TCalendarItemSurface<ICalendarItem> {
	constructor() {
		super(setupCalendarItem, { strategy: 'host' })
	}
}
