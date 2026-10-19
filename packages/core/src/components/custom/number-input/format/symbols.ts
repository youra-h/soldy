import { DIRECTION_MARKS, digitOf, digitsOf } from '../../../../common'
import type { TNumberReading, TNumberSymbols } from './types'

/**
 * Знаки числа в локали и чтение числа из текста по ним.
 */

/** Пробелы любой ширины: разделитель групп у `ru-RU` и `fr-FR` — неразрывный. */
const WHITE_SPACE = /\p{White_Space}/gu

/** Части строки Intl, из которых состоит само число: всё прочее — литералы формата. */
const NUMBER_PARTS: ReadonlySet<string> = new Set([
	'integer',
	'group',
	'decimal',
	'fraction',
	'minusSign',
	'plusSign',
])

/**
 * Образцы, на которых формат показывает все свои литералы. Формы слов зависят
 * от числа: «1 километр», «2 километра», «5 километров», «1,5 километра»,
 * «1 000 000 de euros». Числа подряд от 0 до 110 дают формы множественного
 * числа, которые языки различают по последним цифрам (у арабского few —
 * 3–10, many — 11–99), миллион — форму круглых миллионов (many у французского
 * и бретонского), дроби — формы дробных чисел. Отрицательное — литералы
 * отрицательного числа.
 */
const SAMPLES: readonly number[] = [
	...Array.from({ length: 111 }, (_, index) => index),
	1_000_000,
	0.1,
	0.5,
	1.1,
	1.5,
	2.5,
	-1,
]

/** Минусы, которые набирают с клавиатуры: дефис-минус ASCII и знак минуса U+2212. */
const MINUS_SIGNS = ['-', '−']

/** Строка без меток направления и пробелов — так разбор сверяет знаки. */
function bare(text: string): string {
	return text.replace(DIRECTION_MARKS, '').replace(WHITE_SPACE, '')
}

/** Значение первой части строки Intl этого типа — без меток и пробелов. */
function partOf(parts: readonly Intl.NumberFormatPart[], type: string): string | undefined {
	const value = parts.find((part) => part.type === type)?.value

	return value === undefined ? undefined : bare(value) || undefined
}

/**
 * Знаки числа у форматтера: цифры его системы счисления, знаки и
 * разделители локали — у такого же форматтера без стиля, — литералы — у него
 * самого, на образцах.
 *
 * Разделитель групп — с группировкой, даже если формат её выключил: текст с
 * группами вставляют и в такое поле. Десятичный разделитель — с дробью, даже
 * если формат её не даёт: тогда его нельзя набрать, но его узнают.
 */
export function symbolsOf(formatter: Intl.NumberFormat): TNumberSymbols {
	const { locale, numberingSystem } = formatter.resolvedOptions()
	const plain = (options: Intl.NumberFormatOptions): Intl.NumberFormat =>
		new Intl.NumberFormat(locale, { numberingSystem, ...options })

	const group = partOf(plain({ useGrouping: true }).formatToParts(1234567), 'group')
	const decimal = partOf(plain({ minimumFractionDigits: 1 }).formatToParts(1.5), 'decimal')
	const minus = partOf(plain({}).formatToParts(-1), 'minusSign')
	const plus = partOf(plain({ signDisplay: 'always' }).formatToParts(1), 'plusSign')

	const literals = new Set<string>()

	for (const sample of SAMPLES) {
		for (const part of formatter.formatToParts(sample)) {
			const literal = bare(part.value)

			if (!NUMBER_PARTS.has(part.type) && literal !== '') literals.add(literal)
		}
	}

	return {
		digits: digitsOf(numberingSystem),
		minus: new Set([...MINUS_SIGNS, ...(minus ? [minus] : [])]),
		plus: new Set(['+', ...(plus ? [plus] : [])]),
		decimal: new Set([...(decimal ? [decimal] : []), ...(group === '.' ? [] : ['.'])]),
		group: new Set(group ? [group] : []),
		literals: [...literals].sort((a, b) => b.length - a.length),
	}
}

/**
 * Число в тексте: знак, цифры целой части и дробной. Не число — `undefined`.
 *
 * Метки направления, пробелы и литералы формата снимаются с текста первыми — в
 * любом месте: у валюты `de-CH` её код стоит перед числом, у `ru-RU` — после.
 * Каждый знак, что остался, — цифра, разделитель групп (до дробной части),
 * десятичный разделитель (один) или знак числа (один, в начале). Знаки и
 * разделители сверяются в форме NFKC, как цифры: полноширинные «－» и «．» с
 * японской клавиатуры — те же «-» и «.».
 */
export function readNumber(text: string, symbols: TNumberSymbols): TNumberReading | undefined {
	let rest = bare(text)

	for (const literal of symbols.literals) rest = rest.split(literal).join('')

	let sign: TNumberReading['sign'] = ''
	let integer = ''
	let fraction: string | undefined

	for (const char of rest) {
		const digit = digitOf(char, symbols.digits)
		const plain = char.normalize('NFKC')
		const first = sign === '' && integer === '' && fraction === undefined

		if (digit !== undefined) {
			if (fraction === undefined) integer += String(digit)
			else fraction += String(digit)
		} else if (fraction === undefined && symbols.group.has(plain)) {
			continue
		} else if (fraction === undefined && symbols.decimal.has(plain)) {
			fraction = ''
		} else if (first && (symbols.minus.has(plain) || symbols.minus.has(char))) {
			sign = '-'
		} else if (first && (symbols.plus.has(plain) || symbols.plus.has(char))) {
			sign = '+'
		} else {
			return undefined
		}
	}

	return { sign, integer, fraction }
}
