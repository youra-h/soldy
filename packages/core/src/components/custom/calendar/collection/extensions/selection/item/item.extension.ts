import { TBaseItemExtension } from '../../../../../../base/collection'
import type { ICalendarItem } from '../../../../item/types'
import type {
	ICalendarSelectionExtension,
	ICalendarSelectionItemExtension,
	TCalendarSelectionItemEvents,
} from '../types'

/**
 * Item-адаптер выбора: выбран ли день и выбор пользователя по нему.
 *
 * Своего состояния нет — выбран ли день, знает родитель по дате дня. Событие
 * `change:selected` без аргумента: значит «перечитай геттер», приходит на
 * каждую смену отметок.
 */
export class TCalendarSelectionItemExtension
	extends TBaseItemExtension<
		ICalendarItem,
		ICalendarSelectionExtension<any>,
		TCalendarSelectionItemEvents
	>
	implements ICalendarSelectionItemExtension
{
	constructor(item: ICalendarItem, parent: ICalendarSelectionExtension<any>) {
		super(item, parent)

		this.events.relay(parent.events, [{ from: 'change:marks', as: 'change:selected' }])
	}

	get selected(): boolean {
		return this._parent.isSelected(this._item.date)
	}

	choose(): boolean {
		return this._parent.chooseDate(this._item.date)
	}
}
