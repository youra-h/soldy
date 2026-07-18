/**
 * @soldy/setup — тесты TElementPluginAccessorProvider
 */
import { describe, it, expect, vi } from 'vitest'
import { TElementPluginAccessorProvider } from '../providers/plugins/element'
import { TEvented } from '@soldy/core'
import type { IContractProp } from '@soldy/provider'

function makeElementProp(ownerId: symbol): IContractProp {
	return {
		name: 'element',
		kind: 'state',
		mutable: false,
		ownerId,
		triggers: ['ready', 'removed'],
	}
}

function makePlugin() {
	const key = Symbol('element-plugin')
	return {
		key,
		element: {} as HTMLElement,
		events: new TEvented(),
	}
}

describe('TElementPluginAccessorProvider', () => {
	it('getAccessor возвращает accessor для element', () => {
		const plugin = makePlugin()
		const p = new TElementPluginAccessorProvider(plugin as any)

		const a = p.getAccessor(makeElementProp(plugin.key))

		expect(a).toBeDefined()
		expect(a!.get()).toBe(plugin.element)
	})

	it('getAccessor возвращает undefined для чужого ownerId', () => {
		const plugin = makePlugin()
		const p = new TElementPluginAccessorProvider(plugin as any)

		expect(p.getAccessor(makeElementProp(Symbol('other')))).toBeUndefined()
	})

	it('accessor.set обновляет element', () => {
		const plugin = makePlugin()
		const p = new TElementPluginAccessorProvider(plugin as any)
		const a = p.getAccessor(makeElementProp(plugin.key))!

		const div = {} as HTMLElement
		a.set!(div)
		expect(plugin.element).toBe(div)
	})

	it('accessor.subscribe реагирует на ready/removed', () => {
		const plugin = makePlugin()
		const p = new TElementPluginAccessorProvider(plugin as any)
		const a = p.getAccessor(makeElementProp(plugin.key))!

		const spy = vi.fn()
		a.subscribe(spy)

		plugin.events.emit('ready')
		plugin.events.emit('removed')

		expect(spy).toHaveBeenCalledTimes(2)
	})

	it('subscribe фильтрует по префиксу', () => {
		const plugin = makePlugin()
		const p = new TElementPluginAccessorProvider(plugin as any)

		// событие с правильным префиксом
		const prefix = `${plugin.key.description}:`
		const unsub = p.subscribe(`${prefix}ready`, vi.fn())
		expect(unsub).toBeDefined()

		// событие без префикса — undefined
		expect(p.subscribe('ready', vi.fn())).toBeUndefined()
	})

	it('subscribe делегирует в plugin.events', () => {
		const plugin = makePlugin()
		const p = new TElementPluginAccessorProvider(plugin as any)
		const prefix = `${plugin.key.description}:`

		const spy = vi.fn()
		p.subscribe(`${prefix}ready`, spy)

		plugin.events.emit('ready')
		expect(spy).toHaveBeenCalledOnce()
	})

	it('subscribe возвращает функцию отписки', () => {
		const plugin = makePlugin()
		const p = new TElementPluginAccessorProvider(plugin as any)
		const prefix = `${plugin.key.description}:`

		const spy = vi.fn()
		const unsub = p.subscribe(`${prefix}ready`, spy)!
		unsub()

		plugin.events.emit('ready')
		expect(spy).not.toHaveBeenCalled()
	})
})
