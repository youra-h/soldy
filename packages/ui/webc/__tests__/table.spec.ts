/**
 * Table под Web Components — проводка на настоящей разметке.
 *
 * Модель — колонки, ячейки, сортировку, счёт выбора и чекбоксы колонки выбора
 * — проверяет ядро (`core/__tests__/table*.spec.ts`), раскладку и вид —
 * браузер (`playground/vue/browser/table.spec.ts`). Здесь, как у Vue, React,
 * Solid и Svelte (`ui/react/__tests__/table.spec.tsx` и соседи), важно, что
 * выходы коллекции доезжают туда, куда должны: колонки — в заголовки, строки —
 * в `tbody` в порядке сортировки, ячейки — в строки, а нажатия по кнопкам
 * сортировки и чекбоксам доходят до модели и возвращаются в разметку — и
 * тогда, когда модель выбор отменила. StrictMode у Web Components нет, сервера
 * тоже.
 *
 * Своё у Web Components — разметка. Элемент таблицы — окно
 * (`<div is="so-table">`, класс `so-table__viewport`), внешний узел компонента,
 * а корень — `table` внутри, его строит шаблон: атрибуты потребителя и скрытие
 * — окну, классы, наборы и `TElementPlugin` — `table`. Заголовки и строки —
 * элементы частей (`<th is="so-table-column">`, `<tr is="so-table-row">`),
 * их рисует таблица петлями по ключу. Scope у слотов нет: `header` и `cell` —
 * образцы (`<template slot="cell">`), копию которых получает каждый заголовок и
 * каждая ячейка, а данные копия находит у элементов — колонку у заголовка
 * (`el.ctrl`), строку у строки, колонку ячейки — по её месту среди ячеек
 * колонок строки в показанных колонках таблицы. «Перерисовка ячеек» — узлы
 * ячеек и копий образца: выбор их не трогает, смена записи перестраивает
 * копии только своей строки. Отрисовка — микрозадачей после смены ядра,
 * слушатели плагинов — кадром позже.
 */

import { describe, it, expect, expectTypeOf, afterEach } from 'vitest'
import { TTable, createEngineTable } from '@soldy-ui/core'
import type {
	ITableColumn,
	ITableRow,
	TSelectionMode,
	TTableCollection,
	TTableColumnFit,
	TTableColumnSource,
	TTableRecord,
	TTableReorderPreview,
} from '@soldy-ui/core'
import { enUS, ruRU } from '@soldy-ui/plugins'
import { TableColumnDescriptor, TableDescriptor, TableRowDescriptor } from '@soldy-ui/setup'
import {
	TLocaleProviderElement,
	TTableColumnElement,
	TTableElement,
	TTableRowElement,
	TVirtualElement,
	type ITemplate,
	type TTableColumnElementProps,
	type TTableElementProps,
	type TTableRowElementProps,
} from '@soldy-ui/webc'
import { tableTemplate } from '../src/components/table/table.template'
import { tableColumnTemplate } from '../src/components/table/column/table-column.template'
import { tableRowTemplate } from '../src/components/table/row/table-row.template'
import { bareContext } from './template-context'

/** Отрисовка коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/**
 * Отрисовка цепочкой: смена в ядре перерисовывает таблицу, а та строит и
 * переставляет строки и заголовки, у которых своя отрисовка, — каждая своей
 * микрозадачей.
 */
async function settle(): Promise<void> {
	for (let turn = 0; turn < 4; turn++) await flush()
}

/** `TElementPlugin` объявляет узел через кадр — после него встают слушатели плагинов. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

afterEach(() => {
	document.body.innerHTML = ''
})

function isTable(node: Element | null): node is TTableElementProps {
	return node instanceof TTableElement
}

function isColumn(node: Element | null): node is TTableColumnElementProps {
	return node instanceof TTableColumnElement
}

function isRow(node: Element | null): node is TTableRowElementProps {
	return node instanceof TTableRowElement
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string, root: ParentNode = document): HTMLElement {
	const element = root.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

function findAll(selector: string, root: ParentNode = document): HTMLElement[] {
	return [...root.querySelectorAll(selector)].filter(
		(node): node is HTMLElement => node instanceof HTMLElement,
	)
}

/** Поле чекбокса по селектору его ячейки. */
function checkBoxInput(selector: string, root: ParentNode = document): HTMLInputElement {
	const input = find(selector, root).querySelector('input')

	if (!(input instanceof HTMLInputElement)) throw new Error(`${selector}: поля чекбокса нет`)

	return input
}

/** Клик — как его шлёт браузер — и отрисовка того, что он поменял. */
async function click(element: HTMLElement): Promise<void> {
	element.click()
	await settle()
}

/** Клавиша на узле — как её шлёт браузер: всплывает и отменяется. */
async function press(target: Element, key: string, modifiers: KeyboardEventInit = {}) {
	target.dispatchEvent(
		new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers }),
	)
	await settle()
}

/** Подробности событий элемента — в порядке прихода. */
function collect(target: EventTarget, name: string): unknown[] {
	const seen: unknown[] = []

	target.addEventListener(name, (event) => {
		if (event instanceof CustomEvent && event.target === target) seen.push(event.detail)
	})

	return seen
}

/** Одни и те же ли узлы — по месту в списке, а не по содержимому. */
const same = (left: readonly Node[], right: readonly Node[]) =>
	left.length === right.length && left.every((node, index) => node === right[index])

const text = (element: Element) => element.textContent?.trim()

const ANNA = { id: 1, name: 'Анна', age: 30 }
const BORIS = { id: 2, name: 'Борис', age: 41 }
const VERA = { id: 3, name: 'Вера', age: 25 }

const NAME: TTableColumnSource = { field: 'name', text: 'Имя', rowHeader: true }
const AGE: TTableColumnSource = { field: 'age', text: 'Возраст', align: 'end', sortable: true }

/** Ключ записи — её `id`. */
function idOf(data: TTableRecord | undefined): unknown {
	return data && 'id' in data ? data.id : undefined
}

/**
 * Движок строк снаружи — с записями, колонками и режимом выбора: на его выбор
 * подписывается тест, когда отменяет выбор.
 */
function engineOf(
	mode: TSelectionMode = 'multiple',
	records: readonly TTableRecord[] = [ANNA, BORIS, VERA],
	columns: readonly TTableColumnSource[] = [NAME, AGE],
): TTableCollection {
	const engine = createEngineTable({ items: records.map((data) => ({ data })) })

	engine.extensions.batch.trackBy = (row) => idOf(row.data)
	engine.extensions.columns.columns = columns
	engine.extensions.selection.mode = mode

	return engine
}

/** Строка коллекции по ключу записи. */
function rowOf(engine: TTableCollection, id: number): ITableRow {
	const found = engine.extensions.batch.items.find((row) => idOf(row.data) === id)

	if (!found) throw new Error(`строки ${id} нет`)

	return found
}

/** Колонка коллекции по полю. */
function columnOf(engine: TTableCollection, field: string): ITableColumn {
	const found = engine.extensions.columns.columns.find((column) => column.field === field)

	if (!found) throw new Error(`колонки ${field} нет`)

	return found
}

/**
 * Таблица кодом: пропсы свойствами и свет — до вставки, в `parent` (по
 * умолчанию — документ). Ждёт отрисовку и кадр: слушатели плагинов встают по
 * `ready`.
 */
async function mountTable(
	props: Record<string, unknown>,
	light = '',
	parent: ParentNode = document.body,
): Promise<TTableElementProps> {
	const el = document.createElement('div', { is: 'so-table' })

	if (!isTable(el)) throw new Error('<div is="so-table"> нет')

	for (const [name, value] of Object.entries(props)) Reflect.set(el, name, value)

	el.innerHTML = light
	parent.appendChild(el)
	await settle()
	await nextFrame()

	return el
}

/** Таблица из записей и колонок: строки и колонки данными. */
const fromData = (records: readonly TTableRecord[], columns: readonly TTableColumnSource[]) => ({
	items: records.map((data) => ({ data })),
	columns,
})

/** Строки `tbody` — по тексту ячейки заголовка. */
const rowNames = () => findAll('.so-table-row').map((row) => text(find('th', row)))

/** Отметка выбора строк. */
const rowsSelected = () => findAll('.so-table-row').map((row) => row.dataset.selected)

/** Отметки чекбоксов строк. */
const rowsChecked = () =>
	findAll('.so-table-row').map((row) => checkBoxInput('.so-table-row__select', row).checked)

describe('разметка', () => {
	it('шапка — показанные колонки, тело — строки, в строке — ячейки по колонкам', async () => {
		await mountTable(fromData([ANNA, BORIS], [NAME, AGE]))

		const table = find('table.so-table')

		expect(findAll('.so-table__head-row > th', table).map(text)).toEqual(['Имя', 'Возраст'])
		expect(findAll('.so-table-row').map((row) => [...row.children].map(text))).toEqual([
			['Анна', '30'],
			['Борис', '41'],
		])
		// Колонки выбора нет: режим по умолчанию — `none`
		expect(findAll('.so-table__select, .so-table-row__select')).toEqual([])
	})

	it('заголовок колонки — th с набором колонки и шириной переменной', async () => {
		await mountTable(fromData([ANNA], [NAME, { ...AGE, width: 120 }]))

		const [name, age] = findAll('.so-table-column')

		expect(age.tagName).toBe('TH')
		expect(age.dataset.align).toBe('end')
		expect(age.style.getPropertyValue('--so-table-column-width')).toBe('120px')
		expect(name.style.getPropertyValue('--so-table-column-width')).toBe('')
	})

	it('ячейка колонки rowHeader — th scope="row" с id, остальные — td', async () => {
		await mountTable(fromData([ANNA], [AGE, NAME]))

		const [age, name] = [...find('.so-table-row').children]

		expect(age.tagName).toBe('TD')
		expect(age.getAttribute('data-align')).toBe('end')
		expect(name.tagName).toBe('TH')
		expect(name.getAttribute('scope')).toBe('row')
		expect(name.id).not.toBe('')
	})

	/**
	 * Части рисует таблица, а регистрирует модуль таблицы: заголовок колонки —
	 * `<th is="so-table-column">`, строка — `<tr is="so-table-row">`, элементы
	 * частей над экземплярами колонки и строки.
	 */
	it('заголовки и строки — элементы частей над экземплярами колонки и строки', async () => {
		const engine = engineOf('none', [ANNA])

		await mountTable({ engine })

		const headers = findAll('.so-table-column')
		const [row] = findAll('.so-table-row')

		expect(customElements.get('so-table-column')).toBe(TTableColumnElement)
		expect(customElements.get('so-table-row')).toBe(TTableRowElement)
		expect(headers.every(isColumn)).toBe(true)
		expect(headers.filter(isColumn).map((header) => header.ctrl)).toEqual(
			engine.extensions.columns.shownColumns,
		)
		expect(isRow(row) ? row.ctrl : undefined).toBe(rowOf(engine, 1))
		// Элементы своей коллекции, а не детали: признака места у них нет
		expect([...headers, row].some((node) => node.hasAttribute('embedded'))).toBe(false)
	})

	it('окно вокруг таблицы: корень, классы и наборы — у table, а не у окна', async () => {
		const el = await mountTable({
			...fromData([ANNA], [NAME]),
			stickyHead: true,
			aria_label: 'Сотрудники',
		})

		const table = find('table.so-table')

		expect(table.parentElement).toBe(el)
		expect(el.tagName).toBe('DIV')
		expect(el.classList.contains('so-table__viewport')).toBe(true)
		expect(table.dataset.stickyHead).toBe('true')
		expect(table.getAttribute('aria-label')).toBe('Сотрудники')
		// У окна — только свой класс: ни классов ядра, ни наборов, ни имени
		expect(el.className).toBe('so-table__viewport')
		expect(el.getAttributeNames().filter((name) => name !== 'is' && name !== 'class')).toEqual(
			[],
		)
	})

	/** Тег корня ядру — `table`, а не тег элемента: корень — узел шаблона. */
	it('корень для ядра и плагинов — table: тег и узел TElementPlugin', async () => {
		const el = document.createElement('div', { is: 'so-table' })

		if (!isTable(el)) throw new Error('<div is="so-table"> нет')

		const ready = collect(el, 'so:element:ready')

		el.items = [{ data: ANNA }]
		el.columns = [NAME]
		document.body.appendChild(el)
		await nextFrame()

		expect(el.ctrl?.tag).toBe('table')
		expect(ready).toEqual([find('table.so-table')])
	})

	it('атрибуты потребителя — окну: оно внешний узел компонента', async () => {
		const host = document.createElement('div')

		host.innerHTML = `<div
			is="so-table"
			class="staff"
			style="max-height: 320px"
			data-testid="staff"
			columns='[{"field":"name","text":"Имя"}]'
			items='[{"data":{"id":1,"name":"Анна"}}]'
		></div>`
		document.body.appendChild(host)
		await settle()

		const viewport = find('.so-table__viewport')
		const table = find('table.so-table')

		expect(viewport.classList.contains('staff')).toBe(true)
		expect(viewport.dataset.testid).toBe('staff')
		expect(viewport.style.maxHeight).toBe('320px')
		expect(table.hasAttribute('data-testid')).toBe(false)
		expect(table.classList.contains('staff')).toBe(false)
		expect(table.hasAttribute('style')).toBe(false)
		// Колонки и строки — атрибутами, JSON
		expect(findAll('.so-table-row').map((row) => [...row.children].map(text))).toEqual([
			['Анна'],
		])
	})

	it('скрытая таблица прячет окно: скрытие — на окне', async () => {
		const el = await mountTable({ ...fromData([ANNA], [NAME]), visible: false })

		expect(el.style.display).toBe('none')
		expect(find('table.so-table').style.display).toBe('')

		el.visible = true
		await settle()

		expect(el.style.display).toBe('')
	})
})

/**
 * Ширины колонок без своей ширины раскладывает ядро по месту таблицы и её
 * `columnFit` (`core/__tests__/table-layout.spec.ts`), место мерит плагин
 * (`plugins/__tests__/table-layout.plugin.spec.ts`), раскладку в браузере —
 * `playground/vue/browser/table.spec.ts`. Здесь — что проп доходит до
 * таблицы, а ширины раскладки, `data-overflow` и `data-sized` — до разметки.
 */
describe('раскладка колонок', () => {
	/** Колонки заголовков — переменные ширины по порядку. */
	const widths = () =>
		findAll('.so-table-column').map((header) =>
			header.style.getPropertyValue('--so-table-column-width'),
		)

	it('columnFit none — ширины по умолчанию сразу, без места; признака места нет', async () => {
		await mountTable({ ...fromData([ANNA], [NAME, AGE]), columnFit: 'none' })

		expect(widths()).toEqual(['160px', '160px'])
		expect(findAll('.so-table-column').map((header) => header.dataset.sized)).toEqual([
			'true',
			'true',
		])
		expect(find('table.so-table').hasAttribute('data-overflow')).toBe(false)
		// Ширины известны и до места — таблица шириной в их сумму
		expect(find('table.so-table').dataset.sized).toBe('true')
	})

	it('по умолчанию auto — до места ширин нет, с местом — делят его', async () => {
		const engine = engineOf('none', [ANNA])

		await mountTable({ engine })

		expect(widths()).toEqual(['', ''])
		expect(find('table.so-table').hasAttribute('data-sized')).toBe(false)

		engine.extensions.columns.notifySpace(500)
		await settle()

		expect(widths()).toEqual(['250px', '250px'])
		expect(find('table.so-table').dataset.overflow).toBe('false')
		expect(find('table.so-table').dataset.sized).toBe('true')
	})

	it('смена columnFit свойством — новая раскладка; шире места — data-overflow', async () => {
		const engine = engineOf('none', [ANNA])
		const el = await mountTable({ engine, columnFit: 'none' })
		const fit = (value: TTableColumnFit) => {
			el.columnFit = value
		}

		engine.extensions.columns.notifySpace(600)
		await settle()

		expect(widths()).toEqual(['160px', '160px'])
		expect(find('table.so-table').dataset.overflow).toBe('false')

		fit('auto')
		await settle()

		expect(widths()).toEqual(['300px', '300px'])

		engine.extensions.columns.notifySpace(300)
		await settle()

		expect(widths()).toEqual(['160px', '160px'])
		expect(find('table.so-table').dataset.overflow).toBe('true')
	})
})

/**
 * Scope у слотов Web Components нет: `header` и `cell` — образцы, копию
 * которых получает каждый заголовок и каждая ячейка, а данные копия находит у
 * элементов. `empty` — точка слота: его содержимое стоит в ячейке пустой
 * строки, пока строк нет.
 */
describe('слоты', () => {
	it('header — копия образца в подписи каждого заголовка, и у сортируемого; кнопка — вне подписи', async () => {
		await mountTable(
			fromData([ANNA], [NAME, AGE]),
			'<template slot="header"><b class="probe">Своя</b></template>',
		)

		expect(findAll('.so-table-column__text').map((caption) => caption.innerHTML)).toEqual([
			'<b class="probe">Своя</b>',
			'<b class="probe">Своя</b>',
		])
		// Кнопку сортировки рисует колонка рядом с подписью, а не таблица в ней
		const button = find('.so-table-column__sort')

		expect(button.closest('.so-table-column__text')).toBeNull()
		expect(text(button)).toBe('')
		expect(document.querySelector('template')).toBeNull()
	})

	/**
	 * Колонку копия находит у заголовка: `el.ctrl` ближайшего
	 * `<th is="so-table-column">` — колонка, её поле, текст и сортируемость.
	 */
	it('копия header находит колонку у заголовка', async () => {
		await mountTable(
			fromData([ANNA], [NAME, AGE]),
			'<template slot="header"><b></b></template>',
		)

		const found = findAll('.so-table-column__text b').map((probe) => {
			const header = probe.closest('th')

			return isColumn(header) ? `${header.ctrl?.field}:${header.ctrl?.sortable}` : null
		})

		expect(found).toEqual(['name:false', 'age:true'])
	})

	/**
	 * Своё действие по заголовку — контрол в подписи: у `th` фокуса нет, и
	 * нажатие по ячейке ничего не делает. Нажатие по своему контролу
	 * сортировку не трогает.
	 */
	it('кнопка в образце header нажимается и не сортирует', async () => {
		const engine = engineOf('none')

		await mountTable(
			{ engine },
			'<template slot="header"><button type="button" class="menu">…</button></template>',
		)

		const age = findAll('.so-table-column')[1]
		const pressed: unknown[] = []

		find('button.menu', age).addEventListener('click', () => pressed.push('age'))
		await click(find('button.menu', age))

		expect(pressed).toEqual(['age'])
		expect(rowNames()).toEqual(['Анна', 'Борис', 'Вера'])
		expect(age.hasAttribute('aria-sort')).toBe(false)
		expect(engine.extensions.sort.sort).toEqual([])
	})

	it('cell — копия образца в каждой ячейке', async () => {
		await mountTable(
			fromData([ANNA, BORIS], [NAME, AGE]),
			'<template slot="cell"><i class="probe">*</i></template>',
		)

		expect(
			findAll('.so-table-row').map((row) =>
				findAll('.so-table-row__cell', row).map((cell) => cell.innerHTML),
			),
		).toEqual([
			['<i class="probe">*</i>', '<i class="probe">*</i>'],
			['<i class="probe">*</i>', '<i class="probe">*</i>'],
		])
		// Образец — не содержимое строки: у строки только ячейки
		expect(findAll('.so-table-row > .probe')).toEqual([])
	})

	/**
	 * Строку копия ячейки находит у строки — `el.ctrl` ближайшего
	 * `<tr is="so-table-row">`, — колонку — по месту ячейки: её номер среди
	 * ячеек колонок строки в показанных колонках таблицы, значение — поле
	 * записи под ключом колонки. Колонка выбора местам не мешает: её ячейка —
	 * не ячейка колонки.
	 */
	it('копия cell находит строку, колонку и значение', async () => {
		const el = await mountTable(
			{ ...fromData([ANNA, BORIS], [NAME, AGE]), mode: 'multiple' },
			'<template slot="cell"><i></i></template>',
		)

		const found = findAll('.so-table-row__cell i').map((probe) => {
			const cell = probe.closest('.so-table-row__cell')
			const row = cell ? cell.closest('tr') : null

			if (!cell || !isRow(row)) return null

			const place = findAll(':scope > .so-table-row__cell', row).indexOf(
				cell instanceof HTMLElement ? cell : row,
			)
			const column = el.state.shownColumns?.[place]
			const record = row.ctrl?.data
			const value: unknown = column && record ? Reflect.get(record, column.field) : undefined

			return `${String(idOf(record))}/${column?.field}/${String(value)}`
		})

		expect(found).toEqual(['1/name/Анна', '1/age/30', '2/name/Борис', '2/age/41'])
	})

	/** Пустой образец ничего не кладёт: ячейка рисует значение текстом. */
	it('пустой образец cell — в ячейке значение', async () => {
		await mountTable(fromData([ANNA], [NAME, AGE]), '<template slot="cell"> </template>')

		expect([...find('.so-table-row').children].map(text)).toEqual(['Анна', '30'])
	})

	/**
	 * Без образца значение — текстом ядра (`text` ячейки): `textContent`
	 * нарисовал бы объект как `[object Object]`, а `null` — словом. Цикл JSON
	 * не пишет, и ядро отдаёт тег объекта.
	 */
	it('без cell значение — текстом: число, булево, пусто, объект, цикл', async () => {
		const FLAG: TTableColumnSource = { field: 'flag', text: 'Флаг' }
		const NOTE: TTableColumnSource = { field: 'note', text: 'Заметка' }
		const TAGS: TTableColumnSource = { field: 'tags', text: 'Теги' }
		const LOOP: TTableColumnSource = { field: 'loop', text: 'Цикл' }
		const loop: Record<string, unknown> = {}

		loop.self = loop

		await mountTable({
			items: [
				{
					data: {
						id: 1,
						name: 'Анна',
						age: 30,
						flag: true,
						note: null,
						tags: ['a'],
						loop,
					},
				},
			],
			columns: [NAME, AGE, FLAG, NOTE, TAGS, LOOP],
		})

		expect([...find('.so-table-row').children].map((cell) => cell.textContent)).toEqual([
			'Анна',
			'30',
			'true',
			'',
			'[\n  "a"\n]',
			'[object Object]',
		])
	})

	it('empty — пока строк нет, ячейка во всю ширину строки', async () => {
		await mountTable(
			{ columns: [NAME, AGE], mode: 'multiple' },
			'<p slot="empty" class="probe">Нет данных</p>',
		)

		const cell = find('.so-table__empty')

		expect(text(cell)).toBe('Нет данных')
		expect(find('.probe').parentElement).toBe(cell)
		// Две колонки и колонка выбора
		expect(cell.getAttribute('colspan')).toBe('3')
	})

	it('строки появились — пустой строки нет, её содержимое вне документа', async () => {
		const el = await mountTable(
			{ columns: [NAME] },
			'<p slot="empty" class="probe">Нет данных</p>',
		)

		expect(findAll('.so-table__empty-row')).toHaveLength(1)

		el.items = [{ data: ANNA }]
		await settle()

		expect(findAll('.so-table__empty-row')).toEqual([])
		expect(document.querySelector('.probe')).toBeNull()

		el.items = []
		await settle()

		expect(text(find('.so-table__empty'))).toBe('Нет данных')
	})
})

describe('сортировка', () => {
	it('кнопка заголовка сортирует строки: по возрастанию, по убыванию, снята', async () => {
		await mountTable({ engine: engineOf('none') })

		const age = findAll('.so-table-column')[1]
		const button = find('.so-table-column__sort', age)

		expect(rowNames()).toEqual(['Анна', 'Борис', 'Вера'])

		await click(button)

		expect(rowNames()).toEqual(['Вера', 'Анна', 'Борис'])
		expect(age.getAttribute('aria-sort')).toBe('ascending')
		expect(age.dataset.sort).toBe('asc')

		await click(button)

		expect(rowNames()).toEqual(['Борис', 'Анна', 'Вера'])
		expect(age.getAttribute('aria-sort')).toBe('descending')

		await click(button)

		expect(rowNames()).toEqual(['Анна', 'Борис', 'Вера'])
		expect(age.hasAttribute('aria-sort')).toBe(false)
	})

	it('подпись — у всех колонок, кнопка — только у сортируемой и рядом с подписью; стрелка скрыта от скринридера', async () => {
		await mountTable({ engine: engineOf('none') })

		const [name, age] = findAll('.so-table-column')

		expect(findAll('.so-table-column__sort', name)).toEqual([])
		expect(text(find('.so-table-column__text', name))).toBe('Имя')
		expect(text(find('.so-table-column__text', age))).toBe('Возраст')

		const button = find('.so-table-column__sort', age)

		// Подпись и кнопка — соседи в ряду содержимого заголовка
		expect(button.parentElement).toBe(find('.so-table-column__content', age))
		expect(button.closest('.so-table-column__text')).toBeNull()
		expect(button.getAttribute('type')).toBe('button')
		expect(button.getAttribute('embedded')).toBe('table.sort')
		expect(find('.so-table-column__sort-icon', age).getAttribute('aria-hidden')).toBe('true')
		// Обёртка стрелки — в области текста кнопки: там её ищет тема
		expect(find('.so-table-column__sort-icon', age).parentElement?.className).toBe(
			'so-button__text',
		)
		expect(age.querySelector('.so-table-column__sort-icon .so-icon svg')).not.toBeNull()
		expect(find('.so-table-column__sort-icon .so-icon', age).getAttribute('icon')).toBe(
			'arrowUpward',
		)
	})

	/**
	 * Заголовок назван подписью, кнопка — своим именем от локали: имя кнопки в
	 * имя заголовка не входит, и подписи заголовка в ссылке кнопки нет.
	 */
	it('имя кнопки — «Sort by …» от локали, имя заголовка — только подпись', async () => {
		await mountTable({ engine: engineOf('none') })

		const age = findAll('.so-table-column')[1]
		const button = find('.so-table-column__sort', age)
		const caption = find('.so-table-column__text', age)

		expect(button.getAttribute('aria-label')).toBe('Sort by Возраст')
		expect(button.hasAttribute('aria-labelledby')).toBe(false)
		expect(age.getAttribute('aria-labelledby')).toBe(caption.id)
		expect(caption.contains(button)).toBe(false)
	})

	it('смена локали — новое имя кнопки на той же кнопке, без пересборки', async () => {
		const provider = new TLocaleProviderElement()

		provider.locale = enUS
		document.body.appendChild(provider)
		await mountTable({ engine: engineOf('none') }, '', provider)

		const button = find('.so-table-column__sort')

		expect(button.getAttribute('aria-label')).toBe('Sort by Возраст')

		provider.locale = ruRU
		await settle()

		expect(find('.so-table-column__sort')).toBe(button)
		expect(button.getAttribute('aria-label')).toBe('Сортировать по столбцу Возраст')
	})

	it('нажатие по подписи и по ячейке заголовка не сортирует', async () => {
		const engine = engineOf('none')

		await mountTable({ engine })

		const age = findAll('.so-table-column')[1]

		await click(find('.so-table-column__text', age))
		await click(age)

		expect(rowNames()).toEqual(['Анна', 'Борис', 'Вера'])
		expect(age.hasAttribute('aria-sort')).toBe(false)
		expect(engine.extensions.sort.sort).toEqual([])
	})

	it('выключенная таблица — кнопка выключена, порядок прежний', async () => {
		await mountTable({ engine: engineOf('none'), disabled: true })

		const button = find('.so-table-column__sort')

		expect(button.hasAttribute('disabled')).toBe(true)

		await click(button)

		expect(rowNames()).toEqual(['Анна', 'Борис', 'Вера'])
	})
})

describe('колонка выбора', () => {
	it('multiple — заголовок с чекбоксом «выбрать все», single — пустая ячейка, у строк — чекбоксы', async () => {
		const multiple = await mountTable({ engine: engineOf('multiple') })

		const head = find('.so-table__select')

		expect(head.tagName).toBe('TH')
		expect(findAll('.so-check-box', head)).toHaveLength(1)
		expect(find('.so-check-box', head).getAttribute('embedded')).toBe('table.select-all')
		expect(findAll('.so-table-row__select .so-check-box')).toHaveLength(3)
		expect(
			findAll('.so-table-row__select .so-check-box').map((box) =>
				box.getAttribute('embedded'),
			),
		).toEqual(['table.select', 'table.select', 'table.select'])
		// Ячейка выбора — первой в строке шапки и в каждой строке
		expect(find('.so-table__head-row').firstElementChild).toBe(head)
		expect(
			findAll('.so-table-row').every(
				(row) => row.firstElementChild?.className === 'so-table-row__select',
			),
		).toBe(true)

		multiple.remove()
		await mountTable({ engine: engineOf('single') })

		const single = find('.so-table__select')

		expect(single.tagName).toBe('TD')
		expect(single.children).toHaveLength(0)
		expect(findAll('.so-table-row__select .so-check-box')).toHaveLength(3)
	})

	it('колонка появляется и уходит вместе с режимом', async () => {
		const engine = engineOf('none')

		await mountTable({ engine })

		expect(findAll('.so-table__select, .so-table-row__select')).toEqual([])

		engine.extensions.selection.mode = 'multiple'
		await settle()

		expect(findAll('.so-table-row__select')).toHaveLength(3)
		expect(findAll('.so-table__select')).toHaveLength(1)

		engine.extensions.selection.mode = 'none'
		await settle()

		expect(findAll('.so-table__select, .so-table-row__select')).toEqual([])
	})

	it('клик по чекбоксу строки выбирает строку, повторный — снимает', async () => {
		const engine = engineOf('multiple')

		await mountTable({ engine })

		const anna = find('.so-table-row')
		const input = checkBoxInput('.so-table-row__select', anna)

		await click(input)

		expect(engine.extensions.selection.selected).toEqual([rowOf(engine, 1)])
		expect(input.checked).toBe(true)
		expect(anna.dataset.selected).toBe('true')

		await click(input)

		expect(engine.extensions.selection.selected).toEqual([])
		expect(input.checked).toBe(false)
		expect(anna.dataset.selected).toBe('false')
	})

	it('строки, выбранные по одной до всех, выбора не теряют; шапка — «часть», потом отмечена', async () => {
		const engine = engineOf('multiple')

		await mountTable({ engine })

		const head = checkBoxInput('.so-table__select')
		const inputs = findAll('.so-table-row').map((row) =>
			checkBoxInput('.so-table-row__select', row),
		)

		await click(inputs[0])

		expect([head.checked, head.indeterminate]).toEqual([false, true])

		await click(inputs[1])
		await click(inputs[2])

		expect(engine.extensions.selection.selected).toHaveLength(3)
		expect(inputs.map((input) => input.checked)).toEqual([true, true, true])
		expect([head.checked, head.indeterminate]).toEqual([true, false])
	})

	it('чекбокс шапки: «часть» → все → ни одной', async () => {
		const engine = engineOf('multiple')

		engine.extensions.selection.select(rowOf(engine, 2))

		await mountTable({ engine })

		const head = checkBoxInput('.so-table__select')

		expect([head.checked, head.indeterminate]).toEqual([false, true])

		await click(head)

		expect(engine.extensions.selection.selected).toHaveLength(3)
		expect([head.checked, head.indeterminate]).toEqual([true, false])
		expect(rowsChecked()).toEqual([true, true, true])

		await click(head)

		expect(engine.extensions.selection.selected).toEqual([])
		expect([head.checked, head.indeterminate]).toEqual([false, false])
		expect(rowsChecked()).toEqual([false, false, false])
	})

	it('выбор снаружи доезжает до чекбоксов', async () => {
		const engine = engineOf('multiple')

		await mountTable({ engine })

		engine.extensions.selection.select(rowOf(engine, 3))
		await settle()

		const vera = findAll('.so-table-row')[2]

		expect(checkBoxInput('.so-table-row__select', vera).checked).toBe(true)
		expect(checkBoxInput('.so-table__select').indeterminate).toBe(true)
	})

	it('пустая таблица и выключенные строки — чекбокс шапки выключен', async () => {
		const engine = engineOf('multiple', [])

		await mountTable({ engine })

		expect(checkBoxInput('.so-table__select').disabled).toBe(true)

		engine.extensions.batch.items = [{ data: { ...ANNA } }]
		await settle()

		expect(checkBoxInput('.so-table__select').disabled).toBe(false)

		rowOf(engine, 1).disabled = true
		await settle()

		expect(checkBoxInput('.so-table__select').disabled).toBe(true)
		expect(checkBoxInput('.so-table-row__select').disabled).toBe(true)
	})

	it('чекбоксы — размера и варианта таблицы', async () => {
		const owner = new TTable({ size: 'lg' })

		await mountTable({ ctrl: owner, engine: engineOf('multiple') })

		expect(find('.so-table__select .so-check-box').classList).toContain('so-check-box--size-lg')
		expect(find('.so-table-row__select .so-check-box').classList).toContain(
			'so-check-box--size-lg',
		)
	})
})

describe('имена чекбоксов', () => {
	it('чекбокс строки называет заголовок строки — ячейка колонки rowHeader', async () => {
		await mountTable({ engine: engineOf('multiple') })

		const anna = find('.so-table-row')
		const input = checkBoxInput('.so-table-row__select', anna)
		const header = find('th[scope="row"]', anna)

		expect(input.getAttribute('aria-labelledby')).toBe(header.id)
		expect(text(header)).toBe('Анна')

		// У каждой строки — свой заголовок
		const ids = findAll('th[scope="row"]').map((cell) => cell.id)

		expect(new Set(ids).size).toBe(3)
	})

	it('без колонки rowHeader у чекбокса строки ссылки нет', async () => {
		await mountTable({
			engine: engineOf('multiple', [ANNA], [{ ...NAME, rowHeader: false }, AGE]),
		})

		expect(checkBoxInput('.so-table-row__select').hasAttribute('aria-labelledby')).toBe(false)
		expect(findAll('th[scope="row"]')).toEqual([])
	})

	it('чекбокс шапки — имя от локали поддерева, на лету', async () => {
		const provider = new TLocaleProviderElement()

		provider.locale = enUS
		document.body.appendChild(provider)
		await mountTable({ engine: engineOf('multiple') }, '', provider)

		expect(checkBoxInput('.so-table__select').getAttribute('aria-label')).toBe('Select all')

		provider.locale = ruRU
		await settle()

		expect(checkBoxInput('.so-table__select').getAttribute('aria-label')).toBe('Выбрать все')
	})
})

/**
 * Ручка ширины — полоса с полем у края заголовка. Какой станет ширина, решает
 * ядро (`core/__tests__/table-columns.spec.ts`), указатель и клавиши ведёт
 * плагин (`plugins/__tests__/table-column-resize.plugin.spec.ts`), протяжку в
 * настоящей раскладке — браузер (`playground/vue/browser/table.spec.ts`).
 * Здесь — что полоса рисуется, когда она есть, имена доходят до разметки, а
 * ширина — до заголовка, до поля и наружу событием таблицы.
 */
describe('ручка ширины', () => {
	const RESIZABLE: TTableColumnSource = { ...NAME, resizable: true, width: 150 }

	/** Поле ручки в заголовке. */
	function resizerField(root: ParentNode = document): HTMLInputElement {
		const field = find('.so-table-column__resizer', root).querySelector('input')

		if (!(field instanceof HTMLInputElement)) throw new Error('поля ручки нет')

		return field
	}

	/**
	 * Ширина 150 вне хода поля по умолчанию (0–100): границы хода поле получает
	 * раньше значения, иначе ширина прижалась бы к 100.
	 */
	it('полоса с полем — у колонки resizable: ход и ширина колонки; у остальных её нет', async () => {
		await mountTable(fromData([ANNA], [{ ...RESIZABLE, minWidth: 100, maxWidth: 300 }, AGE]))

		const [name, age] = findAll('.so-table-column')
		const field = resizerField(name)

		expect(field.type).toBe('range')
		expect([field.min, field.max, field.value]).toEqual(['100', '300', '150'])
		// Полоса — ребёнок заголовка: там её ищет плагин ручки
		expect(field.parentElement?.parentElement).toBe(name)
		expect(findAll('.so-table-column__resizer', age)).toEqual([])
	})

	it('колонка без своей ширины — полоса появляется с местом таблицы, ширина — раскладки', async () => {
		const engine = engineOf('none', [ANNA], [{ ...NAME, resizable: true }])

		await mountTable({ engine })

		// Места нет — ширину решает тема, и ручке нечего показать
		expect(findAll('.so-table-column__resizer')).toEqual([])

		engine.extensions.columns.notifySpace(180)
		await settle()

		expect(resizerField().value).toBe('180')
		expect(find('.so-table-column').style.getPropertyValue('--so-table-column-width')).toBe(
			'180px',
		)
		// Ширина раскладки — не своя: колонка остаётся гибкой
		expect(columnOf(engine, 'name').getProps().width).toBeUndefined()
	})

	it('у выключенной таблицы ручек нет', async () => {
		await mountTable({ ...fromData([ANNA], [RESIZABLE]), disabled: true })

		expect(findAll('.so-table-column__resizer')).toEqual([])
	})

	it('заголовок и поле названы подписью — ровно текст колонки', async () => {
		await mountTable(fromData([ANNA], [RESIZABLE, AGE]))

		for (const header of findAll('.so-table-column')) {
			const caption = find('.so-table-column__text', header)

			expect(caption.id).not.toBe('')
			expect(header.getAttribute('aria-labelledby')).toBe(caption.id)
		}

		const name = findAll('.so-table-column')[0]

		expect(resizerField(name).getAttribute('aria-labelledby')).toBe(
			find('.so-table-column__text', name).id,
		)
		expect(text(find('.so-table-column__text', name))).toBe('Имя')
	})

	it('клавиша на поле — ширина заголовка, поле и so:column:resize таблицы', async () => {
		const engine = engineOf('none', [ANNA], [RESIZABLE])
		const el = await mountTable({ engine })
		const resizes = collect(el, 'so:column:resize')

		const header = find('.so-table-column')
		const field = resizerField()

		await press(field, 'ArrowRight')

		expect(header.style.getPropertyValue('--so-table-column-width')).toBe('160px')
		expect(header.dataset.sized).toBe('true')
		expect(resizerField()).toBe(field)
		expect(field.value).toBe('160')
		expect(resizes).toEqual([{ column: columnOf(engine, 'name'), width: 160 }])
	})

	it('ширина из кода — в поле, тот же узел', async () => {
		const engine = engineOf('none', [ANNA], [RESIZABLE])

		await mountTable({ engine })

		const field = resizerField()

		columnOf(engine, 'name').width = 200
		await settle()

		expect(resizerField()).toBe(field)
		expect(field.value).toBe('200')
	})
})

/**
 * Перестановку ведёт плагин таблицы, место колонки — расширение коллекции.
 * Здесь — что плагин стоит на корне таблицы и находит её заголовки, а
 * перестановка доезжает до шапки и ячеек строк и уходит наружу
 * `so:column:move`. Протяжку указателем — `playground/vue/browser/table.spec.ts`.
 */
describe('перестановка колонок', () => {
	const MOVABLE: readonly TTableColumnSource[] = [
		{ ...NAME, reorderable: true },
		{ ...AGE, reorderable: true },
	]

	it('data-reorderable — на заголовке колонки', async () => {
		await mountTable(fromData([ANNA], [MOVABLE[0], AGE]))

		const [name, age] = findAll('.so-table-column')

		expect(name.dataset.reorderable).toBe('true')
		expect(age.dataset.reorderable).toBe('false')
	})

	/**
	 * Заголовки и ячейки — петлями по ключу колонки: переставленные — те же
	 * узлы, их едет перенос силами базы, и не пересобираются.
	 */
	it('Ctrl+Shift+← на кнопке сортировки — шапка и ячейки в новом порядке, so:column:move', async () => {
		const engine = engineOf('none', [ANNA], [...MOVABLE])
		const el = await mountTable({ engine })
		const moves = collect(el, 'so:column:move')
		const headers = findAll('.so-table-column')
		const cells = findAll('.so-table-row__cell')

		await press(find('.so-table-column__sort'), 'ArrowLeft', { ctrlKey: true, shiftKey: true })
		await nextFrame()
		await settle()

		expect(findAll('.so-table-column').map(text)).toEqual(['Возраст', 'Имя'])
		expect(findAll('.so-table-row__cell').map(text)).toEqual(['30', 'Анна'])
		expect(same(findAll('.so-table-column'), [...headers].reverse())).toBe(true)
		expect(same(findAll('.so-table-row__cell'), [...cells].reverse())).toBe(true)
		expect(moves).toHaveLength(1)
		expect(moves[0]).toMatchObject({ order: ['age', 'name'] })
	})

	/**
	 * Признак тела — `data-reorder-preview` — ставит корню расширение колонок,
	 * и только на время жеста в `column`: на покое его нет ни в одном режиме, и
	 * правила тела темы ячейкам ничего не стоят.
	 */
	it('data-reorder-preview — только в жесте column: на покое и в head его нет', async () => {
		const engine = engineOf('none', [ANNA], [...MOVABLE])
		const { columns } = engine.extensions
		const el = await mountTable({ engine, reorderPreview: 'head' })
		const preview = (value: TTableReorderPreview) => {
			el.reorderPreview = value
		}

		const table = find('table.so-table')
		const [name] = columns.columns

		expect(table.hasAttribute('data-reorder-preview')).toBe(false)

		// head — нет и в жесте
		columns.dragStart(name)
		await settle()

		expect(table.hasAttribute('data-reorder-preview')).toBe(false)

		columns.dragCancel()
		preview('column')
		await settle()

		expect(table.hasAttribute('data-reorder-preview')).toBe(false)

		columns.dragStart(name)
		columns.dragOver(1)
		columns.dragDrop()
		await settle()

		expect(table.dataset.reorderPreview).toBe('column')

		// Встала — признак ушёл той же отрисовкой, что и перестановка
		columns.dragEnd()
		await settle()

		expect(findAll('.so-table-column').map(text)).toEqual(['Возраст', 'Имя'])
		expect(table.hasAttribute('data-reorder-preview')).toBe(false)
	})

	/**
	 * Метки жеста пишет расширение колонок, рисует их тема; здесь — что они
	 * доезжают до заголовков и уходят вместе с перестановкой.
	 */
	it('метки жеста — на заголовках: data-shift, data-landing; встала — меток нет', async () => {
		const ID: TTableColumnSource = { field: 'id', text: '№', reorderable: true }
		const engine = engineOf('none', [ANNA], [...MOVABLE, ID])
		const { columns } = engine.extensions
		const gesture = (header: HTMLElement) =>
			['dragging', 'landing', 'drop', 'shift']
				.filter((mark) => header.hasAttribute(`data-${mark}`))
				.map((mark) => `${mark}=${header.getAttribute(`data-${mark}`)}`)

		await mountTable({ engine })

		const [name] = columns.columns

		columns.dragStart(name)
		columns.dragOver(2)
		columns.dragDrop()
		await settle()

		expect(findAll('.so-table-column').map(gesture)).toEqual([
			['dragging=true', 'landing=true'],
			['shift=start'],
			['drop=after', 'shift=start'],
		])

		columns.dragEnd()
		await settle()

		expect(findAll('.so-table-column').map(text)).toEqual(['Возраст', '№', 'Имя'])
		expect(findAll('.so-table-row__cell').map(text)).toEqual(['30', '1', 'Анна'])
		expect(findAll('.so-table-column').flatMap(gesture)).toEqual([])
	})
})

/**
 * Сетка — наборы коллекции в разметке и плагин сетки на корне. Ходьбу и выбор
 * считает ядро (`core/__tests__/table-grid.spec.ts`), клавиши — плагин
 * (`plugins/__tests__/table-grid.plugin.spec.ts`). Здесь — что наборы доезжают
 * до своих узлов, а плагин находит ячейки в разметке Web Components: узлы
 * строк из реестра, ячейки по колонкам сетки.
 */
describe('сетка', () => {
	it('роль grid и остановка Tab — у таблицы, ячейки и заголовки фокус только принимают', async () => {
		await mountTable({ ...fromData([ANNA, BORIS], [NAME, AGE]), mode: 'multiple', grid: true })

		const table = find('table.so-table')

		expect(table.getAttribute('role')).toBe('grid')
		expect(table.getAttribute('tabindex')).toBe('0')
		expect(table.getAttribute('aria-multiselectable')).toBe('true')
		expect(table.dataset.grid).toBe('true')
		expect(find('.so-table__select').getAttribute('tabindex')).toBe('-1')

		for (const header of findAll('.so-table-column')) {
			expect(header.getAttribute('tabindex')).toBe('-1')
		}

		for (const cell of findAll('.so-table-row__cell, .so-table-row__select')) {
			expect(cell.getAttribute('tabindex')).toBe('-1')
		}

		expect(findAll('.so-table-row').map((row) => row.getAttribute('aria-selected'))).toEqual([
			'false',
			'false',
		])
		// Окно — внешний узел, не виджет: ни роли, ни остановки
		expect(find('.so-table__viewport').hasAttribute('role')).toBe(false)
		expect(find('.so-table__viewport').hasAttribute('tabindex')).toBe(false)
	})

	it('без сетки — простая таблица: ни роли, ни tabindex, ни aria-selected', async () => {
		await mountTable({ ...fromData([ANNA], [NAME]), mode: 'multiple' })

		expect(find('table.so-table').hasAttribute('role')).toBe(false)
		expect(find('table.so-table').hasAttribute('tabindex')).toBe(false)
		expect(find('.so-table-row__cell').hasAttribute('tabindex')).toBe(false)
		expect(find('.so-table-row').hasAttribute('aria-selected')).toBe(false)
	})

	it('Tab в таблицу — на ячейку, стрелка — на соседнюю, пробел — выбор строки', async () => {
		const engine = engineOf('multiple')

		engine.extensions.grid.grid = true

		await mountTable({ engine })

		find('table.so-table').focus()
		await settle()

		// Выбор включили после колонок — фокус сетки на первой из них
		expect(document.activeElement).toBe(find('.so-table-column'))

		const active = document.activeElement

		if (!active) throw new Error('фокуса нет')

		await press(active, 'ArrowDown')

		const cell = find('.so-table-row th')

		expect(document.activeElement).toBe(cell)

		await press(cell, ' ')

		expect(engine.extensions.selection.selected).toEqual([rowOf(engine, 1)])
		expect(find('.so-table-row').getAttribute('aria-selected')).toBe('true')
	})
})

/**
 * Выбор пишет строке `data-selected` (в сетке ещё `aria-selected`) — на её
 * корень, своей отрисовкой. Ячейки и их содержимое строка строит на смену
 * своих ячеек (`cells` — запись, колонки), а выбор их не меняет: узлы ячеек и
 * копий образца `cell` переживают «выбрать все», выбор в сетке и смену
 * свойства таблицы. Смена записи строит заново копии только своей строки, а
 * узлы её ячеек остаются. Иначе «выбрать все» перестраивало бы содержимое
 * всех ячеек таблицы.
 *
 * Строке образец уходит `<template>`: элемент потребителя в копии
 * подключается только в ячейке, по разу на ячейку, — в самой строке, вне
 * ячеек, его не бывает. Так у React слот зовётся по разу на ячейку.
 */
describe('перерисовка ячеек', () => {
	/** Таблица над движком с образцом ячейки. */
	const mountProbed = (engine: TTableCollection) =>
		mountTable({ engine }, '<template slot="cell"><i class="probe"></i></template>')

	const probes = () => findAll('.probe')

	const cells = () => findAll('.so-table-row__cell')

	/** Копии образца по строкам. */
	const probesOf = (row: number) => findAll('.probe', findAll('.so-table-row')[row])

	/** Где подключался элемент потребителя из копий образца — тег родителя, по порядку. */
	const connections: string[] = []

	class TCellProbe extends HTMLElement {
		connectedCallback(): void {
			connections.push(this.parentElement?.localName ?? '')
		}
	}

	customElements.define('x-cell-probe', TCellProbe)

	it('монтирование: копия образца — по одной на ячейку, и подключается она только в ячейке', async () => {
		connections.length = 0

		await mountTable(
			{ engine: engineOf('multiple') },
			'<template slot="cell"><x-cell-probe></x-cell-probe></template>',
		)

		expect(findAll('x-cell-probe')).toHaveLength(6)
		expect(connections).toEqual(['th', 'td', 'th', 'td', 'th', 'td'])
	})

	it('«выбрать все» и снятие выбора: узлы ячеек и копий те же', async () => {
		await mountProbed(engineOf('multiple'))

		const before = { probes: probes(), cells: cells() }
		const head = checkBoxInput('.so-table__select')

		await click(head)

		expect(rowsSelected()).toEqual(['true', 'true', 'true'])

		await click(head)

		expect(rowsSelected()).toEqual(['false', 'false', 'false'])
		expect(before.probes).toHaveLength(6)
		expect(same(probes(), before.probes)).toBe(true)
		expect(same(cells(), before.cells)).toBe(true)
	})

	it('смена свойства таблицы — узлы ячеек и копий те же', async () => {
		const engine = engineOf('none')
		const el = await mountProbed(engine)
		const before = probes()

		el.aria_label = 'Сотрудники'
		await settle()

		expect(find('table.so-table').getAttribute('aria-label')).toBe('Сотрудники')
		expect(same(probes(), before)).toBe(true)
	})

	it('запись строки сменилась — копии этой строки построены заново, и только её; узлы ячеек те же', async () => {
		const engine = engineOf('none')

		await mountProbed(engine)

		const before = [0, 1, 2].map(probesOf)
		const ownCells = findAll('.so-table-row__cell', findAll('.so-table-row')[1])

		rowOf(engine, 2).data = { ...BORIS, age: 42 }
		await settle()

		const after = [0, 1, 2].map(probesOf)

		expect(same(after[0], before[0])).toBe(true)
		expect(same(after[2], before[2])).toBe(true)
		expect(after[1]).toHaveLength(2)
		expect(after[1].some((probe) => before[1].includes(probe))).toBe(false)
		expect(same(findAll('.so-table-row__cell', findAll('.so-table-row')[1]), ownCells)).toBe(
			true,
		)
	})

	/** Без образца — то же на тексте: ячейка та же, текст новый. */
	it('запись строки сменилась — текст ячейки новый, узел тот же', async () => {
		const engine = engineOf('none')

		await mountTable({ engine })

		const before = cells()

		rowOf(engine, 2).data = { ...BORIS, age: 42 }
		await settle()

		expect(findAll('.so-table-row').map((row) => [...row.children].map(text))).toEqual([
			['Анна', '30'],
			['Борис', '42'],
			['Вера', '25'],
		])
		expect(same(cells(), before)).toBe(true)
	})

	it('в сетке выбор пробелом: узлы ячеек и копий те же', async () => {
		const engine = engineOf('multiple')

		engine.extensions.grid.grid = true

		await mountProbed(engine)

		const before = { probes: probes(), cells: cells() }

		find('table.so-table').focus()
		await settle()

		const active = document.activeElement

		if (!active) throw new Error('фокуса нет')

		await press(active, 'ArrowDown')

		const cell = find('.so-table-row th')

		expect(document.activeElement).toBe(cell)

		await press(cell, ' ')

		expect(engine.extensions.selection.selected).toEqual([rowOf(engine, 1)])
		expect(find('.so-table-row').getAttribute('aria-selected')).toBe('true')
		expect(same(probes(), before.probes)).toBe(true)
		expect(same(cells(), before.cells)).toBe(true)
	})
})

/**
 * Клик по чекбоксу браузер переключает сам, до обработчиков. Выбор — решение
 * модели: подписчик `item:select:before` его отменяет, и тогда ни поле, ни
 * строка отмеченными не остаются.
 */
describe('отменённый выбор', () => {
	it('чекбокс строки: выбор отменён — поле не отмечено, строка не выбрана', async () => {
		const engine = engineOf('multiple')

		engine.extensions.selection.events.on('item:select:before', (e) => e.preventDefault())

		await mountTable({ engine })

		const anna = find('.so-table-row')
		const input = checkBoxInput('.so-table-row__select', anna)

		await click(input)

		expect(engine.extensions.selection.selected).toEqual([])
		expect(input.checked).toBe(false)
		expect(anna.dataset.selected).toBe('false')
	})

	it('чекбокс шапки: выбор отменён — поле не отмечено и не «часть»', async () => {
		const engine = engineOf('multiple')

		engine.extensions.selection.events.on('item:select:before', (e) => e.preventDefault())

		await mountTable({ engine })

		const head = checkBoxInput('.so-table__select')

		await click(head)

		expect(engine.extensions.selection.selected).toEqual([])
		expect([head.checked, head.indeterminate]).toEqual([false, false])
	})

	it('чекбокс шапки из «части»: выбор отменён — «часть» остаётся', async () => {
		const engine = engineOf('multiple')

		engine.extensions.selection.select(rowOf(engine, 1))
		engine.extensions.selection.events.on('item:select:before', (e) => e.preventDefault())

		await mountTable({ engine })

		const head = checkBoxInput('.so-table__select')

		await click(head)

		expect(engine.extensions.selection.selected).toEqual([rowOf(engine, 1)])
		expect([head.checked, head.indeterminate]).toEqual([false, true])
	})
})

/**
 * Окно (`<so-virtual>`): тело рисует то, что отдаёт коллекция (`drawn`), —
 * строки окна и распорки на месте пропущенных. Что попадает в окно, решает
 * ядро (`core/__tests__/table-virtual.spec.ts`), замер — плагин
 * (`plugins/__tests__/virtual.plugin.spec.ts`); раскладки в jsdom нет, и замер
 * здесь подаётся ядру руками.
 */
describe('окно', () => {
	/** Движок строк над `count` записями. */
	function manyRows(count: number): TTableCollection {
		const records = Array.from({ length: count }, (_, index) => ({
			id: index + 1,
			name: `Строка ${index + 1}`,
			age: index,
		}))

		return engineOf('multiple', records)
	}

	/** Таблица над движком в окне `<so-virtual>`. */
	async function inWindow(engine: TTableCollection): Promise<TTableElementProps> {
		const virtual = document.createElement('so-virtual')

		if (!(virtual instanceof TVirtualElement)) throw new Error('<so-virtual> нет')

		document.body.appendChild(virtual)

		return mountTable({ engine }, '', virtual)
	}

	/** Замер, как его подаёт плагин окна: полоса от верха таблицы и шаг строк. */
	async function measure(engine: TTableCollection, top: number, bottom: number) {
		engine.extensions.draw.notifyViewport({ top, bottom, step: 40 })
		await settle()
	}

	it('до замера — первые 50 строк; у таблицы число строк, у шапки и строк — номера', async () => {
		await inWindow(manyRows(80))

		const rows = findAll('.so-table-row')
		const table = find('table.so-table')

		expect(rows).toHaveLength(50)
		expect(table.getAttribute('aria-rowcount')).toBe('81')
		expect(table.dataset.virtual).toBe('true')
		expect(find('.so-table__head-row').getAttribute('aria-rowindex')).toBe('1')
		expect(rows[0].getAttribute('aria-rowindex')).toBe('2')
	})

	it('по замеру — распорки на месте пропущенных: скрыты, во всю ширину, высотой в строки', async () => {
		const engine = manyRows(80)

		await inWindow(engine)
		await measure(engine, 1200, 1600)

		const body = find('.so-table__body')
		const fillers = findAll('.so-table__filler-row', body)

		expect(fillers).toHaveLength(2)
		expect(body.firstElementChild).toBe(fillers[0])
		expect(body.lastElementChild).toBe(fillers[1])
		expect(fillers.map((filler) => filler.getAttribute('aria-hidden'))).toEqual([
			'true',
			'true',
		])
		// Места 20–49: перед ними 20 строк, за ними 30
		expect(
			fillers.map((filler) => filler.style.getPropertyValue('--so-filler-height')),
		).toEqual(['800px', '1200px'])
		// Колонка выбора и две колонки
		expect(find('.so-table__filler', fillers[0]).getAttribute('colspan')).toBe('3')
		expect(findAll('.so-table-row', body)).toHaveLength(30)
	})

	/**
	 * Строки и распорки — одной петлёй с ключом записи: строка, которая
	 * осталась в окне, — тот же узел, хотя распорка перед ней сменилась.
	 */
	it('строка, оставшаяся в окне, при сдвиге окна — тот же узел', async () => {
		const engine = manyRows(80)

		await inWindow(engine)
		await measure(engine, 1200, 1600)

		const kept = findAll('.so-table-row').find(
			(row) => row.getAttribute('aria-rowindex') === '40',
		)

		await measure(engine, 1240, 1640)

		expect(kept).toBeDefined()
		expect(
			findAll('.so-table-row').find((row) => row.getAttribute('aria-rowindex') === '40'),
		).toBe(kept)
	})

	it('без обёртки — все строки, без распорок и номеров', async () => {
		await mountTable(fromData([ANNA, BORIS], [NAME]))

		expect(findAll('.so-table-row')).toHaveLength(2)
		expect(findAll('.so-table__filler-row')).toEqual([])
		expect(find('table.so-table').hasAttribute('aria-rowcount')).toBe(false)
		expect(find('.so-table__head-row').hasAttribute('aria-rowindex')).toBe(false)
	})
})

/**
 * Закреплённая шапка (`stickyHead`) — свойство таблицы: ядро пишет его в
 * набор `dataset`, база раскладывает набор на корень — `table`. Закрепляет
 * шапку тема (`playground/vue/browser/table-sticky-head.spec.ts`).
 */
describe('закреплённая шапка', () => {
	it('data-sticky-head на корне — по свойству и вместе с ним', async () => {
		const el = await mountTable({ ...fromData([ANNA, BORIS], [NAME]), stickyHead: false })

		const table = find('table.so-table')

		expect(table.dataset.stickyHead).toBe('false')

		el.stickyHead = true
		await settle()

		expect(table.dataset.stickyHead).toBe('true')

		el.stickyHead = false
		await settle()

		expect(table.dataset.stickyHead).toBe('false')
	})

	it('с инстанса: шапку закрепили — атрибут на корне', async () => {
		const owner = new TTable()

		await mountTable({ ctrl: owner, engine: engineOf('none') })

		expect(find('table.so-table').dataset.stickyHead).toBe('false')

		owner.stickyHead = true
		await settle()

		expect(find('table.so-table').dataset.stickyHead).toBe('true')
	})
})

describe('шаблоны объявляют ровно те слоты, что и дескрипторы', () => {
	/** Точки слотов шаблона — в пустом корне, где ни один слот не задан. */
	function slotsOf<TInstance, TFacade>(template: ITemplate<TInstance, TFacade>): string[] {
		const root = document.createElement('div')
		const targets = template.create(root, () => false, bareContext<TInstance, TFacade>(root))

		return Object.keys(targets.slots).sort()
	}

	it.each([
		['Table', () => slotsOf(tableTemplate), TableDescriptor],
		['Table.Column', () => slotsOf(tableColumnTemplate), TableColumnDescriptor],
		['Table.Row', () => slotsOf(tableRowTemplate), TableRowDescriptor],
	] as const)('%s', (_name, slots, descriptor) => {
		expect(slots()).toEqual(
			descriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		)
	})
})

describe('типы', () => {
	it('пропсы фасада — свойства элемента таблицы, выбор — свойство строки', () => {
		expectTypeOf<TTableElementProps['mode']>().toEqualTypeOf<TSelectionMode | undefined>()
		expectTypeOf<TTableElementProps>().toHaveProperty('items')
		expectTypeOf<TTableElementProps>().toHaveProperty('columns')
		expectTypeOf<TTableElementProps>().toHaveProperty('engine')
		expectTypeOf<TTableRowElementProps['selected']>().toEqualTypeOf<boolean | undefined>()
	})

	it('состояние — вместе со свойствами фасада', () => {
		expectTypeOf<TTableElementProps['state']>().toHaveProperty('drawn')
		expectTypeOf<TTableElementProps['state']>().toHaveProperty('shownColumns')
		expectTypeOf<TTableRowElementProps['state']>().toHaveProperty('cells')
		expectTypeOf<TTableColumnElementProps['ctrl']>().toEqualTypeOf<ITableColumn | undefined>()
	})
})
