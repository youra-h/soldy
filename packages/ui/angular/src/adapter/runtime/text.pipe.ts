import { Pipe, type PipeTransform } from '@angular/core'

/**
 * Значение — в текст разметки: то, что Vue рисует интерполяцией `{{ value }}`.
 *
 * Значение, тип которого библиотека не знает, — поле записи в ячейке таблицы
 * (`unknown`), — Vue рисует любым: интерполяция сама делает из него текст.
 * Интерполяция Angular нарисовала бы объект и массив по-своему —
 * `[object Object]` и `a,b`, — поэтому значение переводит адаптер, по правилу
 * интерполяции Vue, как помощник `toText` у React, Solid и Svelte, и текст
 * ячейки один во всех адаптерах:
 *
 * - строка — как есть;
 * - `null` и `undefined` — пусто;
 * - массив и простой объект (`toString` у него от `Object`) — JSON с отступом
 *   в два пробела;
 * - остальное — `String()`: число, булево, дата — своим `toString`.
 */
function toText(value: unknown): string {
	if (typeof value === 'string') return value

	if (value === null || value === undefined) return ''

	if (Array.isArray(value) || isPlainObject(value)) return JSON.stringify(value, null, 2)

	return String(value)
}

/** Объект, который Vue рисует как JSON: `toString` у него свой не задан. */
function isPlainObject(value: unknown): value is object {
	if (typeof value !== 'object' || value === null) return false

	const toString: unknown = Reflect.get(value, 'toString')

	return toString === Object.prototype.toString || typeof toString !== 'function'
}

/**
 * TextPipe — значение текстом в шаблоне: `{{ cell.value | soText }}`, как
 * `toText` у React, Solid и Svelte (правило — у `toText` выше).
 *
 * Чистый пайп: Angular зовёт его, только когда сменилось само значение, — на
 * перерисовку строки или выбор ячейка значение заново не переводит. Имя — с
 * префиксом `so`: имена пайпов у шаблона общие с приложением, как селекторы.
 *
 * Импортирует его компонент, чей шаблон рисует значение, — и потребитель, если
 * в своём шаблоне ячейки хочет текст значения тем же правилом.
 *
 * Name: soText
 */
@Pipe({
	name: 'soText',
	standalone: true,
})
export class TextPipe implements PipeTransform {
	transform(value: unknown): string {
		return toText(value)
	}
}
