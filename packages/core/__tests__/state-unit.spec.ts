import { describe, it, expect, vi } from 'vitest'
import { TStateUnit } from '@soldy/core'

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
