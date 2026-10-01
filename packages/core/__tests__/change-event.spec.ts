/**
 * Расширение свойства снаружи: `change:<x>:before`.
 *
 * Своя логика свойства — подписка на событие перед записью, а не объект,
 * внедрённый в компонент: подписчик правит значение или отменяет запись.
 */

import { describe, it, expect, vi } from 'vitest'
import { TControl, TValueControl } from '@soldy-ui/core'

describe('change:<x>:before', () => {
	it('подписчик правит значение, следующий видит поправленное и прежнее', () => {
		const control = new TControl({ size: 'normal' })
		const seen: string[] = []

		control.events.on('change:size:before', (e) => {
			if (e.value === '2xl') e.value = 'xl'
		})
		control.events.on('change:size:before', (e) => seen.push(e.value, e.oldValue))

		control.size = '2xl'

		expect(control.size).toBe('xl')
		expect(seen).toEqual(['xl', 'normal'])
	})

	it('preventDefault и правка до прежнего значения — записи и change нет', () => {
		const control = new TControl()
		const changes = vi.fn()

		control.events.on('change:disabled', changes)
		control.events.on('change:focused', changes)
		control.events.on('change:disabled:before', (e) => e.preventDefault())
		control.events.on('change:focused:before', (e) => {
			e.value = e.oldValue
		})

		control.disabled = true
		control.focused = true

		expect(control.disabled).toBe(false)
		expect(control.focused).toBe(false)
		expect(changes).not.toHaveBeenCalled()
	})

	it('то же значение событие не шлёт', () => {
		const control = new TControl({ size: 'lg' })
		const before = vi.fn()

		control.events.on('change:size:before', before)
		control.size = 'lg'

		expect(before).not.toHaveBeenCalled()
	})

	it('список значения сверяется поэлементно — и до события, и после правки', () => {
		const control = new TValueControl<number[]>({ value: [1, 2] })
		const before = vi.fn()
		const changes = vi.fn()

		control.events.on('change:value:before', before)
		control.events.on('change:value', changes)

		control.value = [1, 2]

		expect(before).not.toHaveBeenCalled()

		control.events.on('change:value:before', (e) => {
			e.value = [1, 2]
		})
		control.value = [3]

		expect(changes).not.toHaveBeenCalled()
	})

	it('одна логика на много экземпляров — подписка, которую ставят каждому', () => {
		const clampSize = (control: TControl): void =>
			control.events.on('change:size:before', (e) => {
				if (e.value === '2xl') e.value = 'xl'
			})

		const controls = [new TControl(), new TControl()]

		controls.forEach(clampSize)
		controls.forEach((control) => (control.size = '2xl'))

		expect(controls.map((control) => control.size)).toEqual(['xl', 'xl'])
	})
})
