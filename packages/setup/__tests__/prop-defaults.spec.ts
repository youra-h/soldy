// @vitest-environment jsdom

/**
 * Умолчание пропа — поле декларации.
 *
 * Адаптер берёт умолчание из декларации (`getExportProps`) и сам его не ищет.
 * Здесь проверяется, что setup кладёт туда то, с чем владелец пропа на самом
 * деле стартует: свой и унаследованный проп — из `defaultValues` итогового
 * класса, проп плагина — из опции дескриптора, иначе из `defaultValues`
 * плагина.
 *
 * Сторож внизу идёт по всем дескрипторам из экспорта. Boolean-пропы — ровно те,
 * которые Vue приводит сам: отсутствующему Boolean без `default` он ставит
 * `false` и пишет его в инстанс или плагин. С умолчаниями это совпадало
 * случайно — пока у плагина якоря не появился `flip: true`.
 */

import { describe, it, expect } from 'vitest'
import type { IPropDeclaration } from '@soldy/accessor'
import { TFrame } from '@soldy/core'
import * as exported from '../descriptors'
import {
	AnchorPluginDescriptor,
	AriaPluginDescriptor,
	ComponentViewDescriptor,
	FrameDescriptor,
	TabsItemDescriptor,
	defineComponent,
	type IComponentDescriptor,
	type IPluginDefinition,
} from '../descriptors'
import { required } from './helpers'

/** Декларация по полному имени: `visible`, `anchor:flip`. */
function prop(descriptor: Pick<IComponentDescriptor, 'getProps'>, name: string): IPropDeclaration {
	return required(
		descriptor.getProps().find((declaration) => declaration.name.getName() === name),
		name,
	)
}

/** Декларация пропа в определении плагина — по имени без неймспейса. */
function pluginProp(definition: IPluginDefinition, name: string): IPropDeclaration {
	return required(
		definition.props.find((declaration) => declaration.name.name === name),
		name,
	)
}

describe('умолчание своего и унаследованного пропа — из defaultValues класса', () => {
	it('у ComponentView visible — true, у Frame — false', () => {
		expect(prop(ComponentViewDescriptor(), 'visible').default).toBe(true)
		expect(prop(FrameDescriptor(), 'visible').default).toBe(false)
	})

	it('наследник пересчитывает умолчание, декларации родителя не меняются', () => {
		const parent = ComponentViewDescriptor()
		const child = defineComponent({ ctor: TFrame, extends: parent })

		expect(prop(child, 'visible').default).toBe(false)
		expect(prop(parent, 'visible').default).toBe(true)
	})

	it('ключ со значением undefined сохраняется: closable у Tabs.Item', () => {
		const closable = prop(TabsItemDescriptor(), 'closable')

		expect(Object.hasOwn(closable, 'default')).toBe(true)
		expect(closable.default).toBeUndefined()
	})

	it('нет ключа в defaultValues — нет и поля', () => {
		class TSample {
			static defaultValues = { declared: 1 }
		}

		const descriptor = defineComponent({
			ctor: TSample,
			contribution: { props: { declared: { type: Number }, missing: { type: Number } } },
		})

		expect(prop(descriptor, 'declared').default).toBe(1)
		expect(Object.hasOwn(prop(descriptor, 'missing'), 'default')).toBe(false)
	})
})

describe('умолчание пропа плагина', () => {
	it('без опции — из defaultValues плагина', () => {
		expect(prop(FrameDescriptor(), 'anchor:flip').default).toBe(true)
		expect(prop(FrameDescriptor(), 'anchor:placement').default).toBe('bottom-start')
	})

	it('опция дескриптора сильнее defaultValues плагина', () => {
		const definition = AnchorPluginDescriptor({ flip: false, placement: 'top-end' })

		expect(pluginProp(definition, 'flip').default).toBe(false)
		expect(pluginProp(definition, 'placement').default).toBe('top-end')
		expect(pluginProp(definition, 'matchWidth').default).toBe(false)
	})

	it('опция undefined считается незаданной — как её читает сам плагин', () => {
		expect(pluginProp(AnchorPluginDescriptor({ flip: undefined }), 'flip').default).toBe(true)
	})

	it('у плагина без defaultValues поля нет', () => {
		expect(Object.hasOwn(pluginProp(AriaPluginDescriptor(), 'label'), 'default')).toBe(false)
	})
})

/* -------------------------------------------------------------------------- */
/* Сторож                                                                      */
/* -------------------------------------------------------------------------- */

/** Boolean в типе пропа: сам, в массиве или внутри `defineType`. */
function hasBoolean(type: unknown): boolean {
	if (type === Boolean) return true
	if (Array.isArray(type)) return type.some(hasBoolean)
	if (typeof type === 'object' && type !== null && 'ctor' in type) return hasBoolean(type.ctor)

	return false
}

/** Пропы, которые Vue приводит к `false` сам: незащищённые, с Boolean в типе. */
const castByVue = (props: readonly IPropDeclaration[]) =>
	props.filter((declaration) => !declaration.protected && hasBoolean(declaration.type))

function isComponentDescriptor(value: unknown): value is IComponentDescriptor {
	return (
		typeof value === 'object' && value !== null && 'createBundle' in value && 'plugins' in value
	)
}

/** Все дескрипторы компонентов из экспорта — не ручным списком: новый попадёт сюда сам. */
function exportedDescriptors(): Array<[string, IComponentDescriptor]> {
	const entries: Record<string, unknown> = exported
	const result: Array<[string, IComponentDescriptor]> = []

	for (const [name, factory] of Object.entries(entries)) {
		if (!name.endsWith('Descriptor') || typeof factory !== 'function') continue

		const value: unknown = factory()

		if (isComponentDescriptor(value)) result.push([name, value])
	}

	return result
}

const NOT_DECLARED = '<умолчание не объявлено>'

const declaredDefault = (declaration: IPropDeclaration): unknown =>
	Object.hasOwn(declaration, 'default') ? declaration.default : NOT_DECLARED

const freshValue = (declaration: IPropDeclaration, owner: object): unknown =>
	declaration.get ? declaration.get(owner) : Reflect.get(owner, declaration.name.name)

describe('сторож: Boolean-проп объявляет умолчание, равное стартовому значению', () => {
	const descriptors = exportedDescriptors()

	it('дескрипторы найдены в экспорте', () => {
		expect(descriptors.map(([name]) => name)).toEqual(
			expect.arrayContaining(['FrameDescriptor', 'SelectDescriptor', 'TabsItemDescriptor']),
		)
	})

	it.each(descriptors)('%s', (_name, descriptor) => {
		const own = castByVue(descriptor.props)
		const fromPlugins = descriptor.plugins.flatMap((definition) =>
			castByVue(definition.props).map((declaration) => ({ definition, declaration })),
		)

		// Инстанс — только когда есть что проверять: фасадам владельцев нужны options
		if (own.length === 0 && fromPlugins.length === 0) return

		const instance = new descriptor.ctor()
		const bundle = fromPlugins.length > 0 ? descriptor.createBundle(instance) : null

		const declared: Record<string, unknown> = {}
		const fresh: Record<string, unknown> = {}

		for (const declaration of own) {
			declared[declaration.name.getName()] = declaredDefault(declaration)
			fresh[declaration.name.getName()] = freshValue(declaration, instance)
		}

		for (const { definition, declaration } of fromPlugins) {
			const plugin = required(bundle?.get(definition.ctor), declaration.name.getName())

			declared[declaration.name.getName()] = declaredDefault(declaration)
			fresh[declaration.name.getName()] = freshValue(declaration, plugin)
		}

		expect(declared).toEqual(fresh)
	})
})
