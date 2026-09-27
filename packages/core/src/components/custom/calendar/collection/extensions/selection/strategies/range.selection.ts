import { compareDates, orderDates } from '../../../../../../../common'
import { NO_MARKS } from './marks'
import type { TCalendarDate } from '../../../../../../../common'
import type { TCalendarRange } from '../../../../types'
import type {
	ICalendarSelection,
	TCalendarChoice,
	TCalendarChoiceState,
	TCalendarMarker,
} from './types'

/**
 * Диапазон «от и до». Итог — от первой даты значения до последней: одна дата
 * — однодневный диапазон, пара задом наперёд — по возрастанию.
 *
 * Выбор идёт в два шага: первый ставит якорь и значения не трогает, второй
 * пишет пару и снимает якорь. Пока якорь стоит, сетка вместо значения
 * показывает предпросмотр — от якоря до второго конца.
 */
export class TRangeSelection implements ICalendarSelection {
	readonly multiselectable = true

	resolve(dates: readonly TCalendarDate[]): TCalendarRange | undefined {
		return dates.length > 0 ? [dates[0], dates[dates.length - 1]] : undefined
	}

	choose(date: TCalendarDate, { raw, anchor }: TCalendarChoiceState): TCalendarChoice {
		if (anchor === undefined) return { value: raw, anchor: date }

		return { value: orderDates(anchor, date), anchor: undefined }
	}

	marker(
		dates: readonly TCalendarDate[],
		anchor: TCalendarDate | undefined,
		end: TCalendarDate,
	): TCalendarMarker {
		const preview = anchor !== undefined
		const range = anchor === undefined ? this.resolve(dates) : orderDates(anchor, end)

		if (range === undefined) return () => NO_MARKS

		const [start, finish] = range

		return (date) => {
			const inside = compareDates(date, start) >= 0 && compareDates(date, finish) <= 0

			return {
				selected: inside,
				rangeStart: date === start,
				rangeEnd: date === finish,
				rangeMiddle: inside && date !== start && date !== finish,
				preview: inside && preview,
			}
		}
	}
}
