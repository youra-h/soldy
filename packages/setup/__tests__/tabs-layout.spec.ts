// @vitest-environment jsdom

/**
 * `TTabsLayoutPlugin` — наблюдатели размеров набора табов.
 *
 * Плагин следит за корнем, за своим списком табов и за каждым табом и шлёт
 * `change:layout`, по которому индикатор активного таба пересчитывает позицию.
 * Список — ребёнок своего ряда: при выравнивании `center` и `end` слот ряда
 * меняет ширину, табы сдвигаются, а размеры табов и корня остаются прежними.
 * Лишний наблюдатель не виден глазами: он просто шлёт `change:layout` ещё
 * раз, поэтому проверяется число наблюдателей за узлом.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TTabs } from '@soldy-ui/core'
import { createPluginContext, installResizeObserverStub, observerCount } from './helpers'
import { TElementPlugin, TTabsLayoutPlugin } from '@soldy-ui/plugins'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

beforeEach(installResizeObserverStub)

afterEach(() => {
	document.body.innerHTML = ''
})

/** Узел с классом. */
function node(className: string): HTMLElement {
	const element = document.createElement('div')

	element.className = className

	return element
}

/**
 * Корень набора в разметке адаптеров: ряд со слотом `leading`, списком и
 * слотом `trailing`. В слоте `leading` — вложенный набор со своим рядом и
 * списком: он стоит раньше своего списка, и поиск по потомкам нашёл бы его.
 */
function markup() {
	const root = node('so-tabs')
	const bar = node('so-tabs__bar')
	const leading = node('so-tabs__leading')
	const list = node('so-tabs__list')
	const trailing = node('so-tabs__trailing')
	const nested = node('so-tabs')
	const nestedBar = node('so-tabs__bar')
	const nestedList = node('so-tabs__list')

	nestedBar.append(nestedList)
	nested.append(nestedBar)
	leading.append(nested)
	bar.append(leading, list, trailing)
	root.append(bar)
	document.body.appendChild(root)

	return { root, list, nestedList }
}

async function setup() {
	const nodes = markup()
	const rootElement = new TElementPlugin()

	new TTabsLayoutPlugin().install(createPluginContext(new TTabs(), [rootElement]))

	rootElement.element = nodes.root
	await nextFrame()

	return { ...nodes, rootElement }
}

describe('наблюдатель корня', () => {
	it('ready заводит наблюдатель за корнем, removed его отключает', async () => {
		const { root, rootElement } = await setup()

		expect(observerCount(root)).toBe(1)

		rootElement.element = null

		expect(observerCount(root)).toBe(0)
	})

	/**
	 * Повтор присылается прямым эмитом в обход сеттера: тест проверяет сам
	 * плагин, а не то, умеет ли `TElementPlugin` такой повтор произвести.
	 */
	it('повторный ready без removed не оставляет за корнем второго наблюдателя', async () => {
		const { root, rootElement } = await setup()

		rootElement.events.emit('ready', root)

		expect(observerCount(root)).toBe(1)
	})
})

describe('наблюдатель списка', () => {
	it('ready заводит наблюдатель за своим списком, removed его отключает', async () => {
		const { list, nestedList, rootElement } = await setup()

		expect(observerCount(list)).toBe(1)
		expect(observerCount(nestedList), 'список вложенного набора').toBe(0)

		rootElement.element = null

		expect(observerCount(list)).toBe(0)
	})

	it('повторный ready без removed не оставляет за списком второго наблюдателя', async () => {
		const { root, list, rootElement } = await setup()

		rootElement.events.emit('ready', root)

		expect(observerCount(list)).toBe(1)
	})
})
