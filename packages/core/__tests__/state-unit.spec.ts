import { describe, it, expect, vi } from 'vitest'
import { TStateUnit } from '@soldy-ui/core'

describe('TStateUnit', () => {
	it('хранит value и эмитит change(value) при изменении', () => {
		const s = new TStateUnit({ initial: 1 })
		const handler = vi.fn()
		s.events.on('change', handler)

		s.value = 2
		expect(handler).toHaveBeenCalledWith({ newValue: 2, oldValue: 1 })

		handler.mockClear()
		s.value = 2
		expect(handler).not.toHaveBeenCalled()
	})

	it('resolver: трансформирует значение при чтении', () => {
		const s = new TStateUnit({
			initial: 5,
			resolver: (value) => value * 2,
		})

		expect(s.value).toBe(10)

		s.value = 7
		expect(s.value).toBe(14)
	})

	it('resolver: setResolver меняет резольвер в рантайме', () => {
		const s = new TStateUnit({ initial: 5 })

		expect(s.value).toBe(5)

		s.setResolver((value) => value * 2)
		expect(s.value).toBe(10)

		s.setResolver(undefined)
		expect(s.value).toBe(5)
	})

	it('resolver: получает текущее _value, может делать fallback', () => {
		const s = new TStateUnit<number | undefined>({
			initial: undefined,
			resolver: (value) => value ?? 42,
		})

		expect(s.value).toBe(42)

		s.value = 7
		expect(s.value).toBe(7)

		s.value = undefined
		expect(s.value).toBe(42)
	})

	/**
	 * `change` сообщает о `value`, а не о хранимом: иначе событие несло бы
	 * значение, которого геттер не отдаёт.
	 */
	it('resolver: событие change эмитится с разрешёнными newValue и oldValue', () => {
		const s = new TStateUnit({
			initial: 1,
			resolver: (value) => value * 10,
		})
		const handler = vi.fn()
		s.events.on('change', handler)

		s.value = 2
		expect(s.value).toBe(20)
		expect(handler).toHaveBeenCalledOnce()
		expect(handler).toHaveBeenCalledWith({ newValue: 20, oldValue: 10 })
	})

	/** Так своё `disabled = true` у элемента выключенного списка не шлёт события. */
	it('resolver: запись, не сменившая value, молчит, но rawValue обновлён', () => {
		const owner = { disabled: true }
		const s = new TStateUnit({
			initial: false,
			resolver: (own) => own || owner.disabled,
		})
		const handler = vi.fn()
		s.events.on('change', handler)

		s.value = true

		expect(s.rawValue).toBe(true)
		expect(s.value).toBe(true)
		expect(handler).not.toHaveBeenCalled()

		// Своё сохранилось: итог держится и без владельца
		owner.disabled = false
		expect(s.value).toBe(true)
	})

	/**
	 * Внешние данные резольвера сменились мимо state-unit: прежний итог знает
	 * только тот, кто их менял, и передаёт его сам. Иначе подписчик получил бы
	 * `oldValue === newValue` — а по `oldValue` снимается старый CSS-класс.
	 */
	it('notify шлёт пару «было/стало» с переданным прежним итогом', () => {
		const owner = { size: 'lg' }
		const s = new TStateUnit({ initial: 'sm', resolver: () => owner.size })
		const handler = vi.fn()
		s.events.on('change', handler)

		owner.size = 'xl'
		s.notify('lg')

		expect(handler).toHaveBeenCalledOnce()
		expect(handler).toHaveBeenCalledWith({ newValue: 'xl', oldValue: 'lg' })
	})

	it('notify без смены итога молчит', () => {
		const owner = { size: 'lg' }
		const s = new TStateUnit({ initial: 'sm', resolver: () => owner.size })
		const handler = vi.fn()
		s.events.on('change', handler)

		s.notify('lg')

		expect(handler).not.toHaveBeenCalled()
	})

	it('setResolver эмитит change, только если сменилось value', () => {
		const s = new TStateUnit({ initial: 5 })
		const handler = vi.fn()
		s.events.on('change', handler)

		// Резольвер, не меняющий итог, — события нет
		s.setResolver((value) => value)
		expect(handler).not.toHaveBeenCalled()

		s.setResolver((value) => value * 2)
		expect(handler).toHaveBeenCalledOnce()
		expect(handler).toHaveBeenLastCalledWith({ newValue: 10, oldValue: 5 })

		// Сброс резольвера возвращает хранимое — это тоже смена value
		s.setResolver(undefined)
		expect(handler).toHaveBeenCalledTimes(2)
		expect(handler).toHaveBeenLastCalledWith({ newValue: 5, oldValue: 10 })
		expect(s.rawValue).toBe(5)
	})
})

/**
 * Правило «то же самое» — опция единицы состояния. Составное значение без
 * него «менялось» бы на каждой записи того же состава, а резольвер, который
 * собирает массив заново, — на каждой проверке итога.
 */
describe('TStateUnit: правило «то же самое»', () => {
	const sameList = (a: readonly number[], b: readonly number[]) =>
		a.length === b.length && a.every((item, index) => item === b[index])

	it('по умолчанию — строгое равенство: новый массив того же состава — смена', () => {
		const s = new TStateUnit<number[]>({ initial: [1, 2] })
		const handler = vi.fn()
		s.events.on('change', handler)

		s.value = [1, 2]

		expect(handler).toHaveBeenCalledOnce()
	})

	it('запись того же состава не пишется и не шлёт change', () => {
		const initial = [1, 2]
		const s = new TStateUnit<number[]>({ initial, same: sameList })
		const handler = vi.fn()
		s.events.on('change', handler)

		s.value = [1, 2]

		expect(handler).not.toHaveBeenCalled()
		expect(s.rawValue).toBe(initial)

		s.value = [1, 3]

		expect(handler).toHaveBeenCalledOnce()
		expect(handler).toHaveBeenCalledWith({ newValue: [1, 3], oldValue: [1, 2] })
	})

	it('итог резольвера сверяется тем же правилом: новый массив на чтение — не смена', () => {
		const s = new TStateUnit<number[]>({
			initial: [3, 1],
			same: sameList,
			resolver: (value) => [...value].sort((a, b) => a - b),
		})
		const handler = vi.fn()
		s.events.on('change', handler)

		// Хранимое другое, итог тот же — события нет, хранимое обновлено
		s.value = [1, 3]
		expect(handler).not.toHaveBeenCalled()
		expect(s.rawValue).toEqual([1, 3])

		// Итог сменился по содержимому — событие одно
		s.value = [2, 1]
		expect(handler).toHaveBeenCalledOnce()
		expect(handler).toHaveBeenCalledWith({ newValue: [1, 2], oldValue: [1, 3] })
	})

	it('notify и setResolver сверяют итог тем же правилом', () => {
		const s = new TStateUnit<number[]>({
			initial: [1, 2],
			same: sameList,
			resolver: (value) => [...value],
		})
		const handler = vi.fn()
		s.events.on('change', handler)

		s.notify([1, 2])
		s.setResolver((value) => value.map((item) => item))

		expect(handler).not.toHaveBeenCalled()
	})
})
