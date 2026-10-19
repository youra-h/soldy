// @vitest-environment jsdom

/**
 * Реестр узлов элементов коллекции (`TCollectionElements` над
 * `TCollectionBundlesPlugin`) и его потребитель — перетаскивание
 * (`TDragPlugin`). Движок приходит к ним без типа, и состав и базовые
 * операции коллекции они находят охранниками (`batchOf`, `plainOf`), а не
 * чтением `engine.extensions` наугад (docs/agents/collections.md, «Сосед по
 * коллекции — по контракту»): узлы идут порядком состава, а перетаскивание
 * переставляет элементы в движке.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TListBox, TListBoxCollectionFacade } from '@soldy-ui/core'
import type { IListBoxItem } from '@soldy-ui/core'
import {
	TCollectionBundlesPlugin,
	TCollectionElements,
	TDragPlugin,
	TElementPlugin,
	TPluginBundle,
} from '../src'
import type { IPlugin, IPluginConstructor } from '../src'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/** Плагин, который тест поставил сам: без него дальше проверять нечего. */
function pluginOf<P extends IPlugin<any, any>>(
	bundle: TPluginBundle,
	ctor: IPluginConstructor<any, any, P>,
): P {
	const plugin = bundle.get(ctor)

	if (!plugin) throw new Error(`${ctor.name} не установлен в bundle`)

	return plugin
}

const bundles: TPluginBundle[] = []

afterEach(() => {
	for (const bundle of bundles.splice(0)) bundle.destroy()

	document.body.innerHTML = ''
})

/**
 * Список из трёх элементов. Узлы смонтированы в обратном порядке — порядок
 * реестра от порядка регистрации не зависит, он берётся из состава.
 */
function setup() {
	const owner = new TListBox()
	const facade = new TListBoxCollectionFacade(
		{ items: ['a', 'b', 'c'].map((value) => ({ value, text: value })) },
		{ owner },
	)
	const engine = facade.engine
	const items = engine.extensions.batch.items
	const root = document.body.appendChild(document.createElement('div'))
	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TCollectionBundlesPlugin)
		.use(TCollectionElements)
		.use(TDragPlugin)

	bundles.push(bundle)

	const registry = pluginOf(bundle, TCollectionBundlesPlugin)
	const nodes = new Map<IListBoxItem, Element>()

	registry.bindEngine(engine)

	for (const item of [...items].reverse()) {
		const itemBundle = new TPluginBundle(item).use(TElementPlugin)
		const node = root.appendChild(document.createElement('div'))

		bundles.push(itemBundle)
		registry.register(itemBundle, item)
		pluginOf(itemBundle, TElementPlugin).element = node
		nodes.set(item, node)
	}

	pluginOf(bundle, TElementPlugin).element = root

	const nodeOf = (item: IListBoxItem): Element => {
		const node = nodes.get(item)

		if (!node) throw new Error(`узел элемента ${item.value} не смонтирован`)

		return node
	}

	return {
		engine,
		items,
		nodeOf,
		elements: pluginOf(bundle, TCollectionElements),
		drag: pluginOf(bundle, TDragPlugin),
	}
}

describe('TCollectionElements — узлы по составу коллекции', () => {
	it('все узлы — порядком состава, а не регистрации', () => {
		const { items, nodeOf, elements } = setup()

		expect(elements.getAll()).toEqual(items.map(nodeOf))
	})

	it('узел по месту в составе и uid по узлу', () => {
		const { items, nodeOf, elements } = setup()

		expect(elements.getElementByIndex(1)).toBe(nodeOf(items[1]))
		expect(elements.getUidByElement(nodeOf(items[2]))).toBe(items[2].uid)
		expect(elements.getUidByElement(document.createElement('div'))).toBeUndefined()
	})
})

describe('TDragPlugin — перестановка базовыми операциями коллекции', () => {
	it('элемент, перетащенный на место третьего, переезжает в составе', async () => {
		const { engine, items, nodeOf, drag } = setup()
		const starts: { index: number; uid: number }[] = []

		drag.events.on('drag:start', (payload) => starts.push(payload))
		drag.activate(engine)
		// Обработчики встают на корень, когда он объявлен, — кадром позже
		await nextFrame()

		nodeOf(items[0]).dispatchEvent(new Event('dragstart', { bubbles: true }))
		nodeOf(items[2]).dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }))

		expect(starts).toEqual([{ index: 0, uid: items[0].uid }])
		expect(engine.extensions.batch.items.map((item) => item.value)).toEqual(['b', 'c', 'a'])
	})
})
