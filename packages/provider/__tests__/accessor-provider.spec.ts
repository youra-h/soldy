/**
 * @soldy/provider — тесты TObservingAccessorProvider
 */
import { describe, it, expect, vi } from 'vitest'
import { TObservingAccessorProvider } from '../runtime/accessor-provider.class'
import type { IContractProp } from '../contract/types'
import { TEvented, type IComponent } from '@soldy/core'

function makeProp(overrides: Partial<IContractProp> = {}): IContractProp {
	return {
		name: 'testProp',
		kind: 'state',
		mutable: true,
		triggers: ['change:testProp'],
		...overrides,
	}
}

function makeInstance(): IComponent {
	return {
		testProp: 'hello',
		events: new TEvented(),
		rendered: true,
		visible: true,
		present: true,
		show: () => {},
		hide: () => {},
	} as unknown as IComponent
}

describe('TObservingAccessorProvider', () => {
	it('getAccessor возвращает accessor для prop с triggers', () => {
		const p = new TObservingAccessorProvider(makeInstance())
		const accessor = p.getAccessor(makeProp())

		expect(accessor).toBeDefined()
	})

	it('getAccessor возвращает undefined для prop без triggers', () => {
		const p = new TObservingAccessorProvider(makeInstance())
		const accessor = p.getAccessor(makeProp({ triggers: [] }))

		expect(accessor).toBeUndefined()
	})

	it('accessor.get() читает значение свойства', () => {
		const instance = makeInstance()
		instance.testProp = 'world'

		const p = new TObservingAccessorProvider(instance)
		const accessor = p.getAccessor(makeProp())!

		expect(accessor.get()).toBe('world')
	})

	it('accessor.set() записывает значение (mutable)', () => {
		const instance = makeInstance()
		const p = new TObservingAccessorProvider(instance)
		const accessor = p.getAccessor(makeProp())!

		accessor.set!('updated')
		expect(instance.testProp).toBe('updated')
	})

	it('accessor не имеет set для non-mutable', () => {
		const p = new TObservingAccessorProvider(makeInstance())
		const accessor = p.getAccessor(makeProp({ mutable: false }))!

		expect(accessor.set).toBeUndefined()
	})

	it('accessor.subscribe реагирует на события из triggers', () => {
		const instance = makeInstance()
		const p = new TObservingAccessorProvider(instance)
		const accessor = p.getAccessor(makeProp())!

		const spy = vi.fn()
		accessor.subscribe(spy)

		instance.events.emit('change:testProp')

		expect(spy).toHaveBeenCalledOnce()
	})

	it('accessor.subscribe возвращает функцию отписки', () => {
		const instance = makeInstance()
		const p = new TObservingAccessorProvider(instance)
		const accessor = p.getAccessor(makeProp())!

		const spy = vi.fn()
		const unsub = accessor.subscribe(spy)

		unsub()
		instance.events.emit('change:testProp')

		expect(spy).not.toHaveBeenCalled()
	})

	it('подписывается на все события из triggers', () => {
		const instance = makeInstance()
		const p = new TObservingAccessorProvider(instance)
		const accessor = p.getAccessor(makeProp({ triggers: ['a', 'b'] }))!

		const spy = vi.fn()
		accessor.subscribe(spy)

		instance.events.emit('a')
		instance.events.emit('b')

		expect(spy).toHaveBeenCalledTimes(2)
	})

	it('subscribe(event, handler) проксирует в instance.events', () => {
		const instance = makeInstance()
		const p = new TObservingAccessorProvider(instance)

		const spy = vi.fn()
		p.subscribe('custom', spy)

		instance.events.emit('custom')
		expect(spy).toHaveBeenCalledOnce()
	})

	it('subscribe возвращает функцию отписки', () => {
		const instance = makeInstance()
		const p = new TObservingAccessorProvider(instance)

		const spy = vi.fn()
		const unsub = p.subscribe('custom', spy)

		unsub()
		instance.events.emit('custom')

		expect(spy).not.toHaveBeenCalled()
	})
})
