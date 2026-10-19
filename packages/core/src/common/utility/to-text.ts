/**
 * Значение — текстом: что библиотека рисует на месте значения, тип которого
 * она не знает, — поля записи в ячейке таблицы без слота.
 *
 * Правило одно на библиотеку и потому живёт в ядре: разметка рисует готовый
 * текст, а не переводит значение сама.
 *
 * - строка — как есть;
 * - `null` и `undefined` — пусто;
 * - массив и простой объект (`toString` у него не свой: от `Object` или не
 *   функция) — JSON с отступом в два пробела;
 * - остальное — `String()`: число, булево, дата и объект со своим
 *   `toString` — своим `toString`.
 *
 * Массив и объект, которых JSON не пишет (циклическая ссылка, `BigInt`
 * внутри), — их тег: `[object Object]`, `[object Array]`. Текст ячейки
 * считается и тогда, когда её рисует слот, а значение под слотом бывает
 * любым: исключение здесь сломало бы чтение ячеек всей строки.
 *
 * Язык тут ни при чём: число и дата — без форматирования по локали.
 */
export function toText(value: unknown): string {
	if (typeof value === 'string') return value

	if (value === null || value === undefined) return ''

	if (Array.isArray(value) || isPlainObject(value)) return json(value)

	return String(value)
}

/** Объект без своего `toString`: его текст — JSON, а не `[object Object]`. */
function isPlainObject(value: unknown): value is object {
	if (typeof value !== 'object' || value === null) return false

	const toString: unknown = Reflect.get(value, 'toString')

	return toString === Object.prototype.toString || typeof toString !== 'function'
}

/** JSON с отступом в два пробела; не пишется — тег объекта. */
function json(value: object): string {
	try {
		return JSON.stringify(value, null, 2)
	} catch {
		return Object.prototype.toString.call(value)
	}
}
