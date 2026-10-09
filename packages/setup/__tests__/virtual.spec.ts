// @vitest-environment jsdom

/**
 * Обёртка `Virtual` и подхват её окна коллекцией — без фреймворка.
 *
 * Обёртка опускает по лифту подключение к окну (`TVirtualExtension`), а
 * коллекция внутри подхватывает его своим расширением
 * (`TVirtualCollectionExtension`) по фазам своего контекста. Сборка ставит в
 * набор плагин замера и в рисование стратегию окна по текущему `enabled` —
 * то, что принадлежит коллекции. Принятая коллекция подписывается на
 * выключатель обёртки: шина обёртки ей чужая, а собранную коллекцию фреймворк
 * вправе выбросить, так и не приняв. Снимает — на `destroy`, и своему
 * поддереву опускает пустое подключение. Лифт здесь — в памяти, без дерева:
 * значение, которое коллекция опустила, видит следующая коллекция, как
 * вложенная.
 *
 * Что рисует окно, — `core/__tests__/collection.draw.spec.ts`, замер —
 * `plugins/__tests__/virtual.plugin.spec.ts`, разметка — в тестах адаптеров
 * (`ui/*\/__tests__/virtual.spec.*`).
 */

import { describe, it, expect } from 'vitest'
import { TVirtual, createEngineListBox } from '@soldy-ui/core'
import type { TCollectionEngine } from '@soldy-ui/core'
import { TVirtualPlugin } from '@soldy-ui/plugins'
import {
	ListBoxCollectionDescriptor,
	ListBoxDescriptor,
	TableCollectionDescriptor,
	TableDescriptor,
	TCollectionExtension,
	TVirtualCollectionExtension,
	TVirtualExtension,
	VirtualDescriptor,
	createAdapterContext,
} from '@soldy-ui/setup'
import type { TElevatorFactory } from '@soldy-ui/setup'
import { createElevatorFactory, leftovers, required, spyBus } from './helpers'

const ITEMS = Array.from({ length: 100 }, (_, index) => ({
	value: `v${index + 1}`,
	text: `Пункт ${index + 1}`,
}))

/** Обёртка: подключение к окну опущено по лифту. */
function wrap(elevator: TElevatorFactory, props: { enabled?: boolean } = {}) {
	const context = createAdapterContext(VirtualDescriptor(), { props }).use(TVirtualExtension, {
		elevator,
	})

	context.attach()

	return context
}

/**
 * ListBox под тем же лифтом — собранный, но ещё не принятый: свой контекст и
 * контекст коллекции с подхватом окна. Принимает его `attach`, как рантайм
 * фреймворка.
 */
function assembleListBox(elevator: TElevatorFactory, engine?: TCollectionEngine<any, any>) {
	const adapter = createAdapterContext(ListBoxDescriptor(), { props: {} })
	const collection = createAdapterContext(
		ListBoxCollectionDescriptor(),
		{ props: { items: ITEMS }, options: { owner: adapter.instance, engine } },
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator })
		.use(TVirtualCollectionExtension, { elevator })

	return {
		adapter,
		draw: collection.instance.engine.extensions.draw,
		attach: () => {
			adapter.attach()
			collection.attach()
		},
		destroy: () => {
			adapter.destroy()
			collection.destroy()
		},
	}
}

/** ListBox под тем же лифтом, принятый сразу после сборки. */
function listBox(elevator: TElevatorFactory, engine?: TCollectionEngine<any, any>) {
	const list = assembleListBox(elevator, engine)
	/** Окно стоит уже после сборки — до того, как фреймворк принял компонент. */
	const assembled = list.draw.virtual

	list.attach()

	return { ...list, assembled }
}

describe('дескриптор', () => {
	it('невизуальный, как DragAndDrop: набора плагинов нет, проп `enabled` — по умолчанию включён', () => {
		const descriptor = VirtualDescriptor()
		const enabled = required(
			descriptor.props.find((prop) => prop.name.getName() === 'enabled'),
			'проп enabled',
		)

		expect(descriptor.ctor).toBe(TVirtual)
		expect(createAdapterContext(descriptor, {}).bundle).toBeNull()
		expect(enabled.default).toBe(true)
		expect(enabled.triggers.map((trigger) => trigger.getName())).toEqual(['change:enabled'])
	})
})

describe('подхват окна', () => {
	it('без обёртки — коллекция рисует всё, плагина замера в наборе нет', () => {
		const { factory } = createElevatorFactory()
		const { adapter, draw } = listBox(factory)

		expect(draw.virtual).toBe(false)
		expect(draw.drawn).toHaveLength(ITEMS.length)
		expect(adapter.bundle?.get(TVirtualPlugin)).toBeUndefined()
	})

	it('под обёрткой — окно с самой сборки, а плагин замера — в наборе коллекции', () => {
		const { factory } = createElevatorFactory()

		wrap(factory)

		const { adapter, draw, assembled } = listBox(factory)

		expect(assembled).toBe(true)
		expect(draw.drawn).toHaveLength(50)
		expect(adapter.bundle?.get(TVirtualPlugin)).toBeInstanceOf(TVirtualPlugin)
	})

	it('Table под обёрткой — тоже окно', () => {
		const { factory } = createElevatorFactory()

		wrap(factory)

		const adapter = createAdapterContext(TableDescriptor(), { props: {} })
		const collection = createAdapterContext(
			TableCollectionDescriptor(),
			{
				props: { items: ITEMS.map((data) => ({ data })) },
				options: { owner: adapter.instance },
			},
			{ bundle: adapter.bundle },
		)
			.use(TCollectionExtension, { elevator: factory })
			.use(TVirtualCollectionExtension, { elevator: factory })

		expect(collection.instance.engine.extensions.draw.virtual).toBe(true)
		expect(adapter.bundle?.get(TVirtualPlugin)).toBeInstanceOf(TVirtualPlugin)
	})

	it('`enabled` выключает и включает окно на лету', () => {
		const { factory } = createElevatorFactory()
		const virtual = wrap(factory, { enabled: false })
		const { draw } = listBox(factory)

		expect(draw.virtual).toBe(false)

		virtual.instance.enabled = true

		expect(draw.virtual).toBe(true)

		virtual.instance.enabled = false

		expect(draw.virtual).toBe(false)
		expect(draw.drawn).toHaveLength(ITEMS.length)
	})

	it('коллекцию уничтожили — окно с движка снаружи снято, от обёртки она отписана', () => {
		const { factory } = createElevatorFactory()
		const virtual = wrap(factory)
		const engine = createEngineListBox({ items: ITEMS })
		const { destroy } = listBox(factory, engine)

		expect(engine.extensions.draw.virtual).toBe(true)

		destroy()

		expect(engine.extensions.draw.virtual).toBe(false)

		virtual.instance.enabled = false
		virtual.instance.enabled = true

		expect(engine.extensions.draw.virtual).toBe(false)
	})

	it('вложенной коллекции — пустое подключение: списки в слотах элементов окна не наследуют', () => {
		const { factory } = createElevatorFactory()

		wrap(factory)

		const outer = listBox(factory)
		const inner = listBox(factory)

		expect(outer.draw.virtual).toBe(true)
		expect(inner.draw.virtual).toBe(false)
	})
})

/**
 * Шина обёртки для коллекции чужая: на неё подписывается только принятая
 * коллекция. Собранную коллекцию фреймворк вправе выбросить, так и не приняв,
 * и выброшенную сборку списка из `items` освободить некому — у неё нет ни
 * `ctrl`, ни движка снаружи, по которым узнают выброшенную сборку.
 */
describe('фазы контекста коллекции', () => {
	it('сборка без приёма: окно уже стоит, а на шине обёртки ничего', () => {
		const { factory } = createElevatorFactory()
		const virtual = wrap(factory)
		const bus = spyBus('обёртка', virtual.instance)
		const { draw } = assembleListBox(factory)

		expect(draw.virtual).toBe(true)
		expect(draw.drawn).toHaveLength(50)
		expect(leftovers(bus)).toEqual([])
	})

	it('приём: подписка на выключатель, и `enabled`, сменённый до приёма, применён', () => {
		const { factory } = createElevatorFactory()
		const virtual = wrap(factory)
		const bus = spyBus('обёртка', virtual.instance)
		const list = assembleListBox(factory)

		// Выключили между сборкой и приёмом: собранная коллекция этого не слышала
		virtual.instance.enabled = false

		expect(list.draw.virtual).toBe(true)

		list.attach()

		expect(leftovers(bus)).toEqual(['обёртка: change:enabled'])
		expect(list.draw.virtual).toBe(false)

		virtual.instance.enabled = true

		expect(list.draw.virtual).toBe(true)
	})

	it('`destroy` до приёма ничего не оставляет: ни подписки на обёртке, ни окна и плагина на движке снаружи', () => {
		const { factory } = createElevatorFactory()
		const virtual = wrap(factory)
		const engine = createEngineListBox({ items: ITEMS })
		const buses = [
			...spyBus('обёртка', virtual.instance),
			...spyBus('рисование', engine.extensions.draw),
		]
		const list = assembleListBox(factory, engine)

		expect(engine.extensions.draw.virtual).toBe(true)
		expect(list.adapter.bundle?.get(TVirtualPlugin)).toBeInstanceOf(TVirtualPlugin)

		list.destroy()

		expect(engine.extensions.draw.virtual).toBe(false)
		expect(leftovers(buses)).toEqual([])

		// Выключатель обёртки движок больше не трогает
		virtual.instance.enabled = false
		virtual.instance.enabled = true

		expect(engine.extensions.draw.virtual).toBe(false)
	})
})
