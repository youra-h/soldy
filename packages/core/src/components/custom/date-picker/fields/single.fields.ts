import type { IDateInput } from '../../date-input'
import type { TDatePickerValue } from '../types'
import type { IDatePickerFields, TDatePickerFieldSet } from './types'

/**
 * Одна дата — одно поле. Значение — значение поля: дата, пока набраны все
 * части, иначе `undefined`.
 *
 * Пара в значении одной даты бывает только записью снаружи: в поле уходит её
 * первая дата — та, что стоит в паре первой.
 */
export class TSingleFields implements IDatePickerFields {
	private readonly _field: IDateInput

	constructor(set: TDatePickerFieldSet) {
		this._field = set.field
	}

	includes(input: IDateInput): boolean {
		return input === this._field
	}

	compose(): TDatePickerValue {
		return this._field.value
	}

	layout(value: TDatePickerValue): void {
		this._field.value = Array.isArray(value) ? value[0] : value
	}
}
