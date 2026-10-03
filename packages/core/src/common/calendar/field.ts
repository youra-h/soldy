import { dateIfExists, parseDate } from './date'
import type { IDateFieldFormat, TCalendarDate, TDatePart } from './types'

/** Части даты в поле ввода — порядок типов, а не формата: его даёт локаль. */
export const DATE_PARTS: readonly TDatePart[] = ['day', 'month', 'year']

/**
 * Метки направления и изолирующие знаки. В литералах формата их ставит Intl
 * (`ar-EG` — RLM перед «/»), а в тексте даты, который вставляют в поле, они не
 * значат ничего: разбор их не считает.
 */
const DIRECTION_MARKS = /[؜‎‏‪-‮⁦-⁩]/g

/** Группы цифр текста, уже приведённого к цифрам ASCII. */
const DIGIT_GROUPS = /\d+/g

/** Часть ли даты это: день, месяц или год. */
export function isDatePart(value: unknown): value is TDatePart {
	return DATE_PARTS.some((part) => part === value)
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

/**
 * Целое цифрами локали, не короче `width` цифр: день и месяц поля — двумя,
 * год — как есть. Знак минуса остаётся знаком: отрицательный год бывает только
 * у недописанного года, набранного в календаре со сдвигом.
 */
export function formatFieldNumber(value: number, width: number, digits: readonly string[]): string {
	const text = String(Math.abs(Math.trunc(value))).padStart(width, '0')
	const local = [...text].map((char) => digits[Number(char)] ?? char).join('')

	return value < 0 ? `-${local}` : local
}

/**
 * Дата из текста, который вставили в поле, — или `undefined`, если дату из
 * него не собрать.
 *
 * Цифры приводятся к ASCII (`digitOf`), метки направления выбрасываются. Дальше
 * — ISO (`YYYY-MM-DD`, `parseDate`) или три группы цифр в порядке частей
 * формата: разделители между ними любые, год — полностью, в календаре поля
 * (`th-TH` — 2569, то есть 2026). Дата должна быть: 31 февраля — не дата, а не
 * 3 марта.
 */
export function parseFieldDate(text: string, format: IDateFieldFormat): TCalendarDate | undefined {
	const normalized = [...text.replace(DIRECTION_MARKS, '')]
		.map((char) => {
			const digit = digitOf(char, format.digits)

			return digit === undefined ? char : String(digit)
		})
		.join('')
		.trim()

	const iso = parseDate(normalized)

	if (iso !== undefined) return iso

	const groups = normalized.match(DIGIT_GROUPS) ?? []

	if (groups.length !== format.parts.length) return undefined

	const value = (part: TDatePart): number => Number(groups[format.parts.indexOf(part)])

	return dateIfExists(value('year') - format.yearOffset, value('month'), value('day'))
}
