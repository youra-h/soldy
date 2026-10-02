// @vitest-environment jsdom

/**
 * TCalendarKeyboardPlugin — клавиши сетки календаря по APG (Date Picker Dialog)
 * и DOM-фокус, который идёт за фокусом коллекции.
 *
 * Плагины собраны настоящими bundle, как в рантайме, но без адаптера: разметку
 * тест рисует сам, как фреймворк, — корень, две кнопки листания и по узлу на
 * день коллекции, с его набором `aria` (в нём `tabindex` остановки). Рисует он
 * по вызову `render()`, то есть позже, чем сменилась модель: так видно, что
 * фокус ждёт узел нового дня, а не находит его сразу. Порядок сборки дня — как
 * у фреймворка: регистрация, потом узел, `ready` — кадром позже.
 *
 * Сегодня во всех тестах — суббота 2026-09-26, как в тестах ядра; сетка — на
 * сентябре, фокус — на 16-м, неделя — с воскресенья.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { TCalendar, createEngineCalendar } from '@soldy-ui/core'
import type { ICalendarItem, ICalendarProps, TCalendarMode } from '@soldy-ui/core'
import {
	TCalendarKeyboardPlugin,
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

	engine.extensions.focus.focusDate('2026-09-16')

	const root = document.createElement('div')
	const prev = document.createElement('button')
	const next = document.createElement('button')
	const cells = document.createElement('div')

	prev.className = 's-calendar__prev'
	next.className = 's-calendar__next'
	root.append(prev, next, cells)
	document.body.appendChild(root)

	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TCollectionBundlesPlugin)
		.use(TCollectionElements)
		.use(TCalendarKeyboardPlugin)

	const bundles = pluginOf(bundle, TCollectionBundlesPlugin)
	const nodes = new Map<ICalendarItem, HTMLElement>()

	/**
	 * Разметка по коллекции, как её рисует фреймворк: узел дня, оставшегося на
	 * экране, — тот же; новому дню — новый, ушедшему — долой. Атрибуты — набор
	 * `aria` дня, как `v-bind`.
	 */
	const render = (): void => {
		const items = engine.extensions.batch.items

		for (const [item, node] of nodes) {
			if (items.includes(item)) continue

			node.remove()
			nodes.delete(item)
		}

		for (const item of items) {
			let node = nodes.get(item)

			if (!node) {
				node = document.createElement('div')
				node.dataset.date = item.date
				cells.appendChild(node)
				nodes.set(item, node)

				const itemBundle = new TPluginBundle(item).use(TElementPlugin)

				bundles.register(itemBundle, item)
				pluginOf(itemBundle, TElementPlugin).element = node
			}

			for (const name of node.getAttributeNames()) {
				if (name !== 'data-date') node.removeAttribute(name)
			}

			for (const [name, value] of Object.entries(item.aria.valueOf())) {
				if (value !== null && value !== undefined) node.setAttribute(name, String(value))
			}
		}
	}

	bundles.bindEngine(engine)
	bundle.attach()
	render()
	pluginOf(bundle, TElementPlugin).element = root
	await nextFrame()

	/** Узел дня по дате; нет его — тест падает здесь. */
	const cellOf = (date: string): HTMLElement => {
		const node = cells.querySelector(`[data-date="${date}"]`)

		if (!(node instanceof HTMLElement)) throw new Error(`узла ${date} нет`)

		return node
	}

	/** Нажатие с узла, как у пользователя: событие всплывает до корня. */
	const press = (from: Element, key: string, init: KeyboardEventInit = {}): KeyboardEvent => {
		const event = new KeyboardEvent('keydown', {
			key,
			bubbles: true,
			cancelable: true,
			...init,
		})

		from.dispatchEvent(event)

		return event
	}

	/** Нажатие с дня, на котором фокус. */
	const pressOn = (date: string, key: string, init?: KeyboardEventInit): KeyboardEvent => {
		const from = cellOf(date)

		from.focus()

		return press(from, key, init)
	}

	/** Перерисовка после смены модели и кадр: узлы новых дней объявляются кадром позже. */
	const settle = async (): Promise<void> => {
		render()
		await nextFrame()
	}

	/** Дата дня, на котором DOM-фокус. */
	const focused = () =>
		document.activeElement instanceof HTMLElement ? document.activeElement.dataset.date : null

	/** Кнопка снаружи календаря — туда уходит фокус пользователя. */
	const outside = (): HTMLButtonElement => {
		const button = document.createElement('button')

		document.body.appendChild(button)

		return button
	}

	return {
		owner,
		bundle,
		root,
		prev,
		next,
		cellOf,
		press,
		pressOn,
		render,
		settle,
		focused,
		outside,
		focus: engine.extensions.focus,
		selection: engine.extensions.selection,
		view: engine.extensions.view,
	}
}

describe('переходы фокуса', () => {
	it.each([
		['ArrowLeft', '2026-09-15'],
		['ArrowRight', '2026-09-17'],
		['ArrowUp', '2026-09-09'],
		['ArrowDown', '2026-09-23'],
		['Home', '2026-09-13'],
		['End', '2026-09-19'],
	])('%s ведёт с 16 сентября на %s, DOM-фокус — за ним', async (key, date) => {
		const setup = await mountCalendar()
		const event = setup.pressOn('2026-09-16', key)

		expect(event.defaultPrevented).toBe(true)
		expect(setup.focus.focusedDate).toBe(date)
		expect(setup.focused()).toBe(date)
	})

	it.each([
		['PageDown', {}, '2026-10-16'],
		['PageUp', {}, '2026-08-16'],
		['PageDown', { shiftKey: true }, '2027-09-16'],
		['PageUp', { shiftKey: true }, '2025-09-16'],
	])('%s %o — месяц, с Shift — год: %s', async (key, init, date) => {
		const setup = await mountCalendar()
		const event = setup.pressOn('2026-09-16', key, init)

		expect(event.defaultPrevented).toBe(true)
		expect(setup.focus.focusedDate).toBe(date)
	})

	it('RTL: ← ведёт к следующему дню, → — к предыдущему', async () => {
		const setup = await mountCalendar()

		setup.root.style.direction = 'rtl'

		setup.pressOn('2026-09-16', 'ArrowLeft')
		expect(setup.focused()).toBe('2026-09-17')

		setup.pressOn('2026-09-17', 'ArrowRight')
		expect(setup.focused()).toBe('2026-09-16')
	})

	it('с Alt, Ctrl и Meta клавиша чужая: фокус на месте, действие не гасится', async () => {
		const setup = await mountCalendar()

		for (const init of [{ altKey: true }, { ctrlKey: true }, { metaKey: true }]) {
			expect(setup.pressOn('2026-09-16', 'ArrowRight', init).defaultPrevented).toBe(false)
		}

		expect(setup.focus.focusedDate).toBe('2026-09-16')
	})

	it('клавиша из содержимого дня не трогается: у слота свои клавиши', async () => {
		const setup = await mountCalendar()
		const field = document.createElement('input')

		setup.cellOf('2026-09-16').appendChild(field)

		expect(setup.press(field, 'ArrowRight').defaultPrevented).toBe(false)
		expect(setup.focus.focusedDate).toBe('2026-09-16')
	})

	it('клавиша, которую уже погасили, не трогается', async () => {
		const setup = await mountCalendar()
		const cell = setup.cellOf('2026-09-16')

		cell.focus()
		cell.addEventListener('keydown', (event) => event.preventDefault())
		setup.press(cell, 'ArrowRight')

		expect(setup.focus.focusedDate).toBe('2026-09-16')
	})

	it('переход снимает день под указателем: предпросмотр идёт за клавишами', async () => {
		const setup = await mountCalendar({}, 'range')

		setup.selection.chooseDate('2026-09-16')
		setup.selection.notifyHover('2026-09-20')
		setup.pressOn('2026-09-16', 'ArrowRight')

		expect(setup.selection.hovered).toBeUndefined()
		expect(setup.selection.isSelected('2026-09-17')).toBe(true)
		expect(setup.selection.isSelected('2026-09-18')).toBe(false)
	})
})

describe('выбор', () => {
	it.each(['Enter', ' '])('«%s» выбирает день под фокусом и гасит действие', async (key) => {
		const setup = await mountCalendar()
		const event = setup.pressOn('2026-09-10', key)

		expect(event.defaultPrevented).toBe(true)
		expect(setup.owner.value).toBe('2026-09-10')
	})

	it('недоступный день клавиша не выбирает, но действие гасит', async () => {
		const setup = await mountCalendar({ unavailable: (date) => date === '2026-09-10' })
		const event = setup.pressOn('2026-09-10', 'Enter')

		expect(event.defaultPrevented).toBe(true)
		expect(setup.owner.value).toBeUndefined()
	})

	it('Escape с якорем отменяет начатый диапазон и гасится', async () => {
		const setup = await mountCalendar({}, 'range')

		setup.selection.chooseDate('2026-09-16')

		const event = setup.pressOn('2026-09-16', 'Escape')

		expect(event.defaultPrevented).toBe(true)
		expect(setup.selection.anchor).toBeUndefined()
	})

	it('Escape без якоря — не наш: его ждёт панель вокруг календаря', async () => {
		const setup = await mountCalendar({}, 'range')

		expect(setup.pressOn('2026-09-16', 'Escape').defaultPrevented).toBe(false)
	})
})

describe('фокус', () => {
	it('фокус, пришедший на день, — фокус коллекции: остановка Tab переходит к нему', async () => {
		const setup = await mountCalendar()

		setup.cellOf('2026-09-03').focus()
		setup.render()

		expect(setup.focus.focusedDate).toBe('2026-09-03')
		expect(setup.cellOf('2026-09-03').getAttribute('tabindex')).toBe('0')
		expect(setup.cellOf('2026-09-16').getAttribute('tabindex')).toBe('-1')
	})

	it('фокус коллекции сменили из кода, пока DOM-фокус на дне, — DOM идёт за ним', async () => {
		const setup = await mountCalendar()

		setup.cellOf('2026-09-16').focus()
		setup.focus.focusDate('2026-09-20')

		expect(setup.focused()).toBe('2026-09-20')
	})

	it('DOM-фокус не в календаре — фокус коллекции его не забирает', async () => {
		const setup = await mountCalendar()
		const outside = setup.outside()

		outside.focus()
		setup.focus.focusDate('2026-09-20')

		expect(document.activeElement).toBe(outside)
	})

	it('PageDown в новый месяц: фокус ждёт, пока появится узел нового дня', async () => {
		const setup = await mountCalendar()

		setup.pressOn('2026-09-16', 'PageDown')

		// Модель уже в октябре, разметка — ещё нет
		expect(setup.focus.focusedDate).toBe('2026-10-16')
		expect(setup.focused()).toBe('2026-09-16')

		await setup.settle()

		expect(setup.focused()).toBe('2026-10-16')
	})

	it('ожидание одно: фокус, сменившийся за время ожидания, его заменяет', async () => {
		const setup = await mountCalendar()

		setup.pressOn('2026-09-16', 'PageDown')
		setup.focus.shiftFocus('month', 1)

		expect(setup.focus.focusedDate).toBe('2026-11-16')

		await setup.settle()

		expect(setup.focused()).toBe('2026-11-16')
	})

	it('фокус ушёл из календаря, пока узел ждали, — ожидание снято', async () => {
		const setup = await mountCalendar()
		const outside = setup.outside()

		setup.pressOn('2026-09-16', 'PageDown')
		outside.focus()

		await setup.settle()

		expect(document.activeElement).toBe(outside)
	})

	it('после destroy() ожидание не срабатывает', async () => {
		const setup = await mountCalendar()

		setup.pressOn('2026-09-16', 'PageDown')
		setup.bundle.destroy()

		await setup.settle()

		expect(setup.focused()).toBeUndefined()
	})
})

describe('кнопки листания', () => {
	it('листание кнопкой оставляет фокус на ней', async () => {
		const setup = await mountCalendar()

		setup.next.focus()
		setup.view.showNext()
		await setup.settle()

		expect(document.activeElement).toBe(setup.next)
		expect(setup.focus.focusedDate).toBe('2026-10-16')
	})

	it('кнопка погасла у края под фокусом — фокус на остановку сетки', async () => {
		const setup = await mountCalendar({ max: '2026-10-31' })

		setup.next.focus()
		setup.view.showNext()

		expect(setup.view.nextDisabled).toBe(true)

		await setup.settle()

		expect(setup.focused()).toBe('2026-10-16')
	})

	it('у выключенного календаря остановки нет — фокус с кнопки не уходит', async () => {
		const setup = await mountCalendar()

		setup.next.focus()
		setup.owner.disabled = true

		await setup.settle()

		expect(document.activeElement).toBe(setup.next)
	})
})
