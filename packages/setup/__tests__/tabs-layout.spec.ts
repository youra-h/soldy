// @vitest-environment jsdom

/**
 * `TTabsLayoutPlugin` — наблюдатели размеров списка табов.
 *
 * Плагин следит за корнем и за каждым табом и шлёт `change:layout`, по
 * которому индикатор активного таба пересчитывает позицию. Лишний наблюдатель
 * не виден глазами: он просто шлёт `change:layout` ещё раз, поэтому
 * проверяется число наблюдателей за узлом.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPluginContext, installResizeObserverStub, observerCount } from './helpers'
import { TElementPlugin, TTabsLayoutPlugin } from '@soldy/plugins'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

beforeEach(installResizeObserverStub)

afterEach(() => {
	document.body.innerHTML = ''
})

async function setup() {
	const root = document.createElement('div')

	document.body.appendChild(root)

	const rootElement = new TElementPlugin()

	new TTabsLayoutPlugin().install(createPluginContext({}, [rootElement]))

	rootElement.element = root
	await nextFrame()

	return { root, rootElement }
}

describe('наблюдатель корня', () => {
	it('ready заводит наблюдатель за корнем, removed его отключает', async () => {
		const { root, rootElement } = await setup()

		expect(observerCount(root)).toBe(1)

		rootElement.element = null

		expect(observerCount(root)).toBe(0)
	})

	/**
	 * Повторный `ready` без `removed` между объявлениями даёт гонка
	 * `TElementPlugin`: узел дважды ушёл и вернулся до кадра, и оба отложенных
	 * объявления прошли проверку.
	 */
	it('повторный ready не оставляет за корнем второго наблюдателя', async () => {
		const { root, rootElement } = await setup()
		const ready = vi.fn()

		rootElement.events.on('ready', ready)

		rootElement.element = null
		rootElement.element = root
		rootElement.element = null
		rootElement.element = root
		await nextFrame()

		// Без двух ready тест проверял бы одно объявление, а не повторное
		expect(ready).toHaveBeenCalledTimes(2)
		expect(observerCount(root)).toBe(1)
	})
})
