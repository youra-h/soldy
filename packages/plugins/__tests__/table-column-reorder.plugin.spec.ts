// @vitest-environment jsdom

/**
 * TTableColumnReorderPlugin — перестановка колонок пользователем: заголовок
 * тащат указателем или сдвигают Ctrl+Shift+←/→.
 *
 * Разметку тест строит сам — шапку с ячейкой колонки выбора и заголовками с
 * кнопкой сортировки, как их рисует Vue, — а плагин собран настоящим набором
 * над настоящей таблицей и движком строк. Коробки заголовков задаёт тест:
 * jsdom раскладку не считает. Захвата указателя в jsdom нет, поэтому события
 * тест шлёт прямо в узлы. Переходов в jsdom тоже нет: отпущенный заголовок
 * получает место кадром позже, а колонка встаёт ещё через кадр — ожидание
 * переходов (`afterTransitions`) кончается в своём кадре. Шапку после
 * перестановки здесь никто не перерисовывает — её порядок в разметке прежний.
 * Настоящий ввод, раскладка и переходы темы —
 * `playground/vue/browser/table.spec.ts`; куда встаёт колонка, какие метки у
 * колонок и что слышит приложение, — `core/__tests__/table-columns.spec.ts`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { TTable, createEngineTable } from '@soldy-ui/core'
import type { TTableCollection, TTableColumnSource, TTableReorderPreview } from '@soldy-ui/core'
import {
	TCollectionBundlesPlugin,
	TElementPlugin,
	TPluginBundle,
	TTableColumnReorderPlugin,
} from '../src'
import type { IPlugin, IPluginConstructor } from '../src'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/** Несколько кадров подряд. */
async function frames(count: number): Promise<void> {
	for (let index = 0; index < count; index++) await nextFrame()
}

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

/** Ширина заголовка, которую «разложил» тест, px: заголовки идут вплотную от нуля. */
const WIDTH = 100

const DRAG = '--s-table-column-drag'
const SHIFT = '--s-table-column-shift'

const MOVABLE: readonly TTableColumnSource[] = ['name', 'city', 'age'].map((field) => ({
	field,
	text: field,
	reorderable: true,
}))

const fields = (engine: TTableCollection) =>
	engine.extensions.columns.columns.map((column) => column.field)

/**
 * Таблица на странице: корень, шапка с ячейкой колонки выбора и заголовками
 * показанных колонок, в каждом — кнопка сортировки. Коробки заголовков — по
 * `WIDTH` вплотную, в RTL — справа налево.
 */
async function mount(
	columns: readonly TTableColumnSource[] = MOVABLE,
	dir: 'ltr' | 'rtl' = 'ltr',
	reorderPreview: TTableReorderPreview = 'head',
) {
	const owner = new TTable({ reorderPreview })
	const engine = createEngineTable({ owner })

	engine.extensions.columns.columns = columns

	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TCollectionBundlesPlugin)
		.use(TTableColumnReorderPlugin)

	bundles.push(bundle)
	pluginOf(bundle, TCollectionBundlesPlugin).bindEngine(engine)

	const root = document.createElement('table')
	const head = document.createElement('thead')
	const row = document.createElement('tr')
	const select = document.createElement('th')

	root.className = owner.classes.base
	root.dir = dir
	head.className = owner.classes.resolve('__head')
	row.className = owner.classes.resolve('__head-row')
	select.className = owner.classes.resolve('__select')
	row.append(select)

	const shown = engine.extensions.columns.shownColumns
	const cells = shown.map((column, index) => {
		const cell = document.createElement('th')
		const sort = document.createElement('button')
		const left = dir === 'ltr' ? index * WIDTH : (shown.length - 1 - index) * WIDTH

		cell.className = column.classes.base
		sort.textContent = column.text
		cell.append(sort)
		row.append(cell)
		place(cell, left)

		return cell
	})

	head.append(row)
	root.append(head)
	document.body.append(root)

	pluginOf(bundle, TElementPlugin).element = root
	await nextFrame()

	const move = vi.fn()

	engine.extensions.columns.events.on('column:move', move)

	/** Указатель: событие с точкой, всплывает до корня. */
	const pointer = (type: string, target: Element, x: number, init: PointerEventInit = {}) => {
		const event = new PointerEvent(type, {
			bubbles: true,
			cancelable: true,
			pointerId: 1,
			button: 0,
			clientX: x,
			...init,
		})

		target.dispatchEvent(event)

		return event
	}

	/** Клавиша на узле, всплывает до корня. */
	const key = (target: Element, init: KeyboardEventInit) => {
		const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })

		target.dispatchEvent(event)

		return event
	}

	const sortOf = (cell: Element) => {
		const button = cell.querySelector('button')

		if (!button) throw new Error('кнопки сортировки нет')

		return button
	}

	return { bundle, owner, engine, root, cells, move, pointer, key, sortOf }
}

/** Коробка заголовка, которую «разложил» тест: левый край по строке. */
function place(cell: Element, left: number): void {
	vi.spyOn(cell, 'getBoundingClientRect').mockReturnValue(new DOMRect(left, 0, WIDTH, 40))
}

/** Переменная в инлайновом стиле узла; нет её — пустая строка. */
const variable = (element: HTMLElement, name: string) => element.style.getPropertyValue(name)

describe('указатель', () => {
	it('нажатие без протяжки дальше порога — не жест: колонку не берут', async () => {
		const { engine, root, cells, move, pointer, sortOf } = await mount()

		pointer('pointerdown', sortOf(cells[0]), 50)
		pointer('pointermove', cells[0], 54)

		expect(engine.extensions.columns.dragged).toBeUndefined()
		expect(variable(root, SHIFT)).toBe('')

		pointer('pointerup', cells[0], 54)
		await frames(2)

		expect(fields(engine)).toEqual(['name', 'city', 'age'])
		expect(move).not.toHaveBeenCalled()
	})

	it('протяжка — заголовок идёт за указателем, соседи уступают место на его ширину', async () => {
		const { engine, root, cells, pointer, sortOf } = await mount()
		const [name, city, age] = engine.extensions.columns.columns

		pointer('pointerdown', sortOf(cells[0]), 50)
		pointer('pointermove', cells[0], 140)

		expect(engine.extensions.columns.dragged).toBe(name)
		expect(variable(cells[0], DRAG)).toBe('90px')
		// Сдвиг соседей — ширина взятого, на корне
		expect(variable(root, SHIFT)).toBe(`${WIDTH}px`)
		// Середина второго заголовка (150) ещё впереди: место — своё
		expect(city.dataset.has('drop')).toBe(false)
		expect(city.dataset.has('shift')).toBe(false)

		pointer('pointermove', cells[0], 160)

		expect(city.dataset.get('drop')).toBe('after')
		expect(city.dataset.get('shift')).toBe('start')

		pointer('pointermove', cells[0], 260)

		expect(city.dataset.has('drop')).toBe(false)
		expect(city.dataset.get('shift')).toBe('start')
		expect(age.dataset.get('drop')).toBe('after')
		expect(age.dataset.get('shift')).toBe('start')
		expect(fields(engine)).toEqual(['name', 'city', 'age'])
	})

	it('отпустили — заголовок кадром позже едет на место, колонка встаёт, когда он доехал', async () => {
		const { engine, root, cells, move, pointer, sortOf } = await mount()
		const [name] = engine.extensions.columns.columns

		pointer('pointerdown', sortOf(cells[0]), 50)
		pointer('pointermove', cells[0], 260)
		pointer('pointerup', cells[0], 260)

		// Место заморожено, коллекция не тронута, заголовок ещё под указателем
		expect(name.dataset.get('landing')).toBe('true')
		expect(fields(engine)).toEqual(['name', 'city', 'age'])
		expect(variable(cells[0], DRAG)).toBe('210px')

		await nextFrame()

		// Правый край взятого — у правого края последнего заголовка
		expect(variable(cells[0], DRAG)).toBe('200px')
		expect(fields(engine)).toEqual(['name', 'city', 'age'])
		expect(move).not.toHaveBeenCalled()

		await nextFrame()

		expect(fields(engine)).toEqual(['city', 'age', 'name'])
		expect(move).toHaveBeenCalledTimes(1)
		expect(engine.extensions.columns.dragged).toBeUndefined()
		expect(name.dataset.has('landing')).toBe(false)
		expect(variable(cells[0], DRAG)).toBe('')
		expect(variable(root, SHIFT)).toBe('')
	})

	it('none: шапка стоит — ширины корню нет, колонка встаёт на отпускании, без кадров', async () => {
		const { engine, root, cells, move, pointer, sortOf } = await mount(MOVABLE, 'ltr', 'none')
		const [name, city, age] = engine.extensions.columns.columns

		pointer('pointerdown', sortOf(cells[0]), 50)
		pointer('pointermove', cells[0], 260)

		// Заголовок идёт за указателем, соседи стоят, место — линия
		expect(name.dataset.get('still')).toBe('true')
		expect(variable(cells[0], DRAG)).toBe('210px')
		expect(variable(root, SHIFT)).toBe('')
		expect(age.dataset.get('drop')).toBe('after')
		expect(city.dataset.has('shift')).toBe(false)

		pointer('pointerup', cells[0], 260)

		// Сразу, а не после приземления
		expect(fields(engine)).toEqual(['city', 'age', 'name'])
		expect(move).toHaveBeenCalledTimes(1)
		expect(name.dataset.has('landing')).toBe(false)
		expect(name.dataset.has('still')).toBe(false)
		expect(variable(cells[0], DRAG)).toBe('')
	})

	it('none: отнятый указатель — колонка на месте сразу, метки сняты', async () => {
		const { engine, cells, move, pointer, sortOf } = await mount(MOVABLE, 'ltr', 'none')
		const [name, , age] = engine.extensions.columns.columns

		pointer('pointerdown', sortOf(cells[0]), 50)
		pointer('pointermove', cells[0], 260)
		pointer('pointercancel', cells[0], 260)

		expect(fields(engine)).toEqual(['name', 'city', 'age'])
		expect(move).not.toHaveBeenCalled()
		expect(engine.extensions.columns.dragged).toBeUndefined()
		expect(name.dataset.has('still')).toBe(false)
		expect(age.dataset.has('drop')).toBe(false)
		expect(variable(cells[0], DRAG)).toBe('')
	})

	it('назад — метка у начала колонки места, заголовок едет к её левому краю', async () => {
		const { engine, cells, pointer } = await mount()
		const [name, city] = engine.extensions.columns.columns

		pointer('pointerdown', cells[2], 250)
		pointer('pointermove', cells[2], 20)

		expect(name.dataset.get('drop')).toBe('before')
		expect([name, city].map((column) => column.dataset.get('shift'))).toEqual(['end', 'end'])

		pointer('pointerup', cells[2], 20)
		await nextFrame()

		expect(variable(cells[2], DRAG)).toBe('-200px')

		await nextFrame()

		expect(fields(engine)).toEqual(['age', 'name', 'city'])
	})

	it('RTL: место считается справа налево, заголовок едет к левому краю места', async () => {
		const { engine, cells, pointer } = await mount(MOVABLE, 'rtl')

		// Первая колонка справа (200–300); тянут её влево — к концу строки
		pointer('pointerdown', cells[0], 250)
		pointer('pointermove', cells[0], 40)
		pointer('pointerup', cells[0], 40)
		await nextFrame()

		expect(variable(cells[0], DRAG)).toBe('-200px')

		await nextFrame()

		expect(fields(engine)).toEqual(['city', 'age', 'name'])
	})

	it('место — по коробкам на старте жеста: сдвинутый сосед порога не двигает', async () => {
		const { engine, cells, pointer } = await mount()
		const [, city] = engine.extensions.columns.columns

		pointer('pointerdown', cells[0], 50)
		pointer('pointermove', cells[0], 160)

		expect(city.dataset.get('shift')).toBe('start')

		// Тема сдвинула соседа к началу строки, на ширину взятого
		place(cells[1], 0)
		pointer('pointermove', cells[0], 140)

		// Середина соседа на старте — 150: указатель вернулся до неё
		expect(city.dataset.has('shift')).toBe(false)
		expect(city.dataset.has('drop')).toBe(false)
	})

	it('прокрутка посреди жеста учтена: середины — от нынешнего края корня', async () => {
		const { engine, root, cells, pointer } = await mount()
		const [, city] = engine.extensions.columns.columns

		pointer('pointerdown', cells[0], 50)
		pointer('pointermove', cells[0], 90)

		// Таблицу прокрутили на 100 px вбок: середина соседа теперь на 50
		vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(new DOMRect(-100, 0, 300, 40))
		pointer('pointermove', cells[0], 60)

		expect(city.dataset.get('drop')).toBe('after')
	})

	it('отнятый указатель — заголовок едет на своё место, колонка на месте', async () => {
		const { engine, root, cells, move, pointer } = await mount()
		const [name, city, age] = engine.extensions.columns.columns

		pointer('pointerdown', cells[0], 50)
		pointer('pointermove', cells[0], 260)
		pointer('pointercancel', cells[0], 260)

		// Соседи возвращаются сразу, заголовок — приземлением
		expect([city, age].some((column) => column.dataset.has('shift'))).toBe(false)
		expect(age.dataset.has('drop')).toBe(false)
		expect(name.dataset.get('landing')).toBe('true')

		await nextFrame()

		expect(variable(cells[0], DRAG)).toBe('0px')

		await nextFrame()

		expect(fields(engine)).toEqual(['name', 'city', 'age'])
		expect(engine.extensions.columns.dragged).toBeUndefined()
		expect(name.dataset.has('landing')).toBe(false)
		expect(variable(cells[0], DRAG)).toBe('')
		expect(variable(root, SHIFT)).toBe('')
		expect(move).not.toHaveBeenCalled()
	})

	it('Escape посреди жеста — отмена, клавиша погашена; отпускание после неё — не перестановка', async () => {
		const { engine, cells, move, pointer, key } = await mount()
		const [name] = engine.extensions.columns.columns

		pointer('pointerdown', cells[0], 50)
		pointer('pointermove', cells[0], 260)

		const escape = key(document.body, { key: 'Escape' })

		expect(escape.defaultPrevented).toBe(true)
		expect(name.dataset.get('landing')).toBe('true')

		pointer('pointerup', cells[0], 260)
		await frames(2)

		expect(engine.extensions.columns.dragged).toBeUndefined()
		expect(fields(engine)).toEqual(['name', 'city', 'age'])
		expect(move).not.toHaveBeenCalled()
	})

	it('lostpointercapture после отпускания приземление не отменяет', async () => {
		const { engine, cells, move, pointer } = await mount()

		pointer('pointerdown', cells[0], 50)
		pointer('pointermove', cells[0], 260)
		pointer('pointerup', cells[0], 260)
		// Захват браузер снимает сам — следом за отпусканием
		pointer('lostpointercapture', cells[0], 260)
		await frames(2)

		expect(fields(engine)).toEqual(['city', 'age', 'name'])
		expect(move).toHaveBeenCalledTimes(1)
	})

	it('колонку без reorderable не тащат; нажатие, которое уже взяли, — не наше', async () => {
		const { engine, cells, pointer, sortOf } = await mount([
			{ field: 'name' },
			...MOVABLE.slice(1),
		])

		pointer('pointerdown', cells[0], 50)
		pointer('pointermove', cells[0], 260)

		expect(engine.extensions.columns.dragged).toBeUndefined()

		pointer('pointerup', cells[0], 260)

		// Ручка ширины гасит своё нажатие — перестановке оно не достаётся
		sortOf(cells[1]).addEventListener('pointerdown', (event) => event.preventDefault(), {
			once: true,
		})
		pointer('pointerdown', sortOf(cells[1]), 150)
		pointer('pointermove', cells[1], 20)

		expect(engine.extensions.columns.dragged).toBeUndefined()
	})

	it('выключенная таблица — колонку не взять', async () => {
		const { owner, engine, cells, pointer } = await mount()

		owner.disabled = true
		pointer('pointerdown', cells[0], 50)
		pointer('pointermove', cells[0], 260)

		expect(engine.extensions.columns.dragged).toBeUndefined()
	})
})

/**
 * Пока отпущенный заголовок едет на место, модель ещё в прежнем порядке.
 * Следующее действие видит модель и шапку в одном порядке: нажатие и
 * Ctrl+Shift+←/→ доводят приземление сразу, а заголовок под ними плагин
 * находит до доводки — после неё модель уже в новом порядке, а шапка ещё нет.
 */
describe('приземление', () => {
	/** Колонку `name` отпустили на месте `city`: заголовок ещё едет. */
	async function landing() {
		const mounted = await mount()

		mounted.pointer('pointerdown', mounted.cells[0], 50)
		mounted.pointer('pointermove', mounted.cells[0], 160)
		mounted.pointer('pointerup', mounted.cells[0], 160)

		return mounted
	}

	it('нажатие доводит приземление сразу; жест — у колонки, которую нажали', async () => {
		const { engine, root, cells, move, pointer, sortOf } = await landing()
		const [, city] = engine.extensions.columns.columns

		// Второй заголовок шапки — `city`: шапка ещё в прежнем порядке
		pointer('pointerdown', sortOf(cells[1]), 150, { pointerId: 2 })

		expect(fields(engine)).toEqual(['city', 'name', 'age'])
		expect(move).toHaveBeenCalledTimes(1)
		expect(variable(cells[0], DRAG)).toBe('')
		expect(variable(root, SHIFT)).toBe('')

		pointer('pointermove', cells[1], 220, { pointerId: 2 })

		expect(engine.extensions.columns.dragged).toBe(city)

		// Отложенный кадр приземления ничего не повторяет
		await frames(2)

		expect(move).toHaveBeenCalledTimes(1)
	})

	it('Ctrl+Shift+→ доводит приземление, шаг — от нового порядка', async () => {
		const { engine, cells, move, key, sortOf } = await landing()

		// Кнопка второго заголовка шапки — `city`
		key(sortOf(cells[1]), { key: 'ArrowRight', ctrlKey: true, shiftKey: true })

		// `name` встала на место `city`, потом `city` — шаг к концу строки
		expect(fields(engine)).toEqual(['name', 'city', 'age'])
		expect(move).toHaveBeenCalledTimes(2)

		await frames(2)

		expect(move).toHaveBeenCalledTimes(2)
	})

	it('чужая клавиша приземление не трогает', async () => {
		const { engine, cells, key, sortOf } = await landing()

		key(sortOf(cells[1]), { key: 'ArrowRight', shiftKey: true })

		expect(fields(engine)).toEqual(['name', 'city', 'age'])

		await frames(2)

		expect(fields(engine)).toEqual(['city', 'name', 'age'])
	})

	it('destroy — без перестановки: метки и переменные сняты, кадры ничего не делают', async () => {
		const { bundle, engine, root, cells, move } = await landing()
		const [name] = engine.extensions.columns.columns

		bundle.destroy()

		expect(engine.extensions.columns.dragged).toBeUndefined()
		expect(name.dataset.has('landing')).toBe(false)
		expect(variable(cells[0], DRAG)).toBe('')
		expect(variable(root, SHIFT)).toBe('')

		await frames(2)

		expect(fields(engine)).toEqual(['name', 'city', 'age'])
		expect(move).not.toHaveBeenCalled()
	})

	it('destroy посреди жеста — то же: колонка на месте, переменные сняты', async () => {
		const { bundle, engine, root, cells, move, pointer } = await mount()

		pointer('pointerdown', cells[0], 50)
		pointer('pointermove', cells[0], 260)
		bundle.destroy()

		expect(engine.extensions.columns.dragged).toBeUndefined()
		expect(variable(cells[0], DRAG)).toBe('')
		expect(variable(root, SHIFT)).toBe('')

		await frames(2)

		expect(fields(engine)).toEqual(['name', 'city', 'age'])
		expect(move).not.toHaveBeenCalled()
	})
})

describe('клавиши', () => {
	it('Ctrl+Shift+→ — шаг к концу строки, Ctrl+Shift+← — к началу; клавиша погашена', async () => {
		const { engine, cells, move, key, sortOf } = await mount()

		const right = key(sortOf(cells[0]), { key: 'ArrowRight', ctrlKey: true, shiftKey: true })

		expect(right.defaultPrevented).toBe(true)
		expect(fields(engine)).toEqual(['city', 'name', 'age'])
		expect(move).toHaveBeenCalledTimes(1)

		key(sortOf(cells[2]), { key: 'ArrowLeft', ctrlKey: true, shiftKey: true })

		expect(fields(engine)).toEqual(['city', 'age', 'name'])
	})

	it('RTL: ← — к концу строки', async () => {
		const { engine, cells, key, sortOf } = await mount(MOVABLE, 'rtl')

		key(sortOf(cells[0]), { key: 'ArrowLeft', ctrlKey: true, shiftKey: true })

		expect(fields(engine)).toEqual(['city', 'name', 'age'])
	})

	it('без Ctrl+Shift, с Alt или Meta и у колонки без reorderable — не наша клавиша', async () => {
		const { engine, cells, key, sortOf } = await mount([{ field: 'name' }, ...MOVABLE.slice(1)])

		const plain = key(sortOf(cells[1]), { key: 'ArrowRight', shiftKey: true })
		const alt = key(sortOf(cells[1]), {
			key: 'ArrowRight',
			ctrlKey: true,
			shiftKey: true,
			altKey: true,
		})
		const fixed = key(sortOf(cells[0]), { key: 'ArrowRight', ctrlKey: true, shiftKey: true })

		expect([plain, alt, fixed].some((event) => event.defaultPrevented)).toBe(false)
		expect(fields(engine)).toEqual(['name', 'city', 'age'])
	})

	it('у края строки клавиша остаётся нашей, колонка на месте', async () => {
		const { engine, cells, move, key, sortOf } = await mount()

		const left = key(sortOf(cells[0]), { key: 'ArrowLeft', ctrlKey: true, shiftKey: true })

		expect(left.defaultPrevented).toBe(true)
		expect(fields(engine)).toEqual(['name', 'city', 'age'])
		expect(move).not.toHaveBeenCalled()
	})

	it('фокус остаётся на узле, с которого сдвинули, — и когда шапка его уронила', async () => {
		const { cells, key, sortOf } = await mount()
		const button = sortOf(cells[0])

		button.focus()
		key(button, { key: 'ArrowRight', ctrlKey: true, shiftKey: true })

		// Перерисовка перенесла заголовок, и узел под фокусом его потерял
		button.blur()
		await nextFrame()

		expect(document.activeElement).toBe(button)
	})
})
