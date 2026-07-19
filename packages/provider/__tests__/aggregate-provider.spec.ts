/**
 * @soldy/provider — тесты TAggregateProvider
 */
import { describe, it, expect, vi } from 'vitest'
import { TAggregateProvider } from '../runtime/aggregate-provider.class'
import type { IAccessor, IAccessorProvider, IEventProvider } from '../runtime/types'
import type { IContractProp } from '../contract/types'
import type { TEventHandler } from '@soldy/core'

function makeProp(name = 'x'): IContractProp {
	return { name, kind: 'state', mutable: true, triggers: ['change:x'] }
}

class MockAccessorProvider implements IAccessorProvider {
	constructor(private propName: string) {}
	getAccessor(prop: IContractProp): IAccessor | undefined {
		if (prop.name !== this.propName) return undefined
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
		expect(agg.add(new MockAccessorProvider('a'))).toBe(agg)
	})

	it('getAccessor делегирует правильному провайдеру', () => {
		const agg = new TAggregateProvider()
		agg.add(new MockAccessorProvider('a'))
		agg.add(new MockAccessorProvider('b'))

		const a = agg.getAccessor(makeProp('a'))
		const b = agg.getAccessor(makeProp('b'))

		expect(a).toBeDefined()
		expect(b).toBeDefined()
	})

	it('getAccessor возвращает undefined когда ни один провайдер не подходит', () => {
		const agg = new TAggregateProvider()
		agg.add(new MockAccessorProvider('a'))

		expect(agg.getAccessor(makeProp('unknown'))).toBeUndefined()
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
		agg.add(new MockAccessorProvider('a'))
		// accessor-only провайдер не ломает subscribe

		expect(agg.subscribe('anything', vi.fn())).toBeUndefined()
	})

	it('смешанные провайдеры работают вместе', () => {
		const agg = new TAggregateProvider()
		agg
			.add(new MockAccessorProvider('a'))
			.add(new MockEventProvider())

		// accessor работает
		expect(agg.getAccessor(makeProp('a'))).toBeDefined()
		// events работают
		expect(agg.subscribe('known', vi.fn())).toBeDefined()
	})
})
