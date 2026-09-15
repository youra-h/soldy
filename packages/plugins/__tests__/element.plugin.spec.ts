// @vitest-environment jsdom

/**
 * `TElementPlugin` — контракт событий `ready`/`removed`.
 *
 * На них держатся все плагины, которым нужен DOM: на `ready` они вешают
 * слушателей и наблюдателей, на `removed` снимают. Поэтому проверяется вся
 * последовательность событий, а не отдельные вызовы: лишний `ready` заводит
 * всё второй раз, а пропущенная пара `removed` + `ready` оставляет подписчиков
 * на старом узле.
 */

import { describe, it, expect } from 'vitest'
import { TElementPlugin } from '../src'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

type TEntry = ['ready', HTMLElement] | ['removed']

/** Плагин и журнал его событий в порядке прихода. */
function track() {
	const plugin = new TElementPlugin()
	const log: TEntry[] = []

	plugin.events.on('ready', (element) => log.push(['ready', element]))
	plugin.events.on('removed', () => log.push(['removed']))

	return { plugin, log }
}

/** Плагин, уже объявивший узел: кадр пройден, журнал пуст. */
async function announced(element: HTMLElement) {
	const tracked = track()

	tracked.plugin.element = element
	await nextFrame()
	tracked.log.length = 0

	return tracked
}

const node = () => document.createElement('div')

describe('узел до кадра', () => {
	it('null → A: до кадра ничего, после кадра одно ready(A)', async () => {
		const { plugin, log } = track()
		const a = node()

		plugin.element = a

		expect(log).toEqual([])

		await nextFrame()

		expect(log).toEqual([['ready', a]])
	})

	it('A → null → A до кадра: одно ready(A), removed нет', async () => {
		const { plugin, log } = track()
		const a = node()

		plugin.element = a
		plugin.element = null
		plugin.element = a
		await nextFrame()

		expect(log).toEqual([['ready', a]])
	})

	it('A → B до кадра: одно ready(B)', async () => {
		const { plugin, log } = track()
		const a = node()
		const b = node()

		plugin.element = a
		plugin.element = b
		await nextFrame()

		expect(log).toEqual([['ready', b]])
	})

	it('A → null до кадра: ни ready, ни removed', async () => {
		const { plugin, log } = track()

		plugin.element = node()
		plugin.element = null
		await nextFrame()

		expect(log).toEqual([])
	})
})

describe('объявленный узел', () => {
	it('A → B: removed сразу, через кадр одно ready(B)', async () => {
		const a = node()
		const b = node()
		const { plugin, log } = await announced(a)

		plugin.element = b

		expect(log).toEqual([['removed']])

		await nextFrame()

		expect(log).toEqual([['removed'], ['ready', b]])
	})

	it('A → null → A до кадра: removed, затем одно ready(A)', async () => {
		const a = node()
		const { plugin, log } = await announced(a)

		plugin.element = null
		plugin.element = a
		await nextFrame()

		expect(log).toEqual([['removed'], ['ready', a]])
	})

	it('события строго чередуются, первым идёт ready', async () => {
		const a = node()
		const b = node()
		const { plugin, log } = track()

		plugin.element = a
		await nextFrame()
		plugin.element = b
		await nextFrame()
		plugin.element = null

		expect(log).toEqual([['ready', a], ['removed'], ['ready', b], ['removed']])
	})
})

describe('ready() и destroy()', () => {
	it('ready(), вызванный до привязки, резолвится узлом в кадре объявления', async () => {
		const { plugin } = track()
		const a = node()
		let resolved: HTMLElement | null = null

		void plugin.ready().then((element) => {
			resolved = element
		})

		plugin.element = a
		await Promise.resolve()

		expect(resolved).toBeNull()

		await nextFrame()

		expect(resolved).toBe(a)
	})

	it('destroy() до кадра: ready не приходит', async () => {
		const { plugin, log } = track()

		plugin.element = node()
		plugin.destroy()
		await nextFrame()

		expect(log).toEqual([])
	})
})
