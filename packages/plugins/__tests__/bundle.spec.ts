/**
 * `TPluginBundle` — жизненный цикл набора.
 *
 * Набор объявляет плагины (`created`) и уничтожает их (`destroy`) сам, а не
 * циклом по списку дескриптора: плагин, поставленный снаружи, живёт по тому же
 * циклу, что и плагины компонента.
 */

import { describe, it, expect } from 'vitest'
import { TBasePlugin, TPluginBundle } from '../src'
import type { IPluginContext } from '../src'

const log: string[] = []

/** Пишет в журнал свои install/create/destroy под своим именем. */
abstract class TLoggedPlugin extends TBasePlugin {
	protected abstract readonly _name: string

	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)
		log.push(`install:${this._name}`)
	}

	override created(): void {
		super.created()
		log.push(`create:${this._name}`)
	}

	override destroy(): void {
		log.push(`destroy:${this._name}`)
		super.destroy()
	}
}

class TFirstPlugin extends TLoggedPlugin {
	protected readonly _name = 'first'
}

class TSecondPlugin extends TLoggedPlugin {
	protected readonly _name = 'second'
}

class TLatePlugin extends TLoggedPlugin {
	protected readonly _name = 'late'
}

const bundle = () => {
	log.length = 0

	return new TPluginBundle({}).use(TFirstPlugin).use(TSecondPlugin)
}

describe('TPluginBundle — жизненный цикл', () => {
	it('created объявляет плагины в порядке установки, повторный вызов — ничего', () => {
		const plugins = bundle()

		plugins.created()
		plugins.created()

		expect(log).toEqual(['install:first', 'install:second', 'create:first', 'create:second'])
	})

	it('до created плагин, поставленный позже, объявляется вместе с остальными', () => {
		const plugins = bundle()

		plugins.use(TLatePlugin)
		plugins.created()

		expect(log.filter((entry) => entry.startsWith('create:'))).toEqual([
			'create:first',
			'create:second',
			'create:late',
		])
	})

	it('после created плагин объявляется сразу в use', () => {
		const plugins = bundle()

		plugins.created()
		plugins.use(TLatePlugin)

		expect(log.slice(-2)).toEqual(['install:late', 'create:late'])
	})

	it('destroy уничтожает плагины в обратном порядке и очищает набор', () => {
		const plugins = bundle()

		plugins.created()
		plugins.use(TLatePlugin)
		log.length = 0

		plugins.destroy()

		expect(log).toEqual(['destroy:late', 'destroy:second', 'destroy:first'])
		expect(plugins.get(TFirstPlugin)).toBeUndefined()
	})

	it('created после destroy плагины не объявляет', () => {
		const plugins = bundle()

		expect(plugins.destroyed).toBe(false)

		plugins.destroy()
		// use() уничтоженный набор не запрещает, но объявленный после destroy
		// плагин остался бы жить: уничтожать его уже некому
		plugins.use(TLatePlugin)
		plugins.created()

		expect(plugins.destroyed).toBe(true)
		expect(log.filter((entry) => entry.startsWith('create:'))).toEqual([])
	})
})
