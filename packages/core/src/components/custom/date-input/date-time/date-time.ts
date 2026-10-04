import { DATE_GROUP } from '../date'
import { TIME_GROUPS } from '../time'
import { asciiDigits } from '../segments'
import type { TCalendarDate } from '../../../../common'
import type { IDateFieldFormat, TGroupSpec } from '../format'
import type {
	TDateFieldPart,
	TDateInputKind,
	TDateInputParts,
	TDateInputValue,
	TTimePrecision,
} from '../types'
import type { TValuePiece } from './types'

/**
 * Дата и время вместе — значение поля по его виду и точности времени.
 *
 * Значение — куски групп вида поля через `T`, как `value` у
 * `<input type="datetime-local">`: `date` — дата `YYYY-MM-DD`, `datetime` —
 * ещё время `HH:mm` или, с точностью до секунды, `HH:mm:ss`. Своих правил
 * частей здесь нет: части даты и времени согласует каждая группа у себя, а
 * связей между группами нет вовсе.
 */

/** Разделитель кусков значения: `YYYY-MM-DDTHH:mm`. */
const SEPARATOR = 'T'

/**
 * Виды поля в каждой точности времени — спецификации групп по порядку
 * значения. Каждый следующий вид — тот же предыдущий и ещё группа: кусок под
 * тем же номером в любом виде — одной группы, поэтому значения разного вида и
 * точности сравниваются кусок за куском. Точность выбирает спецификацию
 * времени, а у даты её нет: состав поля даты от точности не зависит.
 */
const KINDS: Readonly<
	Record<TDateInputKind, Readonly<Record<TTimePrecision, readonly TGroupSpec[]>>>
> = {
	date: { minute: [DATE_GROUP], second: [DATE_GROUP] },
	datetime: {
		minute: [DATE_GROUP, TIME_GROUPS.minute],
		second: [DATE_GROUP, TIME_GROUPS.second],
	},
}

/**
 * Составы значения любого вида и точности — по ним читается значение,
 * записанное снаружи, и граница: их вид от поля не зависит.
 */
const COMPOSITIONS: readonly (readonly TGroupSpec[])[] = Object.values(KINDS).flatMap(
	(byPrecision) => Object.values(byPrecision),
)

/**
 * Метки направления и изолирующие знаки: ALM, LRM, RLM, встраивания и
 * изоляты. В литералах формата их ставит Intl (`ar-EG` — RLM перед «/»), а в
 * тексте даты, который вставляют в поле, они не значат ничего: разбор их не
 * считает.
 */
const DIRECTION_MARKS = /[؜‎‏‪-‮⁦-⁩]/g

/** Группы цифр текста, уже приведённого к цифрам ASCII. */
const DIGIT_GROUPS = /\d+/g

/** Спецификации групп вида поля в точности времени — по порядку значения. */
export function groupSpecsOf(
	kind: TDateInputKind,
	timePrecision: TTimePrecision,
): readonly TGroupSpec[] {
	return KINDS[kind][timePrecision]
}

/**
 * Значение из частей — только когда есть все части формата и такое значение
 * есть: у поля даты — дата, у поля даты и времени — дата со временем в
 * точности формата.
 */
export function fieldValueOf(parts: TDateInputParts, format: IDateFieldFormat): TDateInputValue {
	if (format.parts.some((part) => parts[part.type] === undefined)) return undefined

	return composeValue(parts, specsOf(format))
}

/**
 * Части значения — даты или даты со временем любой точности, при любом виде
 * поля; не значение — пусто.
 */
export function partsOfValue(value: unknown): TDateInputParts {
	return mergeParts(readValue(value)?.map((piece) => piece.parts) ?? [])
}

/**
 * Лежит ли значение вне границ `min` и `max` — дат или дат со временем.
 * Сравнение — с точностью грубейшего из двух: граница-дата `max` пропускает
 * любое время своего дня, дата проходит границу-момент своего дня, а время до
 * минуты и время до секунды сравниваются до минуты. Невалидная граница не
 * ограничивает, `max` раньше `min` — граница схлопывается в `min`, как у
 * календаря. Не значение — не вне границ: проверять нечего.
 */
export function outOfBounds(value: unknown, min: unknown, max: unknown): boolean {
	const own = readValue(value)

	if (own === undefined) return false

	const low = readValue(min)
	const high = readValue(max)
	const upper = low !== undefined && high !== undefined && compare(high, low) < 0 ? low : high

	return (
		(low !== undefined && compare(own, low) < 0) ||
		(upper !== undefined && compare(own, upper) > 0)
	)
}

/**
 * День значения — кусок даты значения любого вида и точности: у даты — она
 * сама, у даты со временем — её день. Не значение — `undefined`.
 */
export function dateOfValue(value: unknown): TCalendarDate | undefined {
	return readValue(value)?.find((piece) => piece.spec === DATE_GROUP)?.text
}

/** Числа частей текущего момента — по группам формата. */
export function nowOf(format: IDateFieldFormat): TDateInputParts {
	return mergeParts(format.groups.map((group) => group.now()))
}

/**
 * Значение из текста, который вставили в поле, — в виде и точности поля
 * формата; не собрать — `undefined`.
 *
 * Цифры приводятся к ASCII, метки направления выбрасываются. Дальше — ISO
 * ровно вида и точности поля (`YYYY-MM-DD`, `YYYY-MM-DDTHH:mm`,
 * `YYYY-MM-DDTHH:mm:ss`) или группы цифр в порядке числовых частей формата:
 * разделители между ними любые, год — полностью, в календаре поля (`th-TH` —
 * 2569, то есть 2026), час — в цикле локали. Слова (период суток, `PM`)
 * группа ищет в тексте сама. Значение должно быть: 31 февраля и 13 PM — не
 * значение.
 */
export function parseFieldText(text: string, format: IDateFieldFormat): TDateInputValue {
	const normalized = asciiDigits(text.replace(DIRECTION_MARKS, ''), format.digits).trim()
	const specs = specsOf(format)

	if (readPieces(normalized, specs) !== undefined) return normalized

	const numeric = format.parts.filter((part) => part.rule.numeric).map((part) => part.type)
	const found = normalized.match(DIGIT_GROUPS) ?? []

	if (found.length !== numeric.length) return undefined

	const read = (type: TDateFieldPart): number => Number(found[numeric.indexOf(type)])
	const pieces = format.groups.map((group) => group.fromText(read, normalized))

	if (!pieces.every((parts) => parts !== undefined)) return undefined

	return composeValue(mergeParts(pieces), specs)
}

/** Спецификации групп формата — его вида и точности времени. */
function specsOf(format: IDateFieldFormat): readonly TGroupSpec[] {
	return groupSpecsOf(format.kind, format.timePrecision)
}

/** Значение по числам частей из кусков групп `specs`; не собрать кусок — `undefined`. */
function composeValue(parts: TDateInputParts, specs: readonly TGroupSpec[]): TDateInputValue {
	const pieces = specs.map((spec) => spec.compose(parts))

	return pieces.every((piece) => piece !== undefined) ? pieces.join(SEPARATOR) : undefined
}

/**
 * Куски значения любого вида и точности — состава, спецификации которого
 * прочли все куски. Не значение — `undefined`.
 */
function readValue(value: unknown): readonly TValuePiece[] | undefined {
	if (typeof value !== 'string') return undefined

	for (const specs of COMPOSITIONS) {
		const pieces = readPieces(value, specs)

		if (pieces !== undefined) return pieces
	}

	return undefined
}

/**
 * Куски значения состава `specs`: их столько же, сколько групп, и каждый
 * читает спецификация своей группы. Иначе — `undefined`.
 */
function readPieces(
	value: string,
	specs: readonly TGroupSpec[],
): readonly TValuePiece[] | undefined {
	const texts = value.split(SEPARATOR)

	if (texts.length !== specs.length) return undefined

	const pieces = specs.flatMap((spec, index) => {
		const parts = spec.parse(texts[index])

		return parts === undefined ? [] : [{ spec, text: texts[index], parts }]
	})

	return pieces.length === specs.length ? pieces : undefined
}

/** Порядок значений — кусок за куском, пока куски есть у обоих. */
function compare(a: readonly TValuePiece[], b: readonly TValuePiece[]): number {
	const length = Math.min(a.length, b.length)

	for (let index = 0; index < length; index++) {
		const order = a[index].spec.compare(a[index].text, b[index].text)

		if (order !== 0) return order
	}

	return 0
}

function mergeParts(list: readonly TDateInputParts[]): TDateInputParts {
	return list.reduce<TDateInputParts>((all, parts) => ({ ...all, ...parts }), {})
}
