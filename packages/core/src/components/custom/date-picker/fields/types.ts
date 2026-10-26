import type { IDateInput } from '../../date-input'
import type { TDatePickerMode, TDatePickerValue } from '../types'

/**
 * The picker's fields by role. A field is created on its first call — from the
 * picker's current state — and lives as long as the picker: the strategy of a
 * mode takes its own fields, and a mode coming back gets the same instances.
 * Fields no mode has needed are never created: a single date holds no range
 * ends.
 */
export type TDatePickerFieldSet = {
	/** The single date's field */
	readonly field: () => IDateInput
	/** The range start's field */
	readonly start: () => IDateInput
	/** The range end's field */
	readonly end: () => IDateInput
}

/** A field's role: the single date or an end of the range. */
export type TDatePickerFieldRole = keyof TDatePickerFieldSet

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
	/**
	 * Очистить поля режима их командой `clear` — все части, и набранные не до
	 * конца: у них значения нет, и записью значения их не очистить.
	 */
	clear(): void
}

/**
 * The strategy's constructor: the picker builds it for a mode over its field
 * set, and the strategy takes the fields of its mode right away — by
 * `change:mode` they exist.
 */
export type TDatePickerFieldsCtor = new (set: TDatePickerFieldSet) => IDatePickerFields

/** Стратегия на каждый режим. */
export type TDatePickerFieldsMap = Readonly<Record<TDatePickerMode, TDatePickerFieldsCtor>>
