/**
 * @soldy/setup — тесты TElementPluginAccessorProvider
 */
import { describe, it, expect, vi } from 'vitest'
import { TElementPluginAccessorProvider } from '../providers/plugins/element'
import { TEvented } from '@soldy/core'
import type { IContractProp } from '@soldy/provider'

function makeElementProp(): IContractProp {
	return {
		name: 'element',
		kind: 'state',
		mutable: false,
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

		const a = p.getAccessor(makeElementProp())

		expect(a).toBeDefined()
		expect(a!.get()).toBe(plugin.element)
	})

	it('getAccessor возвращает undefined для чужого имени пропа', () => {
		const plugin = makePlugin()
		const p = new TElementPluginAccessorProvider(plugin as any)

		expect(p.getAccessor({ name: 'other', kind: 'state', mutable: false })).toBeUndefined()
	})

	it('accessor.set обновляет element', () => {
		const plugin = makePlugin()
		const p = new TElementPluginAccessorProvider(plugin as any)
		const a = p.getAccessor(makeElementProp())!

		const div = {} as HTMLElement
		a.set!(div)
		expect(plugin.element).toBe(div)
	})

	it('accessor.subscribe реагирует на ready/removed', () => {
		const plugin = makePlugin()
		const p = new TElementPluginAccessorProvider(plugin as any)
		const a = p.getAccessor(makeElementProp())!

		const spy = vi.fn()
		a.subscribe(spy)

		plugin.events.emit('ready')
		plugin.events.emit('removed')

		expect(spy).toHaveBeenCalledTimes(2)
	})
})
