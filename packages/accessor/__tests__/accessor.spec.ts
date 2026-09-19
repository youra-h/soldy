/**
 * TAccessor — свойства и события компонента, привязанные к своим владельцам.
 *
 * Компонент собран из нескольких владельцев (инстанс ядра и плагины), и
 * аксессор знает про каждое свойство, чьё оно: свойство (`TProperty`) читает и
 * пишет прямо в владельца, без карты плагинов и неймспейсов.
 */

import { describe, it, expect, vi } from 'vitest'
import { TEvented } from '@soldy/core'
import { TAccessor } from '../accessor.class'
import { TName } from '../contract'
import type { IPropDeclaration } from '../contract'
import { TEventRelay } from '../event-relay.class'
import { TProperty } from '../property.class'

describe('TAccessor', () => {
	it('свойство читается и пишется у своего владельца', () => {
		const owner = { text: 'a' }
		const accessor = new TAccessor([{ instance: owner, props: [{ name: new TName('text') }] }])
		const [text] = accessor.getProps()

		expect(text.value).toBe('a')

		text.assign('b')

		expect(owner.text).toBe('b')
	})

	it('protected-свойство снаружи не пишется', () => {
		const owner = { present: true }
		const accessor = new TAccessor([
			{ instance: owner, props: [{ name: new TName('present'), protected: true }] },
		])
		const [present] = accessor.getProps(true)

		present.assign(false)

		expect(owner.present).toBe(true)
		expect(accessor.getProps(false)).toEqual([])
	})

	it('составное значение читается снимком через valueOf', () => {
		const snapshot = ['a', 'b']
		const owner = { classes: { valueOf: () => snapshot } }
		const accessor = new TAccessor([
			{ instance: owner, props: [{ name: new TName('classes') }] },
		])

		expect(accessor.getProps()[0].value).toBe(snapshot)
	})

	it('источник событий — шина владельца', () => {
		const owner = { events: new TEvented<{ ready: () => void }>() }
		const accessor = new TAccessor([{ instance: owner, events: [new TName('ready')] }])

		expect(accessor.getEvents()[0].source).toBe(owner.events)
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

describe('TProperty · правило записи', () => {
	/** Владелец, который считает записи: сеттер ядра эмитит и на том же значении. */
	function counted(initial: unknown) {
		let value = initial
		const writes: unknown[] = []

		return {
			writes,
			owner: {
				get size() {
					return value
				},
				set size(next: unknown) {
					writes.push(next)
					value = next
				},
			},
		}
	}

	const size = (declaration: Partial<IPropDeclaration> = {}): IPropDeclaration => ({
		name: new TName('size'),
		...declaration,
	})

	it('то же значение не пишется', () => {
		const { owner, writes } = counted('md')
		const property = new TProperty(size(), owner)

		property.assign('md')
		property.assign('lg')

		expect(writes).toEqual(['lg'])
	})

	it('reset возвращает умолчание декларации; не объявлено — значение остаётся', () => {
		const declared = counted('lg')
		const free = counted('lg')

		new TProperty(size({ default: 'md' }), declared.owner).reset()
		new TProperty(size(), free.owner).reset()

		expect(declared.owner.size).toBe('md')
		expect(free.writes).toEqual([])
	})

	it('у умолчания значим ключ: объявленное undefined — тоже умолчание', () => {
		const { owner } = counted(true)
		const property = new TProperty(size({ default: undefined }), owner)

		expect(property.hasDefault).toBe(true)

		property.reset()

		expect(owner.size).toBeUndefined()
	})

	it('начальное значение: не заданное и равное умолчанию ничего не задают', () => {
		const { owner, writes } = counted('lg')
		const property = new TProperty(size({ default: 'md' }), owner)

		property.initialize(undefined)
		property.initialize('md')

		expect(writes).toEqual([])

		property.initialize('sm')

		expect(writes).toEqual(['sm'])
	})

	it('свои get и set декларации идут впереди свойства владельца', () => {
		const owner: { anchor: string | null; setAnchor: (value: unknown) => void } = {
			anchor: null,
			setAnchor: vi.fn(),
		}
		const property = new TProperty(
			{
				name: new TName('anchor', 'anchor'),
				get: () => 'из get',
				set: (_, value) => owner.setAnchor(value),
			},
			owner,
		)

		expect(property.value).toBe('из get')

		property.assign('узел')

		expect(owner.setAnchor).toHaveBeenCalledWith('узел')
		expect(owner.anchor).toBeNull()
	})

	it('watch слушает все триггеры свойства и отписывается', () => {
		const events = new TEvented<{
			'change:rendered': () => void
			'change:visible': () => void
		}>()
		const property = new TProperty(
			{
				name: new TName('present'),
				protected: true,
				triggers: [new TName('change:rendered'), new TName('change:visible')],
			},
			{ present: true, events },
		)
		const listener = vi.fn()
		const off = property.watch(listener)

		events.emit('change:rendered')
		events.emit('change:visible')

		expect(listener).toHaveBeenCalledTimes(2)

		off()
		events.emit('change:visible')

		expect(listener).toHaveBeenCalledTimes(2)
	})

	it('у владельца без шины слушать нечего', () => {
		const property = new TProperty(
			{ name: new TName('text'), triggers: [new TName('change:text')] },
			{ text: 'a' },
		)

		expect(property.source).toBeUndefined()
		expect(property.watch(() => {})).toBeTypeOf('function')
	})
})

describe('TEventRelay', () => {
	it('одна пара «источник, имя» слушается один раз', () => {
		const events = new TEvented<{ 'change:visible': (value: boolean) => void }>()
		const relay = new TEventRelay()
		const handler = vi.fn()

		// `change:visible` объявлен триггером и у `visible`, и у `present`
		relay.listen(events, 'change:visible', handler)
		relay.listen(events, 'change:visible', handler)

		events.emit('change:visible', true)

		expect(handler).toHaveBeenCalledTimes(1)
		expect(handler).toHaveBeenCalledWith(true)
	})

	it('то же имя у другого источника — другое событие', () => {
		const component = new TEvented<{ create: () => void }>()
		const plugin = new TEvented<{ create: () => void }>()
		const relay = new TEventRelay()
		const handler = vi.fn()

		relay.listen(component, 'create', handler)
		relay.listen(plugin, 'create', handler)

		component.emit('create')
		plugin.emit('create')

		expect(handler).toHaveBeenCalledTimes(2)
	})

	it('stop снимает и свои подписки, и добавленные отписки', () => {
		const events = new TEvented<{ ready: () => void }>()
		const relay = new TEventRelay()
		const handler = vi.fn()
		const off = vi.fn()

		relay.listen(events, 'ready', handler)
		relay.add(off)
		relay.stop()

		events.emit('ready')

		expect(handler).not.toHaveBeenCalled()
		expect(off).toHaveBeenCalledTimes(1)
	})
})
