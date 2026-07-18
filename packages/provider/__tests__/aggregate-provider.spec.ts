/**
 * @soldy/provider — тесты TAggregateProvider
 */
import { describe, it, expect, vi } from 'vitest'
import { TAggregateProvider } from '../runtime/aggregate-provider.class'
import type { IAccessor, IAccessorProvider, IEventProvider } from '../runtime/types'
import type { IContractProp } from '../contract/types'
import type { TEventHandler } from '@soldy/core'

const idA = Symbol('a')
const idB = Symbol('b')

function makeProp(ownerId: symbol): IContractProp {
	return { name: 'x', kind: 'state', mutable: true, ownerId, triggers: ['change:x'] }
}

class MockAccessorProvider implements IAccessorProvider {
	constructor(private ownerId: symbol) {}
	getAccessor(prop: IContractProp): IAccessor | undefined {
		if (prop.ownerId !== this.ownerId) return undefined
		let value = 'default'
		return {
			get: () => value,
			set: (v) => { value = v },
			subscribe: () => () => {},
		}
	}
}

class MockEventProvider implements IEventProvider {
	subscribe(event: string, handler: TEventHandler): (() => void) | undefined {
		if (event === 'known') {
			return () => {}
		}
		return undefined
	}
}

describe('TAggregateProvider', () => {
	it('add() возвращает this (fluent API)', () => {
		const agg = new TAggregateProvider()
		expect(agg.add(new MockAccessorProvider(idA))).toBe(agg)
	})

	it('getAccessor делегирует правильному провайдеру', () => {
		const agg = new TAggregateProvider()
		agg.add(new MockAccessorProvider(idA))
		agg.add(new MockAccessorProvider(idB))

		const a = agg.getAccessor(makeProp(idA))
		const b = agg.getAccessor(makeProp(idB))

		expect(a).toBeDefined()
		expect(b).toBeDefined()
	})

	it('getAccessor возвращает undefined когда ни один провайдер не подходит', () => {
		const agg = new TAggregateProvider()
		agg.add(new MockAccessorProvider(idA))

		expect(agg.getAccessor(makeProp(Symbol('unknown')))).toBeUndefined()
	})

	it('subscribe делегирует провайдеру с событиями', () => {
		const agg = new TAggregateProvider()
		agg.add(new MockEventProvider())

		const unsub = agg.subscribe('known', vi.fn())
		expect(unsub).toBeDefined()
	})

	it('subscribe возвращает undefined когда ни один провайдер не обрабатывает событие', () => {
		const agg = new TAggregateProvider()
		agg.add(new MockEventProvider())

		expect(agg.subscribe('unknown', vi.fn())).toBeUndefined()
	})

	it('subscribe пропускает провайдеры без subscribe', () => {
		const agg = new TAggregateProvider()
		agg.add(new MockAccessorProvider(idA))
		// accessor-only провайдер не ломает subscribe

		expect(agg.subscribe('anything', vi.fn())).toBeUndefined()
	})

	it('смешанные провайдеры работают вместе', () => {
		const agg = new TAggregateProvider()
		agg
			.add(new MockAccessorProvider(idA))
			.add(new MockEventProvider())

		// accessor работает
		expect(agg.getAccessor(makeProp(idA))).toBeDefined()
		// events работают
		expect(agg.subscribe('known', vi.fn())).toBeDefined()
	})
})
