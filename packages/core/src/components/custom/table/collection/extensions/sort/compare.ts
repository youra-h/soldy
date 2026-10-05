import { DEFAULT_LOCALE } from '../../../../../../common'
import type { ITableColumn, TTableCompare } from '../../../column/types'
import type { ITableRow } from '../../../row/types'
import type { TTableColumnSort, TTableSortDirection } from './types'

/** Сравнение двух строк: по одной записи состояния или по всем по приоритету. */
type TRowCompare = (a: ITableRow, b: ITableRow) => number

/** Значение поля, приведённое к сравнению по умолчанию: число или строка. */
type TSortKey = number | bigint | string

/** Числа внутри строк — как числа: `item2` раньше `item10`. */
const COLLATION: Intl.CollatorOptions = { numeric: true }

/** Направление — знак сравнения по возрастанию. */
const SIGN: Readonly<Record<TTableSortDirection, number>> = { asc: 1, desc: -1 }

/**
 * Сравнение строк текста по языку таблицы. Тег, которого нет у движка, —
 * `en-US`, а не язык среды: так сервер и браузер упорядочивают строки
 * одинаково. Невалидный и пустой — тоже `en-US`, а не исключение.
 */
export function collatorOf(locale: string | undefined): Intl.Collator {
	try {
		return new Intl.Collator([locale || DEFAULT_LOCALE, DEFAULT_LOCALE], COLLATION)
	} catch {
		return new Intl.Collator(DEFAULT_LOCALE, COLLATION)
	}
}

/**
 * Сравнение строк по состоянию сортировки: по первой записи, равные по ней —
 * по следующей, равные по всем — как в данных (сортировка устойчивая).
 *
 * Колонка записи со своим сравнением (`compare`) сравнивает записи строк сама;
 * колонки нет или своего сравнения у неё нет — значения поля записи. Строка
 * без записи и пустое значение — в конце при любом направлении: направление
 * переворачивает порядок значений, а не место пустых.
 */
export function rowComparator(
	sort: readonly TTableColumnSort[],
	columns: ReadonlyArray<ITableColumn>,
	collator: Intl.Collator,
): TRowCompare {
	const compares = sort.map(({ field, direction }) => {
		const compare = columns.find((column) => column.field === field)?.compare

		return compare
			? byRecords(compare, SIGN[direction])
			: byField(field, SIGN[direction], collator)
	})

	return (a, b) => {
		for (const compare of compares) {
			const result = compare(a, b)

			if (result !== 0) return result
		}

		return 0
	}
}

/** Своё сравнение колонки — над записями строк. */
function byRecords(compare: TTableCompare, sign: number): TRowCompare {
	return (a, b) => {
		const x = a.data
		const y = b.data

		if (x === undefined || y === undefined) return emptyLast(x, y)

		return sign * compare(x, y)
	}
}

/** Сравнение по умолчанию — значения поля записи, как у ячейки: `data[field]`. */
function byField(field: string, sign: number, collator: Intl.Collator): TRowCompare {
	return (a, b) => {
		const x = keyOf(valueOf(a, field))
		const y = keyOf(valueOf(b, field))

		if (x === undefined || y === undefined) return emptyLast(x, y)

		return sign * compareKeys(x, y, collator)
	}
}

/** Значение поля записи строки; записи нет — значения нет. */
function valueOf(row: ITableRow, field: string): unknown {
	const data = row.data

	return data === undefined ? undefined : Reflect.get(data, field)
}

/**
 * Ключ значения для сравнения по умолчанию. Объект сравнивается по своему
 * `valueOf()` — дата по времени. Число и большое число — по величине, булево —
 * `false` раньше `true`, строка — по языку.
 *
 * Пусто — `null`, `undefined`, `NaN`, невалидная дата и всё, чему порядок по
 * умолчанию не задать: объект без своего `valueOf()`, массив, символ,
 * функция. Такую колонку упорядочивает своё сравнение (`compare`).
 */
function keyOf(value: unknown): TSortKey | undefined {
	const primitive: unknown = value instanceof Object ? value.valueOf() : value

	switch (typeof primitive) {
		case 'number':
			return Number.isNaN(primitive) ? undefined : primitive
		case 'boolean':
			return Number(primitive)
		case 'bigint':
		case 'string':
			return primitive
		default:
			return undefined
	}
}

/** Числа — по величине, строки — по языку; число со строкой — как текст. */
function compareKeys(a: TSortKey, b: TSortKey, collator: Intl.Collator): number {
	if (typeof a === 'string' || typeof b === 'string') {
		return collator.compare(String(a), String(b))
	}

	return a < b ? -1 : a > b ? 1 : 0
}

/** Пустое — после непустого; два пустых равны и остаются в порядке данных. */
function emptyLast(a: unknown, b: unknown): number {
	return (a === undefined ? 1 : 0) - (b === undefined ? 1 : 0)
}
