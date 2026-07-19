/**
 * @soldy/setup — тесты TInstancePluginAccessorProvider
 */
import { describe, it, expect, vi } from 'vitest'
import { TInstancePluginAccessorProvider } from '../plugins/providers/instance'
import { TEvented, TComponent } from '@soldy/core'
import type { IContractProp } from '@soldy/provider'

import { TInstancePlugin } from '@soldy/plugins'

function makeInstanceProp(ownerCtor: Function): IContractProp {
	return {
		name: 'instance',
		kind: 'state',
		mutable: false,
		ownerCtor,
	}
}

function makePlugin() {
	const key = Symbol('instance-plugin')
	return {
		key,
		instance: new TComponent(),
		events: new TEvented(),
	}
}

describe('TInstancePluginAccessorProvider', () => {
	it('getAccessor возвращает accessor для instance', () => {
		const plugin = makePlugin()
		const p = new TInstancePluginAccessorProvider(plugin as any)

		const a = p.getAccessor(makeInstanceProp(TInstancePlugin))

		expect(a).toBeDefined()
		expect(a!.get()).toBe(plugin.instance)
	})

	it('getAccessor возвращает undefined для чужого ownerCtor', () => {
		const plugin = makePlugin()
		const p = new TInstancePluginAccessorProvider(plugin as any)

		expect(p.getAccessor(makeInstanceProp(class OtherClass {}))).toBeUndefined()
	})

	it('accessor не имеет set (instance только для чтения)', () => {
		const plugin = makePlugin()
		const p = new TInstancePluginAccessorProvider(plugin as any)
		const a = p.getAccessor(makeInstanceProp(TInstancePlugin))!

		expect(a.set).toBeUndefined()
	})

	it('accessor.subscribe реагирует на ready/removed', () => {
		const plugin = makePlugin()
		const p = new TInstancePluginAccessorProvider(plugin as any)
		const a = p.getAccessor(makeInstanceProp(TInstancePlugin))!

		const spy = vi.fn()
		a.subscribe(spy)

		plugin.events.emit('ready')
		plugin.events.emit('removed')

		expect(spy).toHaveBeenCalledTimes(2)
	})

	it('accessor.subscribe возвращает функцию отписки', () => {
		const plugin = makePlugin()
		const p = new TInstancePluginAccessorProvider(plugin as any)
		const a = p.getAccessor(makeInstanceProp(plugin.key))!

		const spy = vi.fn()
		const unsub = a.subscribe(spy)
		unsub()

		plugin.events.emit('ready')
		expect(spy).not.toHaveBeenCalled()
	})
})
