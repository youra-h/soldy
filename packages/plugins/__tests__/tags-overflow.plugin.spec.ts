// @vitest-environment jsdom

/**
 * Счёт помещающихся тегов — чистая функция плагина переполнения.
 *
 * Плагин рядом только читает узлы (ширина ряда, ширина каждого тега, ширина
 * кнопки «…») и отдаёт результат коллекции, поэтому проверяется здесь именно
 * счёт: правила, из-за которых замер сходится с первого прохода и не заводит
 * кнопку «…» там, где она не нужна.
 *
 * Второе, что проверяется здесь, — за какой режим плагин вообще берётся.
 * Делить состав есть смысл только в `popover`: в `wrap`, `scroll` и `arrows`
 * ряд справляется средствами темы, и замер там обязан молчать. Раскладки в
 * jsdom нет, но и не надо: важно, зовёт ли плагин коллекцию вовсе.
 */

import { describe, it, expect, afterAll, afterEach, beforeAll, vi } from 'vitest'
import { TTags, TTagsItem, createEngineTags } from '@soldy/core'
import type { TTagsOverflow } from '@soldy/core'
import {
	countFitting,
	TCollectionBundlesPlugin,
	TCollectionElements,
	TElementPlugin,
	TPluginBundle,
	TTagsOverflowPlugin,
} from '../src'

/** Три тега по 100 в ряду с зазором 10: вместе — 320. */
const WIDTHS = [100, 100, 100]
const GAP = 10
const MORE = 30

describe('кнопка «…» без гистерезиса', () => {
	it('помещаются все — кнопки нет, место под неё не резервируется', () => {
		expect(countFitting({ available: 320, widths: WIDTHS, gap: GAP, more: MORE })).toBe(3)
	})

	it('не хватило хоть чего-то — место под кнопку зарезервировано', () => {
		// 215 хватает на два тега с зазором (210), но не вместе с кнопкой
		expect(countFitting({ available: 215, widths: WIDTHS, gap: GAP, more: MORE })).toBe(1)
	})

	it('кнопки ещё не было в разметке — считаем без резерва, следующий проход учтёт', () => {
		expect(countFitting({ available: 215, widths: WIDTHS, gap: GAP, more: undefined })).toBe(2)
	})

	it('не помещается ни один — ряд пуст, всё в панели', () => {
		expect(countFitting({ available: 60, widths: WIDTHS, gap: GAP, more: MORE })).toBe(0)
	})
})

describe('неизмеренный тег остаётся в ряду', () => {
	it('в закрытой панели его не измерить, поэтому он держится за ряд', () => {
		const widths = [100, undefined, 100]

		expect(countFitting({ available: 150, widths, gap: GAP, more: MORE })).toBe(2)
	})

	it('неизмеренный не мешает остальным уехать в панель', () => {
		const widths = [100, 100, undefined]

		expect(countFitting({ available: 150, widths, gap: GAP, more: MORE })).toBe(1)
	})
})

describe('нулевой бокс и пустой ряд', () => {
	it('ряд ещё не разложен — делить нечего, все теги в нём', () => {
		expect(countFitting({ available: 0, widths: WIDTHS, gap: GAP, more: MORE })).toBe(3)
	})

	it('тегов нет — нечего и считать', () => {
		expect(countFitting({ available: 100, widths: [], gap: GAP, more: MORE })).toBe(0)
	})

	it('скрытый тег места не занимает: соседом он не считается', () => {
		// Нулевой первый тег не добавляет ни ширины, ни зазора, и второму
		// достаётся вся ширина ряда
		expect(countFitting({ available: 100, widths: [0, 100], gap: GAP, more: undefined })).toBe(
			2,
		)
	})
})

describe('зазор считается между соседями', () => {
	it('один тег идёт без зазора', () => {
		expect(
			countFitting({ available: 100, widths: [100, 100], gap: GAP, more: undefined }),
		).toBe(1)
	})

	it('второму тегу нужен ещё и зазор', () => {
		expect(
			countFitting({ available: 209, widths: [100, 100], gap: GAP, more: undefined }),
		).toBe(1)
		expect(
			countFitting({ available: 210, widths: [100, 100], gap: GAP, more: undefined }),
		).toBe(2)
	})
})

/**
 * За какой режим плагин берётся: слушает он только `popover`.
 *
 * Разметка здесь минимальная — корень и по узлу на тег, как её рисует Vue:
 * ширин в jsdom всё равно нет. Проверяется не число, а сам факт вызова
 * коллекции: в `arrows` ряд листает лента, делить состав некому, и замер
 * обязан промолчать.
 */
describe('замер идёт только в popover', () => {
	const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

	/**
	 * `ResizeObserver` в jsdom не реализован, а плагин заводит его, как только
	 * берётся за ряд. Заглушка молчит: поводы пересчитать тест даёт сам,
	 * привязывая узлы.
	 */
	beforeAll(() => {
		vi.stubGlobal(
			'ResizeObserver',
			class {
				observe(): void {}
				unobserve(): void {}
				disconnect(): void {}
			},
		)
	})

	afterAll(() => {
		vi.unstubAllGlobals()
	})

	afterEach(() => {
		document.body.innerHTML = ''
	})

	async function measure(overflow: TTagsOverflow) {
		const owner = new TTags({ overflow })
		const engine = createEngineTags({ owner })
		const items = ['Москва', 'Тверь'].map((text) =>
			engine.extensions.plain.push(new TTagsItem({ value: text, text })),
		)

		const root = document.createElement('div')

		document.body.appendChild(root)

		const bundle = new TPluginBundle(owner)
			.use(TElementPlugin)
			.use(TCollectionBundlesPlugin)
			.use(TCollectionElements)
			.use(TTagsOverflowPlugin)

		const bundles = bundle.get(TCollectionBundlesPlugin)

		if (!bundles) throw new Error('реестра bundles нет')

		for (const item of items) {
			const node = document.createElement('div')

			root.appendChild(node)

			const itemBundle = new TPluginBundle(item).use(TElementPlugin)
			const element = itemBundle.get(TElementPlugin)

			if (!element) throw new Error('узла тега нет')

			element.element = node
			bundles.register(itemBundle, item)
		}

		bundles.bindEngine(engine)

		const notify = vi.spyOn(engine.extensions.overflow, 'notifyFit')
		const element = bundle.get(TElementPlugin)

		if (!element) throw new Error('узла корня нет')

		element.element = root

		await nextFrame()
		await nextFrame()

		return notify
	}

	it.each(['wrap', 'scroll', 'arrows'] as const)('%s: коллекцию не трогает', async (overflow) => {
		expect(await measure(overflow)).not.toHaveBeenCalled()
	})

	it('popover: замер доезжает до коллекции', async () => {
		expect(await measure('popover')).toHaveBeenCalled()
	})
})
