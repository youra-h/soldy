// @vitest-environment jsdom

/**
 * TTableGridPlugin — сетка таблицы в документе: клавиши APG Data Grid, выбор
 * строки нажатием и DOM-фокус за фокусом сетки.
 *
 * Разметку тест строит сам — шапку с ячейкой колонки выбора и заголовками,
 * тело со строками, у каждой ячейка выбора и ячейки колонок, — как её рисует
 * Vue, а узлы строк регистрирует в реестре bundles, как это делает адаптер.
 * Плагин собран настоящим набором над настоящей таблицей и движком строк.
 * Куда ходит фокус сетки и что выбирает строка, — `core/__tests__/table-grid.spec.ts`;
 * настоящие Tab и раскладка — `playground/vue/browser/table.spec.ts`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TTable, createEngineTable } from '@soldy-ui/core'
import type { TSelectionMode, TTableCollection, TTableGridCell } from '@soldy-ui/core'
import {
	TCollectionBundlesPlugin,
	TCollectionElements,
	TElementPlugin,
	TPluginBundle,
	TTableGridPlugin,
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

const RECORDS = [
	{ id: 1, name: 'Анна', age: 30 },
	{ id: 2, name: 'Борис', age: 41 },
	{ id: 3, name: 'Вера', age: 25 },
]

/**
 * Сетка на странице: кнопка до таблицы и после неё, шапка и строки. В ячейке
 * колонки `age` первой строки — кнопка слота, в ячейке выбора строки —
 * чекбокс: у ячеек бывают свои остановки Tab.
 */
async function mount(mode: TSelectionMode = 'multiple', dir: 'ltr' | 'rtl' = 'ltr') {
	const owner = new TTable()
	const engine: TTableCollection = createEngineTable({
		owner,
		items: RECORDS.map((data) => ({ data })),
	})

	engine.extensions.columns.columns = [
		{ field: 'name', text: 'Имя' },
		{ field: 'age', text: 'Возраст', sortable: true },
	]
	engine.extensions.selection.mode = mode
	engine.extensions.grid.grid = true

	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TCollectionBundlesPlugin)
		.use(TCollectionElements)
		.use(TTableGridPlugin, { pageStep: 2 })

	bundles.push(bundle)

	const registry = pluginOf(bundle, TCollectionBundlesPlugin)

	registry.bindEngine(engine)

	const before = document.createElement('button')
	const after = document.createElement('button')
	const root = document.createElement('table')
	const head = document.createElement('thead')
	const headRow = document.createElement('tr')
	const body = document.createElement('tbody')

	before.textContent = 'до'
	after.textContent = 'после'
	root.className = owner.classes.base
	root.dir = dir
	root.tabIndex = 0
	head.className = owner.classes.resolve('__head')
	headRow.className = owner.classes.resolve('__head-row')
	body.className = owner.classes.resolve('__body')

	const selecting = mode !== 'none'
	const cell = (tag: 'th' | 'td', text = '') => {
		const node = document.createElement(tag)

		node.tabIndex = -1
		node.textContent = text

		return node
	}

	if (selecting) headRow.append(cell('th'))

	for (const column of engine.extensions.columns.shownColumns) {
		headRow.append(cell('th', column.text))
	}

	for (const row of engine.extensions.batch.shown) {
		const line = document.createElement('tr')
		const rowBundle = new TPluginBundle(row).use(TElementPlugin)

		bundles.push(rowBundle)

		if (selecting) {
			const select = cell('td')
			const checkBox = document.createElement('input')

			checkBox.type = 'checkbox'
			select.append(checkBox)
			line.append(select)
		}

		for (const column of engine.extensions.columns.shownColumns) {
			line.append(cell('td', String(Reflect.get(row.data ?? {}, column.field))))
		}

		body.append(line)
		pluginOf(rowBundle, TElementPlugin).element = line
		registry.register(rowBundle, row)
	}

	head.append(headRow)
	root.append(head, body)
	document.body.append(before, root, after)

	// Кнопка слота в ячейке возраста первой строки
	const slotButton = document.createElement('button')
	const firstLine = body.children[0]

	slotButton.textContent = 'Действие'
	firstLine.children[firstLine.children.length - 1].append(slotButton)

	pluginOf(bundle, TElementPlugin).element = root
	await nextFrame()

	const grid = engine.extensions.grid
	const [anna, boris, vera] = engine.extensions.batch.items
	const [name, age] = engine.extensions.columns.columns

	/** Узел ячейки: шапка — `-1`, строка — по месту, колонка — по месту в сетке. */
	const at = (line: number, column: number): HTMLElement => {
		const row = line === -1 ? headRow : body.children[line]
		const node = row.children[column]

		if (!(node instanceof HTMLElement)) throw new Error('ячейки нет')

		return node
	}

	/** Клавиша на узле, всплывает до корня. */
	const key = (target: Element, init: KeyboardEventInit) => {
		const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })

		target.dispatchEvent(event)

		return event
	}

	const focused = (): TTableGridCell | undefined => grid.focusedCell

	return {
		owner,
		engine,
		grid,
		root,
		before,
		after,
		slotButton,
		at,
		key,
		focused,
		anna,
		boris,
		vera,
		name,
		age,
	}
}

describe('остановка Tab', () => {
	it('фокус на корне — на ячейку под фокусом сетки', async () => {
		const { root, at, grid, boris, age } = await mount()

		// Выбор включили после колонок — фокус сетки остался на первой из них
		root.focus()

		expect(document.activeElement).toBe(at(-1, 1))

		grid.focusCell(boris, age)
		at(-1, 1).blur()
		root.focus()

		expect(document.activeElement).toBe(at(1, 2))
	})

	it('фокус на ячейке — фокус сетки за ним', async () => {
		const { at, focused, boris, name } = await mount()

		at(1, 1).focus()

		expect(focused()).toEqual({ row: boris, column: name })
	})

	it('с клавиатуры снаружи на виджет в ячейке — на ячейку под фокусом сетки', async () => {
		const { slotButton, at, before } = await mount()

		before.focus()
		slotButton.focus()

		expect(document.activeElement).toBe(at(-1, 1))
	})

	it('нажатием на виджет в ячейке — фокус остаётся на нём, сетка — на его ячейке', async () => {
		const { slotButton, root, focused, anna, age } = await mount()

		root.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
		slotButton.focus()

		expect(document.activeElement).toBe(slotButton)
		expect(focused()).toEqual({ row: anna, column: age })
	})

	it('Tab с ячейки — к остановке за таблицей, Shift+Tab — перед ней', async () => {
		const { at, key, before, after } = await mount()

		at(0, 1).focus()

		expect(key(at(0, 1), { key: 'Tab' }).defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(after)

		at(0, 1).focus()
		key(at(0, 1), { key: 'Tab', shiftKey: true })

		expect(document.activeElement).toBe(before)
	})
})

describe('клавиши', () => {
	it('стрелки, Home/End, Ctrl+Home/End, PageUp/PageDown — по ячейкам; DOM-фокус за ними', async () => {
		const { at, key, focused, anna, vera, name, age } = await mount()

		at(-1, 1).focus()

		key(at(-1, 1), { key: 'ArrowDown' })

		expect(focused()).toEqual({ row: anna, column: name })
		expect(document.activeElement).toBe(at(0, 1))

		key(at(0, 1), { key: 'ArrowRight' })

		expect(focused()).toEqual({ row: anna, column: age })

		key(at(0, 2), { key: 'Home' })

		expect(focused()).toEqual({ row: anna, column: 'select' })

		key(at(0, 0), { key: 'End' })
		key(at(0, 2), { key: 'PageDown' })

		expect(focused()).toEqual({ row: vera, column: age })

		key(at(2, 2), { key: 'Home', ctrlKey: true })

		expect(focused()).toEqual({ row: 'head', column: 'select' })
		expect(document.activeElement).toBe(at(-1, 0))

		key(at(-1, 0), { key: 'End', ctrlKey: true })

		expect(focused()).toEqual({ row: vera, column: age })
	})

	it('RTL: → — к началу строки', async () => {
		const { at, key, focused, name } = await mount('multiple', 'rtl')

		at(-1, 2).focus()
		key(at(-1, 2), { key: 'ArrowRight' })

		expect(focused()).toEqual({ row: 'head', column: name })
	})

	it('пробел на строке — её выбор; на ячейке выбора шапки — все показанные', async () => {
		const { engine, at, key, anna, boris, vera } = await mount()
		const selected = () => engine.extensions.selection.selected

		const space = key(at(1, 1), { key: ' ' })

		expect(space.defaultPrevented).toBe(true)
		expect(selected()).toEqual([boris])

		key(at(1, 2), { key: ' ', shiftKey: true })

		expect(selected()).toEqual([])

		key(at(-1, 0), { key: ' ' })

		expect(selected()).toEqual([anna, boris, vera])

		key(at(-1, 0), { key: ' ' })

		expect(selected()).toEqual([])
	})

	it('Ctrl+A в multiple — выбрать все показанные', async () => {
		const multiple = await mount()

		multiple.key(multiple.at(0, 1), { key: 'a', code: 'KeyA', ctrlKey: true })

		expect(multiple.engine.extensions.selection.selected).toHaveLength(3)
	})

	it('Enter на заголовке сортируемой колонки — сортировка', async () => {
		const { engine, at, key } = await mount()

		key(at(-1, 2), { key: 'Enter' })

		expect(engine.extensions.sort.sort).toEqual([{ field: 'age', direction: 'asc' }])
	})

	it('Enter и F2 — внутрь ячейки; там Escape и F2 — обратно, Tab — по кругу ячейки', async () => {
		const { at, key, slotButton } = await mount()
		const ageCell = at(0, 2)

		ageCell.focus()
		key(ageCell, { key: 'Enter' })

		expect(document.activeElement).toBe(slotButton)

		// Остановка в ячейке одна — Tab оставляет фокус на ней, из сетки не уводит
		expect(key(slotButton, { key: 'Tab' }).defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(slotButton)

		key(slotButton, { key: 'Escape' })

		expect(document.activeElement).toBe(ageCell)

		key(ageCell, { key: 'F2' })

		expect(document.activeElement).toBe(slotButton)

		key(slotButton, { key: 'F2' })

		expect(document.activeElement).toBe(ageCell)
	})

	it('клавиши виджета в ячейке — его: стрелки сетку не двигают', async () => {
		const { at, key, slotButton, focused, anna, age } = await mount()

		at(0, 2).focus()
		key(at(0, 2), { key: 'Enter' })

		const arrow = key(slotButton, { key: 'ArrowDown' })

		expect(arrow.defaultPrevented).toBe(false)
		expect(focused()).toEqual({ row: anna, column: age })
	})

	it('Ctrl+Shift+стрелка — не клавиша сетки', async () => {
		const { at, key, focused } = await mount()
		const before = focused()

		const event = key(at(-1, 1), { key: 'ArrowRight', ctrlKey: true, shiftKey: true })

		expect(event.defaultPrevented).toBe(false)
		expect(focused()).toBe(before)
	})
})

describe('нажатие', () => {
	it('по строке — её выбор; по контролу в ячейке — нет', async () => {
		const { engine, at, slotButton, anna, boris } = await mount()

		at(1, 1).click()

		expect(engine.extensions.selection.selected).toEqual([boris])

		slotButton.click()

		expect(engine.extensions.selection.selected).toEqual([boris])

		at(0, 1).click()

		expect(engine.extensions.selection.selected).toEqual([boris, anna])
	})

	it('вне сетки нажатие строку не выбирает', async () => {
		const { engine, grid, at } = await mount()

		grid.grid = false
		at(1, 1).click()

		expect(engine.extensions.selection.selected).toEqual([])
	})
})
