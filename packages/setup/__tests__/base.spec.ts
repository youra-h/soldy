import { describe, it, expect, vi } from 'vitest'
import { TBasePlugin } from '@soldy/plugins'
import {
	CommonProfile,
	createAdapterContext,
	normalizeContribution,
	defineComponent,
	definePlugin,
} from '@soldy/setup'
import { required } from './helpers'

describe('normalizeContribution', () => {
	it('возвращает пустой результат для undefined и пустого contribution', () => {
		expect(normalizeContribution()).toEqual({ props: [], events: [], slots: [] })
		expect(normalizeContribution({})).toEqual({ props: [], events: [], slots: [] })
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

		const text = required(
			result.props.find((p) => p.name.name === 'text'),
			'prop text',
		)
		expect(text.type).toBe(String)
		expect(text.protected).toBe(false)
		expect(text.triggers?.map((t) => t.name)).toEqual(['change:text'])
		expect(text.get).toBe(get)
		expect(text.set).toBe(set)

		const secret = required(
			result.props.find((p) => p.name.name === 'secret'),
			'prop secret',
		)
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
		expect(result.props[0].triggers?.[0]?.getName()).toBe('ns:change:x')
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
			plugins: [definePlugin({ ctor: PluginA }).with({ x: 1 })],
		})

		expect(childOverride.plugins).toHaveLength(1)
		expect(childOverride.plugins[0].options).toEqual({ x: 1 })
	})

	it('имя пропа у наследника — переобъявление, а имя события — дубль', () => {
		class TOwner {}

		const report = vi.spyOn(console, 'error').mockImplementation(() => {})
		const parent = defineComponent({
			ctor: TOwner,
			contribution: { props: { text: { type: String } }, events: ['click'] },
		})

		expect(report).not.toHaveBeenCalled()

		// Проп наследника ложится на родительский (см. «переобъявление пропа»),
		// а событие так не складывается: дубль — на совести автора, слой
		// сообщает о нём и работает дальше
		const child = defineComponent({
			extends: parent,
			contribution: { props: { text: { type: String } }, events: ['click'] },
		})

		expect(child.props.map((prop) => prop.name.name)).toEqual(['text'])
		expect(report.mock.calls.map(([message]) => message)).toEqual([
			'TOwner: событие «click» объявлено дважды — полное имя обязано быть одно',
		])
		expect(() => createAdapterContext(child, {}).connect(CommonProfile)).not.toThrow()

		report.mockRestore()
	})

	it('своё имя пропа и имя пропа плагина — по-прежнему дубль', () => {
		class TOwner {}
		class PluginWithText extends TBasePlugin {
			text = ''
		}

		const report = vi.spyOn(console, 'error').mockImplementation(() => {})

		// Имена плагинов разводит неймспейс; без него столкновение остаётся,
		// и слияние деклараций наследника его не прячет
		defineComponent({
			ctor: TOwner,
			contribution: { props: { text: { type: String } } },
			plugins: [
				definePlugin({ ctor: PluginWithText, contribution: { props: { text: {} } } }),
			],
		})

		expect(report.mock.calls.map(([message]) => message)).toEqual([
			'TOwner: свойство «text» объявлено дважды — полное имя обязано быть одно',
		])

		report.mockRestore()
	})

	it('компоненту без плагинов набор не создаётся', () => {
		const descriptor = defineComponent({ ctor: class {} })

		expect(createAdapterContext(descriptor, {}).bundle).toBeNull()
	})

	it('линия привязывает проп к инстансу', () => {
		const descriptor = defineComponent({
			ctor: class {},
			contribution: {
				props: { text: { type: String } },
				events: ['click'],
			},
		})

		const context = createAdapterContext(descriptor, {})
		const { lines } = context.connect(CommonProfile)

		expect(lines).toHaveLength(1)
		expect(lines[0].owner).toBe(context.instance)
		expect(lines[0].spec.name.name).toBe('text')
		expect(descriptor.getEvents().map((event) => event.name)).toEqual(['click'])
	})

	it('плагин дескриптора — участник обмена со своими пропсами и событиями', () => {
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

		const context = createAdapterContext(descriptor, {})
		const active = required(
			context
				.connect(CommonProfile)
				.lines.find((line) => line.spec.name.getName() === 'p:active'),
			'линия p:active',
		)

		expect(active.name).toBe('p_active')
		expect(active.owner).toBe(required(context.bundle, 'бандл').get(PluginWithProps))
		expect(descriptor.getEvents().some((event) => event.getName() === 'p:toggle')).toBe(true)
	})
})

describe('definePlugin', () => {
	it('нормализует contribution с namespace; опции задаёт with()', () => {
		class P {}

		const plugin = definePlugin({
			ctor: P,
			namespace: 'x',
			contribution: {
				props: { v: { type: Number } },
				events: ['go'],
			},
		})

		expect(plugin.ctor).toBe(P)
		expect(plugin.props.map((p) => p.name.getName())).toEqual(['x:v'])
		expect(plugin.events.map((e) => e.getName())).toEqual(['x:go'])
		expect(plugin.options).toBeUndefined()

		const used = plugin.with({ a: 1 })

		expect(used.ctor).toBe(P)
		expect(used.props.map((p) => p.name.getName())).toEqual(['x:v'])
		expect(used.events.map((e) => e.getName())).toEqual(['x:go'])
		expect(used.options).toEqual({ a: 1 })
		// Исходное определение делят все дескрипторы — with() его не меняет
		expect(plugin.options).toBeUndefined()
	})
})
