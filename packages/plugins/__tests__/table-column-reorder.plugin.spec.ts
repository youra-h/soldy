// @vitest-environment jsdom

/**
 * TTableColumnReorderPlugin — перестановка колонок пользователем: заголовок
 * тащат указателем или сдвигают Ctrl+Shift+←/→.
 *
 * Разметку тест строит сам — шапку с ячейкой колонки выбора и заголовками с
 * кнопкой сортировки, как их рисует Vue, — а плагин собран настоящим набором
 * над настоящей таблицей и движком строк. Коробки заголовков задаёт тест:
 * jsdom раскладку не считает. Захвата указателя в jsdom нет, поэтому события
 * тест шлёт прямо в узлы. Настоящий ввод и раскладка —
 * `playground/vue/browser/table.spec.ts`; куда встаёт колонка и что слышит
 * приложение, — `core/__tests__/table-columns.spec.ts`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { TTable, createEngineTable } from '@soldy-ui/core'
import type { TTableCollection, TTableColumnSource } from '@soldy-ui/core'
import {
	TCollectionBundlesPlugin,
	TElementPlugin,
	TPluginBundle,
	TTableColumnReorderPlugin,
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

const bundles: TPluginBundle[] = []

afterEach(() => {
	for (const bundle of bundles.splice(0)) bundle.destroy()

	document.body.innerHTML = ''
})

/** Ширина заголовка, которую «разложил» тест, px: заголовки идут вплотную от нуля. */
const WIDTH = 100

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
async function mount(columns: readonly TTableColumnSource[] = MOVABLE, dir: 'ltr' | 'rtl' = 'ltr') {
	const owner = new TTable()
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
		vi.spyOn(cell, 'getBoundingClientRect').mockReturnValue(new DOMRect(left, 0, WIDTH, 40))

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

	return { owner, engine, root, cells, move, pointer, key, sortOf }
}

describe('указатель', () => {
	it('нажатие без протяжки дальше порога — не жест: колонку не берут', async () => {
		const { engine, cells, move, pointer, sortOf } = await mount()

		pointer('pointerdown', sortOf(cells[0]), 50)
		pointer('pointermove', cells[0], 54)

		expect(engine.extensions.columns.dragged).toBeUndefined()

		pointer('pointerup', cells[0], 54)

		expect(fields(engine)).toEqual(['name', 'city', 'age'])
		expect(move).not.toHaveBeenCalled()
	})

	it('протяжка — заголовок идёт за указателем, метка на месте, отпускание — перестановка', async () => {
		const { engine, cells, move, pointer, sortOf } = await mount()
		const [name, city, age] = engine.extensions.columns.columns

		pointer('pointerdown', sortOf(cells[0]), 50)
		pointer('pointermove', cells[0], 140)

		expect(engine.extensions.columns.dragged).toBe(name)
		expect(cells[0].style.getPropertyValue('--s-table-column-drag')).toBe('90px')
		// Середина второго заголовка (150) ещё впереди: место — своё
		expect(city.dataset.has('drop')).toBe(false)

		pointer('pointermove', cells[0], 160)

		expect(city.dataset.get('drop')).toBe('after')

		pointer('pointermove', cells[0], 260)

		expect(city.dataset.has('drop')).toBe(false)
		expect(age.dataset.get('drop')).toBe('after')
		expect(fields(engine)).toEqual(['name', 'city', 'age'])

		pointer('pointerup', cells[0], 260)

		expect(fields(engine)).toEqual(['city', 'age', 'name'])
		expect(move).toHaveBeenCalledTimes(1)
		expect(cells[0].style.getPropertyValue('--s-table-column-drag')).toBe('')
		expect(engine.extensions.columns.dragged).toBeUndefined()
	})

	it('назад — метка у начала колонки места', async () => {
		const { engine, cells, pointer } = await mount()
		const [name] = engine.extensions.columns.columns

		pointer('pointerdown', cells[2], 250)
		pointer('pointermove', cells[2], 20)

		expect(name.dataset.get('drop')).toBe('before')

		pointer('pointerup', cells[2], 20)

		expect(fields(engine)).toEqual(['age', 'name', 'city'])
	})

	it('RTL: место считается справа налево', async () => {
		const { engine, cells, pointer } = await mount(MOVABLE, 'rtl')

		// Первая колонка справа (200–300); тянут её влево — к концу строки
		pointer('pointerdown', cells[0], 250)
		pointer('pointermove', cells[0], 40)
		pointer('pointerup', cells[0], 40)

		expect(fields(engine)).toEqual(['city', 'age', 'name'])
	})

	it('отнятый указатель — колонка на месте, метки и сдвига нет', async () => {
		const { engine, cells, move, pointer } = await mount()
		const [, , age] = engine.extensions.columns.columns

		pointer('pointerdown', cells[0], 50)
		pointer('pointermove', cells[0], 260)
		pointer('pointercancel', cells[0], 260)

		expect(fields(engine)).toEqual(['name', 'city', 'age'])
		expect(age.dataset.has('drop')).toBe(false)
		expect(cells[0].style.getPropertyValue('--s-table-column-drag')).toBe('')
		expect(move).not.toHaveBeenCalled()
	})

	it('Escape посреди жеста — отмена, клавиша погашена', async () => {
		const { engine, cells, move, pointer, key } = await mount()

		pointer('pointerdown', cells[0], 50)
		pointer('pointermove', cells[0], 260)

		const escape = key(document.body, { key: 'Escape' })

		expect(escape.defaultPrevented).toBe(true)
		expect(engine.extensions.columns.dragged).toBeUndefined()

		pointer('pointerup', cells[0], 260)

		expect(fields(engine)).toEqual(['name', 'city', 'age'])
		expect(move).not.toHaveBeenCalled()
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
