/**
 * @soldy/provider — тесты track
 */
import { describe, it, expect, vi } from 'vitest'
import { track } from '../runtime/track'

describe('track', () => {
	it('вызывает callback при изменении свойства', () => {
		const obj = { value: 1 }
		const spy = vi.fn()

		track(obj, 'value', spy)
		obj.value = 2

		expect(spy).toHaveBeenCalledWith(2)
	})

	it('не вызывает callback при установке того же значения', () => {
		const obj = { value: 1 }
		const spy = vi.fn()

		track(obj, 'value', spy)
		obj.value = 1

		expect(spy).not.toHaveBeenCalled()
	})

	it('getter возвращает актуальное значение', () => {
		const obj = { value: 'a' }
		track(obj, 'value', () => {})

		obj.value = 'b'
		expect(obj.value).toBe('b')
	})

	it('callback получает новое значение', () => {
		const obj = { value: 10 }
		const values: number[] = []

		track(obj, 'value', (v) => values.push(v))
		obj.value = 20
		obj.value = 30

		expect(values).toEqual([20, 30])
	})

	it('работает с разными типами', () => {
		const obj = { name: 'Alice', age: 30 }
		const names: string[] = []

		track(obj, 'name', (v) => names.push(v))
		obj.name = 'Bob'

		expect(names).toEqual(['Bob'])
	})
})
