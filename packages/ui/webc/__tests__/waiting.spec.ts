/**
 * Ожидание подключения на больших данных.
 *
 * Подключение внутри подключения ждёт его конца, а ждущий элемент, дождавшись,
 * подключается сам — снова через `connecting()`, как `_resume` базы. Разбор
 * очереди один на всё подключение: вложенный разбор, начатый подключением из
 * очереди, растил стек на каждый ждущий элемент, и таблица на 5000 строк
 * падала с переполнением стека, собрав треть строк. Пришедшее во время
 * разбора встаёт в конец той же очереди — порядок прихода.
 */

import { describe, it, expect } from 'vitest'
import { connecting, isConnecting, wait } from '../src/adapter/runtime/waiting'

/** Элемент, как в базе: под чужим подключением ждёт, иначе подключается сам и подключает детей. */
function connect(id: number, children: readonly number[], order: number[]): void {
	if (isConnecting()) {
		wait(() => connect(id, children, order))

		return
	}

	connecting(() => {
		order.push(id)

		for (const child of children) connect(child, [], order)
	})
}

describe('ожидание подключения', () => {
	it('десятки тысяч ждущих — без переполнения стека и в порядке прихода', () => {
		const count = 50_000
		const order: number[] = []
		const rows = Array.from({ length: count }, (_, i) => i + 1)

		connect(0, rows, order)

		expect(order).toEqual([0, ...rows])
	})

	it('пришедшее во время разбора — после уже ждущих', () => {
		const order: number[] = []

		connecting(() => {
			connect(1, [11, 12], order)
			connect(2, [21], order)
		})

		expect(order).toEqual([1, 2, 11, 12, 21])
		expect(isConnecting()).toBe(false)
	})
})
