/**
 * @soldy/setup — тесты defineComponent / definePlugin
 * Перенесено из @soldy/provider, т.к. реализация теперь в @soldy/setup.
 */
import { describe, it, expect } from 'vitest'
import { defineComponent, definePlugin } from '../descriptors/define-component'
import type { IContribution } from '@soldy/provider'

class ClassA {
	a = 'a'
	events = { on: (_e: string, _h: any) => {}, off: (_e: string, _h: any) => {} }
}
class ClassB {
	b = 'b'
	events = { on: (_e: string, _h: any) => {}, off: (_e: string, _h: any) => {} }
}

const ContribA: IContribution = {
	props: [{ name: 'a', kind: 'state' }],
	events: ['show'],
}

const ContribB: IContribution = {
	props: [{ name: 'b', kind: 'computed' }],
	events: ['hide'],
}

const ContribPlugin: IContribution = {
	props: [{ name: 'pluginProp', kind: 'state', mutable: false }],
	events: ['pluginReady'],
}

class MockProvider {
	constructor(_instance: any) {}
	getAccessor() { return undefined }
	subscribe() { return undefined }
}

class MockPlugin {
	static readonly key = Symbol('mock')
	install(_bundle: any) {}
	destroy() {}
}

describe('defineComponent', () => {
	it('создаёт дескриптор с моделью из contribution', () => {
		const d = defineComponent({
			ctor: ClassA,
			contribution: ContribA,
			provider: MockProvider,
		})

		expect(d.model.props).toHaveLength(1)
		expect(d.model.props[0].name).toBe('a')
		expect(d.model.events).toContain('show')
	})

	it('state по умолчанию mutable: true', () => {
		const d = defineComponent({
			ctor: ClassA,
			contribution: { props: [{ name: 'x', kind: 'state' }], events: [] },
			provider: MockProvider,
		})

		expect(d.model.props[0].mutable).toBe(true)
	})

	it('computed всегда mutable: false', () => {
		const d = defineComponent({
			ctor: ClassA,
			contribution: { props: [{ name: 'y', kind: 'computed' }], events: [] },
			provider: MockProvider,
		})

		expect(d.model.props[0].mutable).toBe(false)
	})

	it('уважает явный mutable: false для state', () => {
		const d = defineComponent({
			ctor: ClassA,
			contribution: { props: [{ name: 'z', kind: 'state', mutable: false }], events: [] },
			provider: MockProvider,
		})

		expect(d.model.props[0].mutable).toBe(false)
	})

	it('наследование через extends', () => {
		const parent = defineComponent({
			ctor: ClassA,
			contribution: ContribA,
			provider: MockProvider,
		})

		const child = defineComponent({
			ctor: ClassB,
			extends: parent,
			contribution: ContribB,
			provider: MockProvider,
		})

		expect(child.model.props.map(p => p.name)).toEqual(['a', 'b'])
		expect(child.model.events).toContain('show')
		expect(child.model.events).toContain('hide')
	})

	it('дедуплицирует события при наследовании', () => {
		const parent = defineComponent({
			ctor: ClassA,
			contribution: { props: [], events: ['show', 'hide'] },
			provider: MockProvider,
		})

		const child = defineComponent({
			ctor: ClassB,
			extends: parent,
			contribution: { props: [], events: ['hide'] },
			provider: MockProvider,
		})

		expect(child.model.events.filter(e => e === 'hide')).toHaveLength(1)
	})

	it('плагины добавляют props и events в модель', () => {
		const d = defineComponent({
			ctor: ClassA,
			contribution: ContribA,
			plugins: [
				definePlugin({
					plugin: MockPlugin,
					contribution: ContribPlugin,
					provider: MockProvider,
				}),
			],
			provider: MockProvider,
		})

		const names = d.model.props.map(p => p.name)
		expect(names).toContain('a')
		expect(names).toContain('pluginProp')
		expect(d.model.events).toContain('pluginReady')
	})

	it('плагины наследуются через extends (createBundle)', () => {
		const parent = defineComponent({
			ctor: ClassA,
			contribution: ContribA,
			plugins: [
				definePlugin({
					plugin: MockPlugin,
					contribution: ContribPlugin,
					provider: MockProvider,
				}),
			],
			provider: MockProvider,
		})

		const child = defineComponent({
			ctor: ClassB,
			extends: parent,
			contribution: ContribB,
			provider: MockProvider,
		})

		const bundle = child.createBundle()
		expect(bundle.get(MockPlugin as any)).toBeDefined()
	})

	it('createProvider создаёт агрегатный провайдер', () => {
		const d = defineComponent({
			ctor: ClassA,
			contribution: ContribA,
			provider: MockProvider,
		})

		const instance = new ClassA()
		const bundle = d.createBundle()
		const provider = d.createProvider({ instance, bundle })

		expect(provider).toBeDefined()
		expect(typeof provider.getAccessor).toBe('function')
		expect(typeof provider.subscribe).toBe('function')
	})

	it('createRuntime создаёт TRuntime с правильной моделью', () => {
		const d = defineComponent({
			ctor: ClassA,
			contribution: ContribA,
			provider: MockProvider,
		})

		const instance = new ClassA()
		const bundle = d.createBundle()
		const runtime = d.createRuntime({ instance, bundle })

		expect(runtime).toBeDefined()
		expect(runtime.model).toBe(d.model)
		runtime.dispose()
	})

	it('model кешируется (ленивое вычисление)', () => {
		const d = defineComponent({
			ctor: ClassA,
			contribution: ContribA,
			provider: MockProvider,
		})

		const m1 = d.model
		const m2 = d.model
		expect(m1).toBe(m2)
	})

	it('triggers проброшены от contribution в модель', () => {
		const d = defineComponent({
			ctor: ClassA,
			contribution: {
				props: [{ name: 'x', kind: 'state', triggers: ['change:x'] }],
				events: [],
			},
			provider: MockProvider,
		})

		expect(d.model.props[0].triggers).toEqual(['change:x'])
	})

	it('definePlugin возвращает переданные опции', () => {
		const pluginDef = definePlugin({
			plugin: MockPlugin,
			contribution: ContribPlugin,
			provider: MockProvider,
		})

		expect(pluginDef.plugin).toBe(MockPlugin)
		expect(pluginDef.contribution).toBe(ContribPlugin)
		expect(pluginDef.provider).toBe(MockProvider)
	})
})
