/**
 * Правила о значении на границе: «то же самое» и шина владельца.
 *
 * Каждое правило записано один раз: `sameValue` — правило равенства ячеек
 * входа и состояния и сверка начального значения с умолчанием (`TLine.seed`);
 * `busOf` — единственное место, которое знает, где у владельца шина. Запись
 * в ядро `sameValue` не сверяет: то же ли значение, решает сеттер владельца.
 */

import type { IBus } from './types'

function isBus(value: unknown): value is IBus {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof Reflect.get(value, 'on') === 'function' &&
		typeof Reflect.get(value, 'off') === 'function'
	)
}

/** Шина — `owner.events`, а без поля `events` — сам владелец; без `on`/`off` источника событий нет. */
export function busOf(owner: object): IBus | undefined {
	const events: unknown = Reflect.get(owner, 'events')

	if (isBus(events)) return events

	return isBus(owner) ? owner : undefined
}

function isPlain(value: unknown): value is object {
	if (typeof value !== 'object' || value === null) return false

	const proto: unknown = Object.getPrototypeOf(value)

	return proto === Object.prototype || proto === null
}

/**
 * Составные значения дают новый объект на каждое чтение (снимок `valueOf()`),
 * поэтому простые объекты и массивы сверяются по содержимому (поверхностно),
 * остальное — по идентичности.
 */
export function sameValue(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true

	if (Array.isArray(a) && Array.isArray(b)) {
		return a.length === b.length && a.every((item, index) => Object.is(item, b[index]))
	}

	if (isPlain(a) && isPlain(b)) {
		const keys = Object.keys(a)

		return (
			keys.length === Object.keys(b).length &&
			keys.every((key) => key in b && Object.is(Reflect.get(a, key), Reflect.get(b, key)))
		)
	}

	return false
}
