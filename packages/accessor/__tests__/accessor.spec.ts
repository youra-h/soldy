/**
 * TAccessor — свойства и события компонента, привязанные к своим владельцам.
 *
 * Компонент собран из нескольких владельцев (инстанс ядра и плагины), и
 * аксессор знает про каждое свойство, чьё оно: читает и пишет прямо в
 * владельца, без карты плагинов и неймспейсов.
 */

import { describe, it, expect } from 'vitest'
import { TEvented } from '@soldy/core'
import { TAccessor } from '../accessor.class'
import { TName } from '../contract'

describe('TAccessor', () => {
	it('свойство читается и пишется у своего владельца', () => {
		const owner = { text: 'a' }
		const accessor = new TAccessor([{ instance: owner, props: [{ name: new TName('text') }] }])
		const [text] = accessor.getProps()

		expect(accessor.getValue(text)).toBe('a')

		accessor.setValue(text, 'b')

		expect(owner.text).toBe('b')
	})

	it('protected-свойство снаружи не пишется', () => {
		const owner = { present: true }
		const accessor = new TAccessor([
			{ instance: owner, props: [{ name: new TName('present'), protected: true }] },
		])
		const [present] = accessor.getProps(true)

		accessor.setValue(present, false)

		expect(owner.present).toBe(true)
		expect(accessor.getProps(false)).toEqual([])
	})

	it('составное значение читается снимком через valueOf', () => {
		const snapshot = ['a', 'b']
		const owner = { classes: { valueOf: () => snapshot } }
		const accessor = new TAccessor([
			{ instance: owner, props: [{ name: new TName('classes') }] },
		])

		expect(accessor.getValue(accessor.getProps()[0])).toBe(snapshot)
	})

	it('источник событий — шина владельца', () => {
		const owner = { events: new TEvented<{ ready: () => void }>() }
		const accessor = new TAccessor([{ instance: owner, events: [new TName('ready')] }])

		expect(accessor.getEventSource(accessor.getEvents()[0])).toBe(owner.events)
	})

	it('одноимённые свойства разных владельцев — ошибка', () => {
		expect(
			() =>
				new TAccessor([
					{ instance: {}, props: [{ name: new TName('label', 'aria') }] },
					{ instance: {}, props: [{ name: new TName('label', 'aria') }] },
				]),
		).toThrow('Duplicate prop "aria:label"')
	})

	it('владелец без инстанса пропускается', () => {
		const accessor = new TAccessor([
			{ instance: undefined, props: [{ name: new TName('value', 'interval') }] },
		])

		expect(accessor.getProps(true)).toEqual([])
	})
})
