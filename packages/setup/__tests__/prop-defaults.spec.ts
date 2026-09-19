import { assembleBundle, resolveComposition } from '../assemble'
// @vitest-environment jsdom

/**
 * Умолчание пропа — поле декларации.
 *
 * Адаптер берёт умолчание из декларации — через поверхность
 * (`surfaceOf(descriptor, profile).exportProps`) — и сам его не ищет.
 * Здесь проверяется, что setup кладёт туда то, с чем владелец пропа на самом
 * деле стартует: свой и унаследованный проп — из `defaultValues` итогового
 * класса, проп плагина — из опции дескриптора, иначе из `defaultValues`
 * плагина.
 *
 * Сторожа внизу идут по всем дескрипторам из экспорта. Первый — Boolean-пропы:
 * ровно те, которые Vue приводит сам. Отсутствующему Boolean без `default` он
 * ставит `false` и пишет его в инстанс или плагин. С умолчаниями это совпадало
 * случайно — пока у плагина якоря не появился `flip: true`.
 *
 * Второй — любой проп, который пишет разметка: снятый, он возвращается к
 * умолчанию декларации, и проп без него оставался с прежним значением во всех
 * адаптерах.
 */

import { describe, it, expect } from 'vitest'
import type { IPropDeclaration } from '@soldy/accessor'
import { TCollectionComponent, TFrame } from '@soldy/core'
import { TBasePlugin } from '@soldy/plugins'
import {
	AnchorPluginDescriptor,
	AriaPluginDescriptor,
	ComponentViewDescriptor,
	FrameDescriptor,
	IconDescriptor,
	ListBoxCollectionDescriptor,
	TabsItemDescriptor,
} from '../descriptors'
import {
	defineComponent,
	definePlugin,
	type IComponentDescriptor,
	type IPluginDefinition,
} from '../define'
import { exportedDescriptors, required } from './helpers'

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

/** Умолчание объявлено ключом без значения — «не задано». */
const declaredUnset = (declaration: IPropDeclaration): boolean =>
	Object.hasOwn(declaration, 'default') && declaration.default === undefined

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

	it('«не задано» объявлено: width и height у Icon, trackBy у фасада коллекции', () => {
		expect(declaredUnset(prop(IconDescriptor(), 'width'))).toBe(true)
		expect(declaredUnset(prop(IconDescriptor(), 'height'))).toBe(true)
		// Своих умолчаний у фасада нет: ключ он получает от базы `TBatchCollectionFacade`
		expect(declaredUnset(prop(ListBoxCollectionDescriptor(), 'trackBy'))).toBe(true)
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

	it('якорь по умолчанию не задан: anchor — null', () => {
		expect(prop(FrameDescriptor(), 'anchor:anchor').default).toBeNull()
	})

	it('имени по умолчанию нет: пропсы aria объявлены ключами без значения', () => {
		const aria = AriaPluginDescriptor()

		expect(declaredUnset(pluginProp(aria, 'label'))).toBe(true)
		expect(declaredUnset(pluginProp(aria, 'labelledBy'))).toBe(true)
		expect(declaredUnset(pluginProp(aria, 'describedBy'))).toBe(true)
	})

	it('у плагина без defaultValues поля нет', () => {
		class TWithoutDefaultsPlugin extends TBasePlugin {
			free = 'старт'
		}

		const definition = definePlugin({
			ctor: TWithoutDefaultsPlugin,
			namespace: 'sample',
			contribution: { props: { free: { type: String } } },
		})

		expect(Object.hasOwn(pluginProp(definition, 'free'), 'default')).toBe(false)
	})
})

/* -------------------------------------------------------------------------- */
/* Сторожа                                                                     */
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
		const bundle =
			fromPlugins.length > 0
				? assembleBundle(resolveComposition(descriptor, instance, {}), instance)
				: null

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

/**
 * Пропы фасадов коллекций, у которых умолчания нет намеренно: их сеттеры «не
 * задано» не принимают — `items` ждёт состав, `mode` — режим выбора. Снятый из
 * разметки такой проп сбрасывать не к чему, и значение остаётся. Проп попадает
 * сюда, только если его сеттер не принимает ни `undefined`, ни `null`;
 * остальным объявляют умолчание в `defaultValues` класса.
 */
const COLLECTION_PROPS_WITHOUT_DEFAULT: ReadonlySet<string> = new Set(['items', 'mode'])

/** Пропы, которые пишет разметка: незащищённые, с триггерами. */
const writtenByMarkup = (props: readonly IPropDeclaration[]) =>
	props.filter((declaration) => !declaration.protected && !!declaration.triggers?.length)

describe('сторож: проп, который пишет разметка, объявляет умолчание', () => {
	// У дескриптора без своего класса (`CollectionDescriptor`) умолчаний нет:
	// их пересчитывает от своего класса наследник
	const descriptors = exportedDescriptors().filter(([, descriptor]) => descriptor.ctor !== Object)

	it('дескрипторы найдены, а дескриптор без своего класса отсеян', () => {
		const names = descriptors.map(([name]) => name)

		expect(names).toEqual(
			expect.arrayContaining([
				'FrameDescriptor',
				'IconDescriptor',
				'ListBoxCollectionDescriptor',
			]),
		)
		expect(names).not.toContain('CollectionDescriptor')
	})

	it.each(descriptors)('%s', (_name, descriptor) => {
		const exempt: ReadonlySet<string> =
			descriptor.ctor.prototype instanceof TCollectionComponent
				? COLLECTION_PROPS_WITHOUT_DEFAULT
				: new Set()

		const missing = [
			...writtenByMarkup(descriptor.props),
			...descriptor.plugins.flatMap((definition) => writtenByMarkup(definition.props)),
		]
			.filter((declaration) => !Object.hasOwn(declaration, 'default'))
			.map((declaration) => declaration.name.getName())
			.filter((name) => !exempt.has(name))

		// Значим ключ, а не значение: «не задано» объявляется ключом без значения
		expect(missing).toEqual([])
	})
})
