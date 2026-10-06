// @vitest-environment jsdom

/**
 * TTableColumnResizePlugin — ручка ширины колонки: указатель, клавиши, жест
 * скринридера и замер.
 *
 * Разметку тест строит сам — заголовок, обёртку содержимого с кнопкой и
 * полосу ручки с полем, как их рисует Vue, — а плагин собран настоящим
 * набором с настоящей `TTableColumn`. Коробку заголовка задаёт тест: jsdom
 * раскладку не считает. Захвата указателя в jsdom нет, поэтому события тест
 * шлёт прямо в узлы; `ResizeObserver` тоже нет — его заменяет заглушка, которую
 * тест срабатывает сам. Настоящий ввод и раскладка —
 * `playground/vue/browser/table.spec.ts`; какой станет ширина, —
 * `core/__tests__/table-columns.spec.ts`.
 */

import { describe, it, expect, afterEach, beforeAll, afterAll, vi } from 'vitest'
import { TTableColumn } from '@soldy-ui/core'
import type { ITableColumnProps } from '@soldy-ui/core'
import { TElementPlugin, TPluginBundle, TTableColumnResizePlugin } from '../src'
import type { IPlugin, IPluginConstructor, ITableColumnResizePluginOptions } from '../src'

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

/**
 * Заглушка `ResizeObserver`: помнит колбэк и наблюдаемые узлы, а срабатывает,
 * когда велит тест.
 */
class ResizeObserverStub {
	readonly observed = new Set<Element>()

	constructor(private readonly _callback: () => void) {
		observers.push(this)
	}

	observe(element: Element): void {
		this.observed.add(element)
	}

	unobserve(element: Element): void {
		this.observed.delete(element)
	}

	disconnect(): void {
		this.observed.clear()
	}

	trigger(element: Element): void {
		if (this.observed.has(element)) this._callback()
	}
}

let observers: ResizeObserverStub[] = []

beforeAll(() => {
	vi.stubGlobal('ResizeObserver', ResizeObserverStub)
})

afterAll(() => {
	vi.unstubAllGlobals()
})

const bundles: TPluginBundle[] = []

afterEach(() => {
	for (const bundle of bundles.splice(0)) bundle.destroy()

	observers = []
	document.body.innerHTML = ''
})

/** Ширина заголовка, которую «разложил» тест, px. */
const WIDTH = 160

/**
 * Заголовок колонки на странице: корень, обёртка содержимого с кнопкой
 * сортировки и полоса ручки с полем. Поле получает ход и ширину колонки — как
 * их раскладывает разметка.
 */
async function mount(
	props: Partial<ITableColumnProps> = {},
	dir: 'ltr' | 'rtl' = 'ltr',
	options: ITableColumnResizePluginOptions = {},
) {
	const column = new TTableColumn({ resizable: true, width: WIDTH, ...props })
	const bundle = new TPluginBundle(column)
		.use(TElementPlugin)
		.use(TTableColumnResizePlugin, options)

	bundles.push(bundle)

	const root = document.createElement('th')
	const content = document.createElement('span')
	const sort = document.createElement('button')
	const resizer = document.createElement('span')
	const field = document.createElement('input')

	root.dir = dir
	root.className = column.classes.base
	content.className = column.classes.resolve('__content')
	resizer.className = column.classes.resolve('__resizer')
	field.type = 'range'
	field.min = String(column.resizer.min)
	field.max = String(column.resizer.max)
	field.value = String(column.resizer.value)
	content.append(sort)
	resizer.append(field)
	root.append(content, resizer)
	document.body.append(root)

	vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 0, WIDTH, 40))

	pluginOf(bundle, TElementPlugin).element = root
	await nextFrame()

	const commit = vi.fn<(width: number) => void>()

	column.events.on('commit', commit)

	/** Указатель: событие с точкой, всплывает до корня. Отдаёт событие — по нему видно, погашено ли. */
	const pointer = (
		type: string,
		target: Element,
		x: number,
		init: PointerEventInit = {},
	): PointerEvent => {
		const event = new PointerEvent(type, {
			bubbles: true,
			cancelable: true,
			clientX: x,
			clientY: 20,
			pointerId: 1,
			button: 0,
			...init,
		})

		target.dispatchEvent(event)

		return event
	}

	/** Клавиша на узле, всплывает до корня. Отдаёт событие — по нему видно, погашено ли. */
	const press = (target: Element, key: string, init: KeyboardEventInit = {}) => {
		const event = new KeyboardEvent('keydown', {
			key,
			bubbles: true,
			cancelable: true,
			...init,
		})

		target.dispatchEvent(event)

		return event
	}

	return { column, bundle, root, content, sort, resizer, field, commit, pointer, press }
}

describe('указатель', () => {
	it('протяжка вправо расширяет колонку, отпускание — один commit; нажатие гасится', async () => {
		const { column, resizer, commit, pointer } = await mount()

		const down = pointer('pointerdown', resizer, 260)

		expect(down.defaultPrevented).toBe(true)
		expect(column.dataset.get('resizing')).toBe('true')

		pointer('pointermove', resizer, 270)
		pointer('pointermove', resizer, 290)

		expect(column.width).toBe(WIDTH + 30)
		expect(commit).not.toHaveBeenCalled()

		pointer('pointerup', resizer, 290)

		expect(column.dataset.get('resizing')).toBe('false')
		expect(commit.mock.calls).toEqual([[WIDTH + 30]])
	})

	it('протяжка — от замеренной ширины заголовка, а не от своей', async () => {
		const { column, resizer, pointer } = await mount({ width: 120 })

		pointer('pointerdown', resizer, 260)
		pointer('pointermove', resizer, 250)

		expect(column.width).toBe(WIDTH - 10)
	})

	it('RTL: ручка у левого края — колонку расширяет движение влево', async () => {
		const { column, resizer, pointer } = await mount({}, 'rtl')

		pointer('pointerdown', resizer, 100)
		pointer('pointermove', resizer, 80)

		expect(column.width).toBe(WIDTH + 20)

		pointer('pointermove', resizer, 130)

		expect(column.width).toBe(WIDTH - 30)
	})

	it('нажатие без движения ширину не задаёт', async () => {
		const { column, resizer, commit, pointer } = await mount({ width: undefined })

		column.notifyWidth(WIDTH)
		pointer('pointerdown', resizer, 260)
		pointer('pointermove', resizer, 260)
		pointer('pointerup', resizer, 260)

		expect(column.width).toBeUndefined()
		expect(commit).not.toHaveBeenCalled()
	})

	it('нажатие мимо полосы — не жест: кнопка в заголовке остаётся своей', async () => {
		const { column, sort, content, pointer } = await mount()

		const onSort = pointer('pointerdown', sort, 150)
		const onContent = pointer('pointerdown', content, 150)

		pointer('pointermove', content, 200)

		expect(onSort.defaultPrevented).toBe(false)
		expect(onContent.defaultPrevented).toBe(false)
		expect(column.width).toBe(WIDTH)
		expect(column.dataset.get('resizing')).toBe('false')
	})

	it('жест берёт только основная кнопка; второй указатель его не перехватывает', async () => {
		const { column, resizer, pointer } = await mount()

		pointer('pointerdown', resizer, 260, { button: 2 })

		expect(column.dataset.get('resizing')).toBe('false')

		pointer('pointerdown', resizer, 260)
		pointer('pointerdown', resizer, 200, { pointerId: 2 })
		pointer('pointermove', resizer, 200, { pointerId: 2 })
		pointer('pointerup', resizer, 200, { pointerId: 2 })

		expect(column.width).toBe(WIDTH)
		expect(column.dataset.get('resizing')).toBe('true')

		pointer('pointermove', resizer, 270)

		expect(column.width).toBe(WIDTH + 10)
	})

	it.each(['pointercancel', 'lostpointercapture'])(
		'%s — браузер отнял указатель: жест закончен с тем, что сделано',
		async (type) => {
			const { column, resizer, commit, pointer } = await mount()

			pointer('pointerdown', resizer, 260)
			pointer('pointermove', resizer, 280)
			pointer(type, resizer, 280)
			pointer('pointermove', resizer, 300)

			expect(column.width).toBe(WIDTH + 20)
			expect(column.dataset.get('resizing')).toBe('false')
			expect(commit.mock.calls).toEqual([[WIDTH + 20]])
		},
	)

	it('фокус — полю ручки: клавиши продолжают с того места', async () => {
		const { resizer, field, pointer } = await mount()

		pointer('pointerdown', resizer, 260)

		expect(document.activeElement).toBe(field)
	})

	it('у колонки без ручки нажатие не жест и не гасится', async () => {
		const { column, resizer, pointer } = await mount({ disabled: true })

		const down = pointer('pointerdown', resizer, 260)

		pointer('pointermove', resizer, 280)

		expect(down.defaultPrevented).toBe(false)
		expect(column.width).toBe(WIDTH)
	})

	it('корень ушёл посреди жеста — жест закончен', async () => {
		const { column, bundle, resizer, commit, pointer } = await mount()

		pointer('pointerdown', resizer, 260)
		pointer('pointermove', resizer, 270)
		pluginOf(bundle, TElementPlugin).element = null

		expect(column.dataset.get('resizing')).toBe('false')
		expect(commit.mock.calls).toEqual([[WIDTH + 10]])
	})
})

describe('клавиши', () => {
	it('LTR: → и ↑ — шире на шаг, ← и ↓ — уже; клавиша гасится, commit на каждую', async () => {
		const { column, field, commit, press } = await mount()

		const right = press(field, 'ArrowRight')

		expect(right.defaultPrevented).toBe(true)
		expect(column.width).toBe(WIDTH + 10)

		press(field, 'ArrowUp')
		press(field, 'ArrowLeft')
		press(field, 'ArrowDown')
		press(field, 'ArrowDown')

		expect(column.width).toBe(WIDTH - 10)
		expect(commit).toHaveBeenCalledTimes(5)
	})

	it('RTL: ← — шире, → — уже: край колонки идёт туда, куда смотрит стрелка', async () => {
		const { column, field, press } = await mount({}, 'rtl')

		press(field, 'ArrowLeft')

		expect(column.width).toBe(WIDTH + 10)

		press(field, 'ArrowRight')
		press(field, 'ArrowRight')

		expect(column.width).toBe(WIDTH - 10)
	})

	it('Shift со стрелкой, PageUp и PageDown — крупный шаг', async () => {
		const { column, field, press } = await mount()

		press(field, 'ArrowRight', { shiftKey: true })

		expect(column.width).toBe(WIDTH + 100)

		press(field, 'PageDown')
		press(field, 'PageDown')

		expect(column.width).toBe(WIDTH - 100)

		press(field, 'PageUp')

		expect(column.width).toBe(WIDTH)
	})

	it('Home и End — края хода', async () => {
		const { column, field, press } = await mount({ minWidth: 100, maxWidth: 300 })

		press(field, 'End')

		expect(column.width).toBe(300)

		press(field, 'Home')

		expect(column.width).toBe(100)
	})

	it('шаги — опции установки', async () => {
		const { column, field, press } = await mount({}, 'ltr', { step: 4, largeStep: 40 })

		press(field, 'ArrowRight')

		expect(column.width).toBe(WIDTH + 4)

		press(field, 'PageUp')

		expect(column.width).toBe(WIDTH + 44)
	})

	it('с Alt, Ctrl и Meta — чужой жест: не гасится и ширину не меняет', async () => {
		const { column, field, press } = await mount()

		const events = [
			press(field, 'ArrowRight', { altKey: true }),
			press(field, 'ArrowRight', { ctrlKey: true }),
			press(field, 'ArrowRight', { metaKey: true }),
		]

		expect(events.map((event) => event.defaultPrevented)).toEqual([false, false, false])
		expect(column.width).toBe(WIDTH)
	})

	it('клавиши кнопки в заголовке — не ручки', async () => {
		const { column, sort, press } = await mount()

		const event = press(sort, 'ArrowRight')

		expect(event.defaultPrevented).toBe(false)
		expect(column.width).toBe(WIDTH)
	})

	it('чужая клавиша — не гасится', async () => {
		const { field, press } = await mount()

		expect(press(field, 'Tab').defaultPrevented).toBe(false)
		expect(press(field, 'a').defaultPrevented).toBe(false)
	})
})

describe('жест скринридера', () => {
	/** Правка поля мимо клавиш — так его двигает мобильный скринридер. */
	function swipe(field: HTMLInputElement, value: number): void {
		field.value = String(value)
		field.dispatchEvent(new Event('input', { bubbles: true }))
	}

	it('правка поля — шаг колонки в ту же сторону, и поле показывает её ширину', async () => {
		const { column, field, commit } = await mount()

		swipe(field, WIDTH + 1)

		expect(column.width).toBe(WIDTH + 10)
		expect(field.value).toBe(String(WIDTH + 10))

		swipe(field, WIDTH)

		expect(column.width).toBe(WIDTH)
		expect(commit.mock.calls).toEqual([[WIDTH + 10], [WIDTH]])
	})

	it('у края хода шаг короче — поле показывает ширину колонки, а не свою правку', async () => {
		const { column, field } = await mount({ maxWidth: WIDTH + 5 })

		swipe(field, WIDTH + 1)

		expect(column.width).toBe(WIDTH + 5)
		expect(field.value).toBe(String(WIDTH + 5))
	})

	it('правка, которую колонка не приняла, возвращается к её ширине', async () => {
		const { column, field } = await mount()

		// Поле сдвинули, а ручку тем временем выключили: шага нет
		column.disabled = true
		swipe(field, WIDTH + 1)

		expect(column.width).toBe(WIDTH)
		expect(field.value).toBe(String(WIDTH))
	})
})

describe('замер', () => {
	/** Наблюдатель срабатывает на узел, замер идёт кадром позже. */
	async function resize(root: Element): Promise<void> {
		for (const observer of observers) observer.trigger(root)

		await nextFrame()
	}

	const observing = (root: Element) => observers.some((observer) => observer.observed.has(root))

	it('ширину колонки без своей ширины ядро узнаёт от плагина — и ручка появляется', async () => {
		const { column, root } = await mount({ width: undefined })

		expect(column.resizerRendered).toBe(false)

		await resize(root)

		expect(column.resizer.value).toBe(WIDTH)
		expect(column.resizerRendered).toBe(true)
	})

	it('подряд идущие уведомления — один замер', async () => {
		const { column, root } = await mount({ width: undefined })
		const notify = vi.spyOn(column, 'notifyWidth')

		for (const observer of observers) {
			observer.trigger(root)
			observer.trigger(root)
		}

		await nextFrame()

		expect(notify).toHaveBeenCalledTimes(1)
	})

	it('наблюдает, только пока у колонки есть ручка', async () => {
		const { column, root } = await mount({ resizable: false })

		expect(observing(root)).toBe(false)

		column.resizable = true

		expect(observing(root)).toBe(true)

		column.resizable = false

		expect(observing(root)).toBe(false)
	})

	it('корень ушёл — наблюдение снято', async () => {
		const { bundle, root } = await mount()

		expect(observing(root)).toBe(true)

		pluginOf(bundle, TElementPlugin).element = null

		expect(observing(root)).toBe(false)
	})
})

describe('уничтожение', () => {
	it('destroy снимает подписку с колонки: она живёт дольше монтирования', async () => {
		const column = new TTableColumn({ resizable: true })
		const on = vi.spyOn(column.events, 'on')
		const off = vi.spyOn(column.events, 'off')
		const bundle = new TPluginBundle(column).use(TElementPlugin).use(TTableColumnResizePlugin)

		bundle.destroy()

		/** Подписки на `resizable` — та, что ведёт наблюдение замера. */
		const pairs = (calls: ReadonlyArray<readonly unknown[]>) =>
			calls
				.filter(([event]) => event === 'change:resizable')
				.map(([event, handler]) => [event, handler])

		expect(pairs(on.mock.calls)).toHaveLength(1)
		expect(pairs(off.mock.calls)).toEqual(pairs(on.mock.calls))
	})

	it('после destroy замер и клавиши ничего не трогают', async () => {
		const { column, bundle, root, field, press } = await mount({ width: undefined })

		bundles.splice(bundles.indexOf(bundle), 1)
		bundle.destroy()

		for (const observer of observers) observer.trigger(root)
		await nextFrame()
		press(field, 'ArrowRight')

		expect(column.resizerRendered).toBe(false)
		expect(column.width).toBeUndefined()
	})
})
