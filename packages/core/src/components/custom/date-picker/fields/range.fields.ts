import type { IDateInput } from '../../date-input'
import type { TDatePickerValue } from '../types'
import type { IDatePickerFields, TDatePickerFieldSet } from './types'

/**
 * Диапазон — два поля: начало и конец. Значение — пара, когда набраны оба
 * конца, иначе `undefined`: недонабранный конец значения не даёт, но и
 * набранного не стирает — его DatePicker в поле-источник не возвращает.
 *
 * Пара — как набрана: конец раньше начала поля не переставляют.
 *
 * Дата вместо пары бывает записью снаружи: однодневный диапазон, как его
 * показывает календарь, — она уходит в оба поля.
 */
export class TRangeFields implements IDatePickerFields {
	private readonly _start: IDateInput
	private readonly _end: IDateInput

	constructor(set: TDatePickerFieldSet) {
		this._start = set.start
		this._end = set.end
	}

	includes(input: IDateInput): boolean {
		return input === this._start || input === this._end
	}

	compose(): TDatePickerValue {
		const start = this._start.value
		const end = this._end.value

		return start !== undefined && end !== undefined ? [start, end] : undefined
	}

	layout(value: TDatePickerValue): void {
		const [start, end] = Array.isArray(value) ? value : [value, value]

		this._start.value = start
		this._end.value = end
	}
}
