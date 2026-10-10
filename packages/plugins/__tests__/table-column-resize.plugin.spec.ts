// @vitest-environment jsdom

/**
 * TTableColumnResizePlugin — ручка ширины колонки: указатель, клавиши и жест
 * скринридера.
 *
 * Разметку тест строит сам — заголовок, обёртку содержимого с кнопкой и
 * полосу ручки с полем, как их рисует Vue, — а плагин собран настоящим
 * набором с настоящей `TTableColumn`. Захвата указателя в jsdom нет, поэтому
 * события тест шлёт прямо в узлы. Настоящий ввод и раскладка —
 * `playground/vue/browser/table.spec.ts`; какой станет ширина, —
 * `core/__tests__/table-columns.spec.ts`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
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

const bundles: TPluginBundle[] = []

afterEach(() => {
	for (const bundle of bundles.splice(0)) bundle.destroy()

	document.body.innerHTML = ''
})

/** Ширина колонки, px. */
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

	it('протяжка — от итога ширины колонки: заголовок плагин не мерит', async () => {
		const { column, root, resizer, pointer } = await mount({ width: 300, maxWidth: 200 })
		const measure = vi.spyOn(root, 'getBoundingClientRect')

		pointer('pointerdown', resizer, 260)
		pointer('pointermove', resizer, 250)

		expect(column.width).toBe(190)
		expect(measure).not.toHaveBeenCalled()
	})

	it('RTL: ручка у левого края — колонку расширяет движение влево', async () => {
		const { column, resizer, pointer } = await mount({}, 'rtl')

		pointer('pointerdown', resizer, 100)
		pointer('pointermove', resizer, 80)

		expect(column.width).toBe(WIDTH + 20)

		pointer('pointermove', resizer, 130)

		expect(column.width).toBe(WIDTH - 30)
	})

	it('нажатие без движения ширину не задаёт: гибкая колонка остаётся гибкой', async () => {
		const { column, resizer, commit, pointer } = await mount({ width: undefined })

		column.layoutWidth = WIDTH
		pointer('pointerdown', resizer, 260)
		pointer('pointermove', resizer, 260)
		pointer('pointerup', resizer, 260)

		expect(column.width).toBe(WIDTH)
		expect(column.getProps().width).toBeUndefined()
		expect(commit).not.toHaveBeenCalled()
	})

	it('гибкая колонка: протяжка — от ширины раскладки и задаёт свою', async () => {
		const { column, resizer, commit, pointer } = await mount({ width: undefined })

		column.layoutWidth = 200
		pointer('pointerdown', resizer, 260)
		pointer('pointermove', resizer, 220)
		pointer('pointerup', resizer, 220)

		expect(column.width).toBe(160)
		expect(column.getProps().width).toBe(160)
		expect(commit.mock.calls).toEqual([[160]])
	})

	it('гибкая колонка без раскладки — жеста нет, нажатие не гасится', async () => {
		const { column, resizer, pointer } = await mount({ width: undefined })

		const down = pointer('pointerdown', resizer, 260)

		pointer('pointermove', resizer, 280)

		expect(down.defaultPrevented).toBe(false)
		expect(column.width).toBeUndefined()
		expect(column.dataset.get('resizing')).toBe('false')
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

	it('Escape посреди жеста — ширина нажатия, без commit; дальше протяжка ничего не двигает', async () => {
		const { column, root, resizer, field, commit, pointer, press } = await mount()

		pointer('pointerdown', resizer, 260)
		pointer('pointermove', resizer, 290)

		expect(column.width).toBe(WIDTH + 30)
		expect(press(field, 'Escape').defaultPrevented).toBe(true)
		expect(column.width).toBe(WIDTH)

		pointer('pointermove', root, 320)
		pointer('pointerup', root, 320)

		expect(column.width).toBe(WIDTH)
		expect(commit).not.toHaveBeenCalled()
	})

	it('Escape вне жеста — не наша клавиша', async () => {
		const { field, press } = await mount()

		expect(press(field, 'Escape').defaultPrevented).toBe(false)
	})
})

describe('отложенный жест (deferred)', () => {
	/** Колонка в отложенном режиме: его пишет расширение колонок от таблицы. */
	async function mountDeferred(
		props: Partial<ITableColumnProps> = {},
		dir: 'ltr' | 'rtl' = 'ltr',
	) {
		const mounted = await mount(props, dir)

		mounted.column.resizePreview = 'deferred'

		return mounted
	}

	const ghostOf = (root: HTMLElement) => root.style.getPropertyValue('--s-table-column-ghost')

	it('ширина не меняется до отпускания; один commit на жест', async () => {
		const { column, root, resizer, commit, pointer } = await mountDeferred()
		const width = vi.fn()

		column.events.on('change:width', width)

		pointer('pointerdown', resizer, 260)

		expect(column.dataset.get('resize-ghost')).toBe('true')
		expect(ghostOf(root)).toBe('0px')

		pointer('pointermove', resizer, 270)
		pointer('pointermove', resizer, 290)

		expect(column.width).toBe(WIDTH)
		expect(width).not.toHaveBeenCalled()
		expect(ghostOf(root)).toBe('30px')

		pointer('pointerup', resizer, 290)

		expect(column.width).toBe(WIDTH + 30)
		expect(commit.mock.calls).toEqual([[WIDTH + 30]])
		expect(ghostOf(root)).toBe('')
		expect(root.style.getPropertyValue('--s-table-column-ghost-size')).toBe('')
	})

	it('возврат к точке нажатия ничего не пишет', async () => {
		const { column, resizer, commit, pointer } = await mountDeferred({ width: undefined })

		column.layoutWidth = 150
		pointer('pointerdown', resizer, 260)
		pointer('pointermove', resizer, 300)
		pointer('pointermove', resizer, 260)
		pointer('pointerup', resizer, 260)

		expect(column.getProps().width).toBeUndefined()
		expect(commit).not.toHaveBeenCalled()
	})

	it('призрак — в пределах хода колонки', async () => {
		const { root, resizer, pointer } = await mountDeferred({ maxWidth: 200 })

		pointer('pointerdown', resizer, 260)
		pointer('pointermove', resizer, 400)

		expect(ghostOf(root)).toBe('40px')
	})

	it('RTL: призрак идёт влево, когда колонка растёт', async () => {
		const { column, root, resizer, pointer } = await mountDeferred({}, 'rtl')

		pointer('pointerdown', resizer, 100)
		pointer('pointermove', resizer, 80)

		expect(ghostOf(root)).toBe('-20px')

		pointer('pointerup', resizer, 80)

		expect(column.width).toBe(WIDTH + 20)
	})

	it('высота призрака — один замер на нажатии; шаги указателя не мерят', async () => {
		const { root, resizer, pointer } = await mountDeferred()

		pointer('pointerdown', resizer, 260)

		expect(root.style.getPropertyValue('--s-table-column-ghost-size')).toMatch(/px$/)

		const measure = vi.spyOn(root, 'getBoundingClientRect')

		pointer('pointermove', resizer, 270)
		pointer('pointermove', resizer, 280)

		expect(measure).not.toHaveBeenCalled()
	})

	it('Escape — призрак снят, ширина та же, без commit', async () => {
		const { column, root, resizer, field, commit, pointer, press } = await mountDeferred()

		pointer('pointerdown', resizer, 260)
		pointer('pointermove', resizer, 290)
		press(field, 'Escape')

		expect(column.width).toBe(WIDTH)
		expect(column.dataset.has('resize-ghost')).toBe(false)
		expect(ghostOf(root)).toBe('')

		pointer('pointerup', resizer, 290)

		expect(commit).not.toHaveBeenCalled()
	})

	it('клавиши пишут сразу', async () => {
		const { column, field, commit, press } = await mountDeferred()

		press(field, 'ArrowRight')

		expect(column.width).toBe(WIDTH + 10)
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

describe('уничтожение', () => {
	it('на колонку плагин не подписан: ширину и ручку он не наблюдает', async () => {
		const column = new TTableColumn({ resizable: true })
		const on = vi.spyOn(column.events, 'on')
		const bundle = new TPluginBundle(column).use(TElementPlugin).use(TTableColumnResizePlugin)

		bundle.destroy()

		expect(on).not.toHaveBeenCalled()
	})

	it('после destroy указатель и клавиши ничего не трогают', async () => {
		const { column, bundle, resizer, field, press, pointer } = await mount()

		bundles.splice(bundles.indexOf(bundle), 1)
		bundle.destroy()

		press(field, 'ArrowRight')
		pointer('pointerdown', resizer, 260)
		pointer('pointermove', resizer, 280)

		expect(column.width).toBe(WIDTH)
		expect(column.dataset.get('resizing')).toBe('false')
	})
})
