import { describe, it, expect } from 'vitest'
import { TName, type IPropDeclaration } from '@soldy/accessor'
import { TBasePlugin } from '@soldy/plugins'
import {
	normalizeContribution,
	defineComponent,
	definePlugin,
	collectDeclaredProps,
	collectItemProps,
} from '@soldy/setup'

describe('normalizeContribution', () => {
	it('возвращает пустой результат для undefined и пустого contribution', () => {
		expect(normalizeContribution()).toEqual({ props: [], events: [] })
		expect(normalizeContribution({})).toEqual({ props: [], events: [] })
	})

	it('нормализует props: TName, type, protected, triggers, get/set', () => {
		const get = (i: { text: string }) => i.text
		const set = (i: { text: string }, v: string) => {
			i.text = v
		}

		const result = normalizeContribution({
			props: {
				text: { type: String, triggers: ['change:text'], get, set },
				secret: { type: Boolean, protected: true },
			},
			events: ['click', 'input'],
		})

		expect(result.props).toHaveLength(2)

		const text = result.props.find((p) => p.name.name === 'text')!
		expect(text.type).toBe(String)
		expect(text.protected).toBe(false)
		expect(text.triggers.map((t) => t.name)).toEqual(['change:text'])
		expect(text.get).toBe(get)
		expect(text.set).toBe(set)

		const secret = result.props.find((p) => p.name.name === 'secret')!
		expect(secret.protected).toBe(true)
		expect(secret.triggers).toEqual([])

		expect(result.events.map((e) => e.name)).toEqual(['click', 'input'])
	})

	it('применяет namespace к именам props, triggers и events', () => {
		const result = normalizeContribution(
			{
				props: { x: { type: String, triggers: ['change:x'] } },
				events: ['go'],
			},
			'ns',
		)

		expect(result.props[0].name.getName()).toBe('ns:x')
		expect(result.props[0].triggers[0].getName()).toBe('ns:change:x')
		expect(result.events[0].getName()).toBe('ns:go')
	})
})

describe('defineComponent', () => {
	it('собирает props/events и ctor из собственного contribution', () => {
		class Foo {}

		const descriptor = defineComponent({
			ctor: Foo,
			contribution: {
				props: { text: { type: String } },
				events: ['click'],
			},
		})

		expect(descriptor.ctor).toBe(Foo)
		expect(descriptor.props.map((p) => p.name.name)).toEqual(['text'])
		expect(descriptor.events.map((e) => e.name)).toEqual(['click'])
	})

	it('наследует props/events родителя и берёт его ctor при отсутствии своего', () => {
		class Parent {}
		const parent = defineComponent({
			ctor: Parent,
			contribution: { props: { a: { type: String } }, events: ['e1'] },
		})

		const child = defineComponent({
			extends: parent,
			contribution: { props: { b: { type: Boolean } }, events: ['e2'] },
		})

		expect(child.ctor).toBe(Parent)
		expect(child.props.map((p) => p.name.name)).toEqual(['a', 'b'])
		expect(child.events.map((e) => e.name)).toEqual(['e1', 'e2'])
	})

	it('объединяет и дедуплицирует плагины по ctor', () => {
		class PluginA {}
		class PluginB {}

		const parent = defineComponent({
			ctor: class {},
			plugins: [definePlugin({ ctor: PluginA })],
		})

		const child = defineComponent({
			extends: parent,
			plugins: [definePlugin({ ctor: PluginB })],
		})

		expect(child.plugins.map((p) => p.ctor)).toEqual([PluginA, PluginB])

		// Повторный ctor переопределяет родительский
		const childOverride = defineComponent({
			extends: parent,
			plugins: [definePlugin({ ctor: PluginA, options: { x: 1 } })],
		})

		expect(childOverride.plugins).toHaveLength(1)
		expect(childOverride.plugins[0].options).toEqual({ x: 1 })
	})

	it('создаёт null-бандл при отсутствии плагинов', () => {
		const descriptor = defineComponent({ ctor: class {} })

		expect(descriptor.createBundle(new descriptor.ctor())).toBeNull()
	})

	it('createAccessor привязывает props/events к instance', () => {
		const descriptor = defineComponent({
			ctor: class {},
			contribution: {
				props: { text: { type: String } },
				events: ['click'],
			},
		})

		const instance = new descriptor.ctor()
		const accessor = descriptor.createAccessor(instance, null)

		expect(accessor.getProps()).toHaveLength(1)
		expect(accessor.getProps()[0].instance).toBe(instance)
		expect(accessor.getProps()[0].name.name).toBe('text')

		expect(accessor.getEvents()).toHaveLength(1)
		expect(accessor.getEvents()[0].instance).toBe(instance)
		expect(accessor.getEvents()[0].name.name).toBe('click')
	})

	it('createAccessor добавляет Unit плагина с его props/events', () => {
		class PluginWithProps extends TBasePlugin {
			active = false
		}

		const plugin = definePlugin({
			ctor: PluginWithProps,
			namespace: 'p',
			contribution: {
				props: { active: { type: Boolean } },
				events: ['toggle'],
			},
		})

		const descriptor = defineComponent({
			ctor: class {},
			plugins: [plugin],
		})

		const instance = new descriptor.ctor()
		const bundle = descriptor.createBundle(instance)
		const accessor = descriptor.createAccessor(instance, bundle)

		const activeProp = accessor.getProps().find((p) => p.name.getName() === 'p:active')!
		expect(activeProp).toBeDefined()
		expect(activeProp.instance).toBe(bundle!.get(PluginWithProps))

		expect(accessor.getEvents().some((e) => e.name.getName() === 'p:toggle')).toBe(true)
	})
})

describe('definePlugin', () => {
	it('нормализует contribution с namespace и сохраняет options', () => {
		class P {}

		const plugin = definePlugin({
			ctor: P,
			namespace: 'x',
			contribution: {
				props: { v: { type: Number } },
				events: ['go'],
			},
			options: { a: 1 },
		})

		expect(plugin.ctor).toBe(P)
		expect(plugin.props.map((p) => p.name.getName())).toEqual(['x:v'])
		expect(plugin.events.map((e) => e.getName())).toEqual(['x:go'])
		expect(plugin.options).toEqual({ a: 1 })
	})
})

describe('collectDeclaredProps / collectItemProps', () => {
	const decls: IPropDeclaration[] = [
		{ name: new TName('a') },
		{ name: new TName('b'), protected: true },
		{ name: new TName('c') },
	]

	const props = { a: 1, b: 2, c: undefined, d: 4 }

	it('выбирает только объявленные незащищённые пропсы с заданным значением', () => {
		expect(collectDeclaredProps(decls, props)).toEqual({ a: 1 })
	})

	it('collectItemProps делегирует collectDeclaredProps', () => {
		expect(collectItemProps(decls, props)).toEqual({ a: 1 })
	})
})
