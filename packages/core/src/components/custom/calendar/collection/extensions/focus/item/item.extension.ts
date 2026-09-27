import { TBaseItemExtension } from '../../../../../../base/collection'
import type { ICalendarItem } from '../../../../item/types'
import type {
	ICalendarFocusExtension,
	ICalendarFocusItemExtension,
	TCalendarFocusItemEvents,
} from '../types'

/**
 * Item-адаптер фокуса: стоит ли фокус сетки на дне.
 *
 * Своего состояния нет — день с фокусом знает родитель. Событие
 * `change:focused` без аргумента: «перечитай геттер», приходит на каждый
 * переход фокуса.
 */
export class TCalendarFocusItemExtension
	extends TBaseItemExtension<
		ICalendarItem,
		ICalendarFocusExtension<any>,
		TCalendarFocusItemEvents
	>
	implements ICalendarFocusItemExtension
{
	constructor(item: ICalendarItem, parent: ICalendarFocusExtension<any>) {
		super(item, parent)

		this.events.relay(parent.events, [{ from: 'change:focusedDate', as: 'change:focused' }])
	}

	get focused(): boolean {
		return this._parent.focusedDate === this._item.date
	}

	focus(): void {
		this._parent.focusDate(this._item.date)
	}
}
