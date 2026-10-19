/**
 * Значение — в текст разметки: то, что Vue рисует интерполяцией `{{ value }}`.
 *
 * Значение, тип которого библиотека не знает, — поле записи в ячейке таблицы
 * (`unknown`), — Vue рисует любым: интерполяция сама делает из него текст. В
 * Web Components текст узлу ставит шаблон, и `textContent` делает из значения
 * текст правилом `String()`: простой объект выходит как `[object Object]`,
 * массив — через запятую, `null` — словом `null`. Поэтому значение переводит
 * адаптер — по правилу интерполяции Vue, как `toText` у React, Solid и Svelte,
 * и текст ячейки один во всех адаптерах:
 *
 * - строка — как есть;
 * - `null` и `undefined` — пусто;
 * - массив и простой объект (`toString` у него от `Object`) — JSON с отступом
 *   в два пробела;
 * - остальное — `String()`: число, булево, дата — своим `toString`.
 *
 * Это функция, а не механизм шаблона: зовётся где угодно — в шаблоне
 * компонента и в коде приложения, как иконка по роли `roleIcon`.
 */

/** Объект, который Vue рисует как JSON: `toString` у него свой не задан. */
function isPlainObject(value: unknown): value is object {
	if (typeof value !== 'object' || value === null) return false

	const toString: unknown = Reflect.get(value, 'toString')

	return toString === Object.prototype.toString || typeof toString !== 'function'
}

export function toText(value: unknown): string {
	if (typeof value === 'string') return value

	if (value === null || value === undefined) return ''

	if (Array.isArray(value) || isPlainObject(value)) return JSON.stringify(value, null, 2)

	return String(value)
}
