import { directionOf } from '../../../../common'
import { readNumber, symbolsOf } from './symbols'
import type { INumberFormat, TNumberSymbols } from './types'

/**
 * Образец, по которому видно направление числа в формате: с группой и дробью,
 * положительный — у отрицательного Intl ставит перед минусом свою метку
 * направления (`fa-IR` — LRM), и она заслонила бы направление валюты и
 * единицы.
 */
const DIRECTION_SAMPLE = 1234.5

/** Образец с дробью: даёт ли её формат — видно по разделителю в его строке. */
const FRACTION_SAMPLE = 0.123456789

/**
 * Формат поля числа поверх одного `Intl.NumberFormat`: строка, разбор и
 * правило набора. Создаётся один раз на тег и опции (`numberFormat`).
 */
export class TNumberFormat implements INumberFormat {
	readonly fraction: boolean
	readonly direction: 'ltr' | 'rtl'
	readonly lang: string
	private readonly _formatter: Intl.NumberFormat
	private readonly _symbols: TNumberSymbols
	/** Процент: разбор делит число на 100, как формат умножает */
	private readonly _percent: boolean

	constructor(formatter: Intl.NumberFormat) {
		const resolved = formatter.resolvedOptions()

		this._formatter = formatter
		this._symbols = symbolsOf(formatter)
		this._percent = resolved.style === 'percent'
		this.fraction = formatter
			.formatToParts(FRACTION_SAMPLE)
			.some((part) => part.type === 'decimal')
		this.direction = directionOf(formatter.format(DIRECTION_SAMPLE))
		this.lang = resolved.locale
	}

	format(value: number | undefined): string {
		return value === undefined ? '' : this._formatter.format(value)
	}

	/**
	 * Число собирается строкой и читается `Number` — так оно точно то, что
	 * написано: процент сдвигает запятую порядком (`1,1 %` — `1.1e-2`), а не
	 * делением, и 1,1 % — ровно 0.011, а не 0.011000000000000001. Минус ноль —
	 * ноль: «-0» число не меняет.
	 */
	parse(text: string): number | undefined {
		const reading = readNumber(text, this._symbols)

		if (reading === undefined || (reading.integer === '' && !reading.fraction)) return undefined

		const integer = reading.integer || '0'
		const fraction = reading.fraction || '0'
		const value = Number(`${reading.sign}${integer}.${fraction}${this._percent ? 'e-2' : ''}`)

		if (!Number.isFinite(value)) return undefined

		return value === 0 ? 0 : value
	}

	accepts(text: string, signed: boolean): boolean {
		const reading = readNumber(text, this._symbols)

		if (reading === undefined) return false
		if (reading.sign === '-' && !signed) return false

		return reading.fraction === undefined || this.fraction
	}
}
