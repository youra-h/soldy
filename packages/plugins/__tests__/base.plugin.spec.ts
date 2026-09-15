/**
 * `TBasePlugin` — события жизненного цикла, которые база шлёт любому плагину.
 *
 * Сверяется весь список вызовов вместе с аргументами, а не сам факт вызова:
 * лишний или пропавший аргумент — уже другой контракт. `destroy()` зовётся без
 * контекста, поэтому и событие приходит без аргументов: заглушка на месте
 * контекста отдала бы подписчику объект, которого у плагина нет.
 */

import { describe, it, expect, vi } from 'vitest'
import { TBasePlugin } from '../src'
import type { IPluginContext, TPluginEvents } from '../src'

/** Лист без собственных событий: проверяется только то, что шлёт база. */
class TProbePlugin extends TBasePlugin {}

function context(): IPluginContext {
	return {
		get: () => undefined,
		getInstance: () => null,
	}
}

describe('TBasePlugin — события жизненного цикла', () => {
	it('install приходит с контекстом и опциями', () => {
		const plugin = new TProbePlugin()
		const ctx = context()
		const options = { placement: 'top' }
		const onInstall = vi.fn<TPluginEvents['install']>()

		plugin.events.on('install', onInstall)
		plugin.install(ctx, options)

		expect(onInstall.mock.calls).toStrictEqual([[ctx, options]])
		expect(onInstall.mock.calls[0][0]).toBe(ctx)
		expect(onInstall.mock.calls[0][1]).toBe(options)
	})

	it('create приходит с самим плагином', () => {
		const plugin = new TProbePlugin()
		const onCreate = vi.fn<TPluginEvents['create']>()

		plugin.events.on('create', onCreate)
		plugin.created()

		expect(onCreate.mock.calls).toStrictEqual([[plugin]])
		expect(onCreate.mock.calls[0][0]).toBe(plugin)
	})

	it('destroy приходит без аргументов', () => {
		const plugin = new TProbePlugin()
		const onDestroy = vi.fn<TPluginEvents['destroy']>()

		plugin.events.on('destroy', onDestroy)
		plugin.destroy()

		expect(onDestroy.mock.calls).toStrictEqual([[]])
	})
})
