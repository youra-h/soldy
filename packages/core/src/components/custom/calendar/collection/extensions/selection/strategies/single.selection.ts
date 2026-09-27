import { NO_MARKS } from './marks'
import type { TCalendarDate } from '../../../../../../../common'
import type { ICalendarSelection, TCalendarChoice, TCalendarMarker } from './types'

/**
 * Одна дата. Итог — первая дата значения: из массива, оставшегося от другого
 * режима, — самая ранняя. Выбор заменяет значение; повторный выбор той же
 * даты её не снимает.
 */
export class TSingleSelection implements ICalendarSelection {
	readonly multiselectable = false

	resolve(dates: readonly TCalendarDate[]): TCalendarDate | undefined {
		return dates.length > 0 ? dates[0] : undefined
	}

	choose(date: TCalendarDate): TCalendarChoice {
		return { value: date, anchor: undefined }
	}

	marker(dates: readonly TCalendarDate[]): TCalendarMarker {
		const selected = this.resolve(dates)

		return (date) => ({ ...NO_MARKS, selected: date === selected })
	}
}
