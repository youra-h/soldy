import { compareDates } from '../../../../common'
import { NO_MARKS } from './marks'
import type { TCalendarDate } from '../../../../common'
import type {
	ICalendarSelection,
	TCalendarChoice,
	TCalendarChoiceState,
	TCalendarMarker,
} from './types'

/** Несколько разных дат. Итог — даты по возрастанию без повторов; выбор переключает дату. */
export class TMultipleSelection implements ICalendarSelection {
	readonly multiselectable = true

	resolve(dates: readonly TCalendarDate[]): TCalendarDate[] {
		return [...dates]
	}

	choose(date: TCalendarDate, { dates }: TCalendarChoiceState): TCalendarChoice {
		const value = dates.includes(date)
			? dates.filter((item) => item !== date)
			: [...dates, date].sort(compareDates)

		return { value, anchor: undefined }
	}

	marker(dates: readonly TCalendarDate[]): TCalendarMarker {
		const selected = new Set(dates)

		return (date) => ({ ...NO_MARKS, selected: selected.has(date) })
	}
}
