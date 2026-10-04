import type { IDateInput } from '../../date-input'
import type { TDatePickerMode, TDatePickerValue } from '../types'

/** Поля DatePicker: одной даты и концов диапазона — экземпляры на всю его жизнь. */
export type TDatePickerFieldSet = {
	/** Поле одной даты */
	readonly field: IDateInput
	/** Поле начала диапазона */
	readonly start: IDateInput
	/** Поле конца диапазона */
	readonly end: IDateInput
}

/**
 * Поля режима — стратегия DatePicker, как режим выбора у календаря: из каких
 * полей собирается значение и как оно в них раскладывается. Её меняет сеттер
 * `mode`, и веток по режиму в DatePicker нет.
 *
 * Дат стратегия не считает: значение — то, что набрано в полях, а
 * раскладывается оно как есть.
 */
export interface IDatePickerFields {
	/** Поле этого режима: правка в нём меняет значение */
	includes(input: IDateInput): boolean
	/** Значение из полей; не набрано целиком — `undefined` */
	compose(): TDatePickerValue
	/** Разложить значение по полям */
	layout(value: TDatePickerValue): void
}

/** Конструктор стратегии: DatePicker заводит её на режим над своими полями. */
export type TDatePickerFieldsCtor = new (set: TDatePickerFieldSet) => IDatePickerFields

/** Стратегия на каждый режим. */
export type TDatePickerFieldsMap = Readonly<Record<TDatePickerMode, TDatePickerFieldsCtor>>
