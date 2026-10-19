import { digitOf } from '../../../../common'

/**
 * Цифры частей — в системе счисления локали: набор, текст и разбор чисел.
 * Какая цифра в знаке, решает общее правило цифр локали (`digitOf`).
 */

/** Число из цифр локали; знак не цифра — `NaN`. */
export function numberOf(text: string, digits: readonly string[]): number {
	const values = [...text].map((char) => digitOf(char, digits))

	if (values.length === 0 || values.some((value) => value === undefined)) return Number.NaN

	return Number(values.join(''))
}

/**
 * Целое цифрами локали, не короче `width` цифр: день, месяц, час и минута —
 * двумя, год — как есть. Знак минуса остаётся знаком: отрицательный год бывает
 * только у недописанного года, набранного в календаре со сдвигом.
 */
export function formatFieldNumber(value: number, width: number, digits: readonly string[]): string {
	const text = String(Math.abs(Math.trunc(value))).padStart(width, '0')
	const local = [...text].map((char) => digits[Number(char)] ?? char).join('')

	return value < 0 ? `-${local}` : local
}

/** Текст, в котором каждая цифра (`digitOf`) заменена цифрой ASCII. */
export function asciiDigits(text: string, digits: readonly string[]): string {
	return [...text]
		.map((char) => {
			const digit = digitOf(char, digits)

			return digit === undefined ? char : String(digit)
		})
		.join('')
}
