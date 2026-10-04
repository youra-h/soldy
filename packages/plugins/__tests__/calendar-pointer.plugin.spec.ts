// @vitest-environment jsdom

/**
 * TCalendarPointerPlugin — нажатия по дням, кнопкам листания и панели выбора
 * месяца и года и наведение для предпросмотра диапазона.
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
		picker: engine.extensions.picker,
	}
}

/**
 * Панель выбора месяца и года места 0 — поповер внутри календаря
 * (`contained`), поэтому в корне. Панель поповера — подложка: в ней полоса
 * жеста и содержимое, в содержимом — карточка со списком и шапкой, в шапке —
 * стрелки и кнопка года. Своей панель делает `id` шапки из наборов места.
 */
function pickerPanel(root: Element, heading: string) {
	const backdrop = document.createElement('div')
	const handle = document.createElement('div')
	const content = document.createElement('div')
	const card = document.createElement('div')
	const list = document.createElement('div')
	const header = document.createElement('div')
	const prev = document.createElement('button')
	const title = document.createElement('button')
	const next = document.createElement('button')

	backdrop.className = 's-popover__panel'
	handle.className = 's-popover__handle'
	content.className = 's-popover__content'
	card.className = 's-calendar__picker'
	list.className = 's-calendar__picker-list'
	header.className = 's-calendar__picker-header'
	prev.className = 's-calendar__picker-prev'
	prev.innerHTML = '<svg class="s-test-icon"></svg>'
	title.className = 's-calendar__picker-heading'
	title.id = heading
	next.className = 's-calendar__picker-next'
	header.append(prev, title, next)
	card.append(list, header)
	content.appendChild(card)
	backdrop.append(handle, content)
	root.appendChild(backdrop)

	return { backdrop, handle, card, list, prev, title, next }
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

describe('панель выбора месяца и года', () => {
	async function mountPicker(heading = 'h0') {
		const setup = await mountCalendar()

		setup.picker.pickerSets(0).heading.add('id', 'h0')
		setup.picker.pickers[0].popover.open = true

		return { ...setup, ...pickerPanel(setup.root, heading) }
	}

	const level = (setup: Awaited<ReturnType<typeof mountPicker>>) => setup.picker.pickers[0].level

	const heading = (setup: Awaited<ReturnType<typeof mountPicker>>) =>
		setup.picker.pickers[0].heading

	it('кнопка года меняет уровень: месяцы ⇄ годы', async () => {
		const setup = await mountPicker()

		setup.title.click()

		expect(level(setup)).toBe('years')

		setup.title.click()

		expect(level(setup)).toBe('months')
	})

	it('стрелки листают год — и со значка внутри стрелки тоже; листание сетки не трогают', async () => {
		const setup = await mountPicker()

		setup.next.click()

		expect(heading(setup)).toBe('2027')

		setup.prev
			.querySelector('.s-test-icon')
			?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

		expect(heading(setup)).toBe('2026')
		expect(setup.view.months).toEqual(['2026-09-01'])
	})

	it('чужая панель — без шапки места — не трогается', async () => {
		const setup = await mountPicker('foreign')

		setup.next.click()

		expect(heading(setup)).toBe('2026')
	})

	/**
	 * Подложка — сама панель поповера вокруг содержимого. Нажатие браузер
	 * отдаёт тремя событиями, и цели у них свои: `pointerdown` — узлу под
	 * нажатием, `pointerup` — узлу под отпусканием, `click` — их общему предку.
	 */
	describe('подложка', () => {
		/** Нажатие мышью: каждому событию — своя цель, как у браузера. */
		const press = (down: Element, up: Element, click: Element): MouseEvent => {
			const event = new MouseEvent('click', { bubbles: true, cancelable: true })

			down.dispatchEvent(
				new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }),
			)
			up.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'mouse' }))
			click.dispatchEvent(event)

			return event
		}

		const isOpen = (setup: Awaited<ReturnType<typeof mountPicker>>) =>
			setup.picker.pickers[0].popover.open

		it('нажатие по подложке закрывает панель места', async () => {
			const setup = await mountPicker()

			press(setup.backdrop, setup.backdrop, setup.backdrop)

			expect(isOpen(setup)).toBe(false)
		})

		it('нажатие по карточке, списку, полосе и стрелке шапки панель не закрывает', async () => {
			const setup = await mountPicker()

			for (const node of [setup.card, setup.list, setup.handle, setup.next]) {
				press(node, node, node)
			}

			expect(isOpen(setup)).toBe(true)
		})

		it('протяжка из карточки, отпущенная на подложке, — не нажатие по подложке', async () => {
			const setup = await mountPicker()

			press(setup.card, setup.backdrop, setup.backdrop)

			expect(isOpen(setup)).toBe(true)
		})

		it('нажатие на подложке, отпущенное на карточке, — тоже нет', async () => {
			const setup = await mountPicker()

			press(setup.backdrop, setup.card, setup.backdrop)

			expect(isOpen(setup)).toBe(true)
		})

		it('погашенный click — нет: так кончается жест, а он решает сам', async () => {
			const setup = await mountPicker()

			setup.backdrop.addEventListener('click', (event) => event.preventDefault())

			expect(press(setup.backdrop, setup.backdrop, setup.backdrop).defaultPrevented).toBe(
				true,
			)
			expect(isOpen(setup)).toBe(true)
		})

		it('чужая панель — без шапки места — по нажатию не закрывается', async () => {
			const setup = await mountPicker('foreign')

			press(setup.backdrop, setup.backdrop, setup.backdrop)

			expect(isOpen(setup)).toBe(true)
		})
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
