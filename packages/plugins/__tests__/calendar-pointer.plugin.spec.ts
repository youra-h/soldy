// @vitest-environment jsdom

/**
 * TCalendarPointerPlugin — нажатия по дням и кнопкам листания и наведение для
 * предпросмотра диапазона.
 *
 * Плагины собраны настоящими bundle, как в рантайме, но без адаптера: разметку
 * тест строит сам в том виде, в каком её рисует Vue, — корень, кнопки листания
 * со значком внутри, заголовок, по ячейке на день коллекции с плиткой внутри и
 * заполнитель соседнего месяца. Дат плагин не считает — проверяется, какие
 * команды расширений он зовёт.
 *
 * Сегодня во всех тестах — суббота 2026-09-26, как в тестах ядра; сетка — на
 * сентябре.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { TCalendar, createEngineCalendar } from '@soldy-ui/core'
import type { ICalendarProps, TCalendarMode } from '@soldy-ui/core'
import {
	TCalendarPointerPlugin,
	TCollectionBundlesPlugin,
	TCollectionElements,
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

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] })
	vi.setSystemTime(new Date(2026, 8, 26, 12))
})

afterEach(() => {
	vi.useRealTimers()
	document.body.innerHTML = ''
})

async function mountCalendar(props: Partial<ICalendarProps> = {}, mode?: TCalendarMode) {
	const owner = new TCalendar({ months: ['2026-09-01'], ...props })
	const engine = createEngineCalendar({ owner })

	if (mode) engine.extensions.selection.mode = mode

	const root = document.createElement('div')
	const prev = document.createElement('button')
	const next = document.createElement('button')
	const title = document.createElement('div')
	const filler = document.createElement('div')

	prev.className = 's-calendar__prev'
	next.className = 's-calendar__next'
	prev.innerHTML = '<svg class="s-test-icon"></svg>'
	next.innerHTML = '<svg class="s-test-icon"></svg>'
	title.textContent = 'September 2026'
	filler.className = 's-calendar__filler'
	root.append(prev, next, title, filler)
	document.body.appendChild(root)

	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TCollectionBundlesPlugin)
		.use(TCollectionElements)
		.use(TCalendarPointerPlugin)

	const bundles = pluginOf(bundle, TCollectionBundlesPlugin)

	bundles.bindEngine(engine)
	// Набор принят, как его принимает setup
	bundle.attach()

	// Ячейка дня с плиткой внутри — как её рисует разметка
	for (const item of engine.extensions.batch.items) {
		const cell = document.createElement('div')
		const tile = document.createElement('div')

		cell.dataset.date = item.date
		tile.className = 's-test-tile'
		tile.textContent = item.text
		cell.appendChild(tile)
		root.appendChild(cell)

		const itemBundle = new TPluginBundle(item).use(TElementPlugin)

		bundles.register(itemBundle, item)
		pluginOf(itemBundle, TElementPlugin).element = cell
	}

	pluginOf(bundle, TElementPlugin).element = root
	await nextFrame()

	/** Плитка дня по дате — самый глубокий узел ячейки, куда и попадает указатель. */
	const tileOf = (date: string): HTMLElement => {
		const node = root.querySelector(`[data-date="${date}"] .s-test-tile`)

		if (!(node instanceof HTMLElement)) throw new Error(`дня ${date} нет`)

		return node
	}

	const pointer = (target: Element, type: string, pointerType = 'mouse'): void => {
		target.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType }))
	}

	return {
		owner,
		bundle,
		root,
		prev,
		next,
		title,
		filler,
		tileOf,
		pointer,
		selection: engine.extensions.selection,
		view: engine.extensions.view,
	}
}

describe('нажатие', () => {
	it('по дню — выбор: куда бы ни пришлось в ячейке', async () => {
		const setup = await mountCalendar()

		setup.tileOf('2026-09-10').click()

		expect(setup.owner.value).toBe('2026-09-10')
	})

	it('по заполнителю и заголовку не происходит ничего', async () => {
		const setup = await mountCalendar()
		const choose = vi.spyOn(setup.selection, 'chooseDate')

		setup.filler.click()
		setup.title.click()

		expect(choose).not.toHaveBeenCalled()
		expect(setup.owner.value).toBeUndefined()
	})

	it('по недоступному дню выбор отклоняет коллекция', async () => {
		const setup = await mountCalendar({ unavailable: (date) => date === '2026-09-10' })
		const choose = vi.spyOn(setup.selection, 'chooseDate')

		setup.tileOf('2026-09-10').click()

		expect(choose).toHaveBeenCalledWith('2026-09-10')
		expect(setup.owner.value).toBeUndefined()
	})

	it('по кнопкам — листание, и со значка внутри кнопки тоже', async () => {
		const setup = await mountCalendar()

		setup.next
			.querySelector('.s-test-icon')
			?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		expect(setup.view.months).toEqual(['2026-10-01'])

		setup.prev.click()
		expect(setup.view.months).toEqual(['2026-09-01'])
	})

	it('кнопка у границы не листает: вид отказывает сам', async () => {
		const setup = await mountCalendar({ min: '2026-09-01' })

		setup.prev.click()

		expect(setup.view.months).toEqual(['2026-09-01'])
	})

	it('диапазон: два нажатия — пара дат', async () => {
		const setup = await mountCalendar({}, 'range')

		setup.tileOf('2026-09-14').click()
		setup.tileOf('2026-09-10').click()

		expect(setup.owner.value).toEqual(['2026-09-10', '2026-09-14'])
	})
})

describe('наведение', () => {
	it('указатель на дне — день под указателем, предпросмотр до него', async () => {
		const setup = await mountCalendar({}, 'range')

		setup.tileOf('2026-09-10').click()
		setup.pointer(setup.tileOf('2026-09-13'), 'pointerover')

		expect(setup.selection.hovered).toBe('2026-09-13')
		expect(setup.selection.isSelected('2026-09-12')).toBe(true)
	})

	it('указатель на не-дне и уход с корня снимают день под указателем', async () => {
		const setup = await mountCalendar()

		setup.pointer(setup.tileOf('2026-09-13'), 'pointerover')
		setup.pointer(setup.filler, 'pointerover')
		expect(setup.selection.hovered).toBeUndefined()

		setup.pointer(setup.tileOf('2026-09-13'), 'pointerover')
		setup.root.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
		expect(setup.selection.hovered).toBeUndefined()
	})

	it('касание не наводит: палец над днём — это уже нажатие', async () => {
		const setup = await mountCalendar()

		setup.pointer(setup.tileOf('2026-09-13'), 'pointerover', 'touch')

		expect(setup.selection.hovered).toBeUndefined()
	})

	it('перо наводит, как мышь', async () => {
		const setup = await mountCalendar()

		setup.pointer(setup.tileOf('2026-09-13'), 'pointerover', 'pen')

		expect(setup.selection.hovered).toBe('2026-09-13')
	})
})

describe('жизненный цикл', () => {
	it('после destroy() нажатия и наведение не доходят до коллекции', async () => {
		const setup = await mountCalendar()

		setup.bundle.destroy()
		setup.tileOf('2026-09-10').click()
		setup.pointer(setup.tileOf('2026-09-13'), 'pointerover')

		expect(setup.owner.value).toBeUndefined()
		expect(setup.selection.hovered).toBeUndefined()
	})
})
