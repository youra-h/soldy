import { DEFAULT_LOCALE } from './locale'

/**
 * Цифры локали: какими знаками система счисления пишет цифры и какая цифра
 * стоит в знаке. Общие у полей, которые набирают числа по языку страницы, —
 * поля даты и поля числа.
 */

/** Цифры от нуля до девяти — то, что форматирует система счисления. */
const DIGITS: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

/**
 * Цифры системы счисления — по знаку на цифру. Система, которая цифру одним
 * знаком не пишет, — цифры ASCII: такую Intl для чисел полей не выбирает.
 */
export function digitsOf(numberingSystem: string): readonly string[] {
	try {
		const format = new Intl.NumberFormat(DEFAULT_LOCALE, {
			numberingSystem,
			useGrouping: false,
		})
		const digits = DIGITS.map((digit) => format.format(digit))

		if (digits.every((digit) => [...digit].length === 1)) return digits
	} catch {
		// Неизвестная система — цифры ASCII ниже
	}

	return DIGITS.map(String)
}

/**
 * Цифра в знаке: цифра ASCII, цифра системы счисления локали (`digits`) или
 * полноширинная — её приводит к ASCII нормализация NFKC, как и прочие
 * совместимые формы цифр. Не цифра — `undefined`.
 */
export function digitOf(char: string, digits: readonly string[]): number | undefined {
	const normalized = char.normalize('NFKC')

	if (normalized.length === 1 && normalized >= '0' && normalized <= '9') return Number(normalized)

	const index = digits.indexOf(char)

	return index === -1 ? undefined : index
}
