/**
 * Table в Svelte — проводка на настоящей разметке.
 *
 * Модель — колонки, ячейки, сортировку, счёт выбора и чекбоксы колонки выбора
 * — проверяет ядро (`core/__tests__/table*.spec.ts`), раскладку и вид —
 * браузер (`playground/vue/browser/table.spec.ts`). Здесь, как у Vue, React и
 * Solid (`ui/vue/__tests__/table.spec.ts`, `ui/react/__tests__/table.spec.tsx`,
 * `ui/solid/__tests__/table.spec.tsx`), важно, что выходы коллекции доезжают
 * туда, куда должны: колонки — в заголовки, строки — в `tbody` в порядке
 * сортировки, ячейки — в строки, а нажатия по кнопкам сортировки и чекбоксам
 * доходят до модели и возвращаются в разметку — и тогда, когда модель выбор
 * отменила.
 *
 * Своё у Svelte — петли по ключу и тонкая перерисовка. Записи `drawn` и ячейки
 * строки — новые объекты на каждую смену, а петля `{#each}` держит узел по
 * ключу: строка, оставшаяся в окне, и ячейка сменившейся записи — те же узлы.
 * «Перерисовка ячеек» — как у Vue и React, хотя своей границы перерисовки у
 * ячеек Svelte нет: сниппет заново не зовётся, новый scope доходит до него
 * геттером, и счёт ведётся по его чтениям scope (`countedText`).
 *
 * И слоты. Сниппет непрозрачен: что он нарисовал, таблица не видит, поэтому
 * заданный `header` рисуется вместо текста в каждом заголовке, а `cell` —
 * вместо значения в каждой ячейке, даже там, где сниппет ничего не нарисовал,
 * — как слоты элементов ListBox (`list-box.spec.ts`). StrictMode у Svelte нет,
 * сервер — `collections.server.spec.ts`.
 */

import { describe, it, expect, expectTypeOf, vi } from 'vitest'
import { flushSync, type Component, type Snippet } from 'svelte'
import { TTable, createEngineTable } from '@soldy-ui/core'
import type {
	ITableColumn,
	ITableRow,
	TSelectionMode,
	TTableCollection,
	TTableColumnSource,
	TTableRecord,
} from '@soldy-ui/core'
import { enUS, ruRU } from '@soldy-ui/plugins'
import { Table, TableColumn, TableRow, type TableProps } from '@soldy-ui/svelte'
import Slots from './TableSlots.test.svelte'
import Localized from './TableLocale.test.svelte'
import Windowed from './Virtual.test.svelte'
import { mount, nextFrame, readyProbe, type TMounted } from './mount'
import { reactiveProps } from './reactive-props.svelte'
import { countedText, markup } from './snippets.svelte'

/**
 * Смонтировать и дождаться кадра: корень плагины получают через
 * `requestAnimationFrame`, и слушатели плагинов встают по его `ready`.
 */
async function render<TProps extends Record<string, any>>(
	component: Component<TProps>,
	props: TProps,
): Promise<TMounted> {
	const mounted = mount(component, props)

	await nextFrame()

	return mounted
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function node(selector: string, root: ParentNode = document): HTMLElement {
	const element = root.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

function nodes(selector: string, root: ParentNode = document): HTMLElement[] {
	return [...root.querySelectorAll(selector)].filter(
		(element): element is HTMLElement => element instanceof HTMLElement,
	)
}

/** Поле чекбокса по селектору его обёртки. */
function checkBoxInput(selector: string, root: ParentNode = document): HTMLInputElement {
	const input = node(selector, root).querySelector('input')

	if (!(input instanceof HTMLInputElement)) throw new Error(`${selector}: поля чекбокса нет`)

	return input
}

/** Смена снаружи — в ядре или в пропсах; разметку Svelte обновляет на своём такте. */
function act(change: () => void): void {
	change()
	flushSync()
}

/** Клик, как его шлёт браузер, — и такт Svelte. */
function click(element: HTMLElement): void {
	act(() => element.click())
}

/** Клавиша на узле — как её шлёт браузер: всплывает и отменяется. */
function press(target: Element, key: string, modifiers: KeyboardEventInit = {}): void {
	act(() => {
		target.dispatchEvent(
			new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers }),
		)
	})
}

/** Узел под фокусом; нет его — тест падает здесь. */
function focused(): Element {
	const active = document.activeElement

	if (!active) throw new Error('фокуса нет')

	return active
}

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

/** Строки `tbody` — по тексту ячейки заголовка. */
const rowNames = () => nodes('.so-table-row').map((row) => text(node('th', row)))

/** Отметка выбора строк. */
const rowsSelected = () => nodes('.so-table-row').map((row) => row.dataset.selected)

/** Отметки чекбоксов строк. */
const rowsChecked = () =>
	nodes('.so-table-row').map((row) => checkBoxInput('.so-table-row__select', row).checked)

describe('разметка', () => {
	it('шапка — показанные колонки, тело — строки, в строке — ячейки по колонкам', async () => {
		await render(Table, {
			items: [ANNA, BORIS].map((data) => ({ data })),
			columns: [NAME, AGE],
		})

		const table = node('table.so-table')

		expect(nodes('.so-table__head-row > th', table).map(text)).toEqual(['Имя', 'Возраст'])
		expect(nodes('.so-table-row').map((row) => [...row.children].map(text))).toEqual([
			['Анна', '30'],
			['Борис', '41'],
		])
		// Колонки выбора нет: режим по умолчанию — `none`
		expect(nodes('.so-table__select, .so-table-row__select')).toEqual([])
	})

	it('заголовок колонки — th с набором колонки и шириной переменной', async () => {
		await render(Table, { items: [{ data: ANNA }], columns: [NAME, { ...AGE, width: 120 }] })

		const [name, age] = nodes('.so-table-column')

		expect(age.tagName).toBe('TH')
		expect(age.dataset.align).toBe('end')
		expect(age.style.getPropertyValue('--so-table-column-width')).toBe('120px')
		expect(name.style.getPropertyValue('--so-table-column-width')).toBe('')
	})

	it('ячейка колонки rowHeader — th scope="row" с id, остальные — td', async () => {
		await render(Table, { items: [{ data: ANNA }], columns: [AGE, NAME] })

		const [age, name] = [...node('.so-table-row').children]

		expect(age.tagName).toBe('TD')
		expect(age.getAttribute('data-align')).toBe('end')
		expect(name.tagName).toBe('TH')
		expect(name.getAttribute('scope')).toBe('row')
		expect(name.id).not.toBe('')
	})

	it('Table.Column и Table.Row — части таблицы', () => {
		expect(Table.Column).toBe(TableColumn)
		expect(Table.Row).toBe(TableRow)
		expectTypeOf(Table.Column).toEqualTypeOf<typeof TableColumn>()
		expectTypeOf(Table.Row).toEqualTypeOf<typeof TableRow>()
	})

	it('окно вокруг таблицы: корень, классы и наборы — у table, а не у окна', async () => {
		await render(Table, {
			items: [{ data: ANNA }],
			columns: [NAME],
			stickyHead: true,
			aria_label: 'Сотрудники',
		})

		const table = node('table.so-table')
		const viewport = node('.so-table__viewport')

		expect(table.parentElement).toBe(viewport)
		expect(viewport.tagName).toBe('DIV')
		expect(table.dataset.stickyHead).toBe('true')
		expect(table.getAttribute('aria-label')).toBe('Сотрудники')
		// У окна — только свой класс: ни наборов, ни имени
		expect(viewport.className).toBe('so-table__viewport')
		expect(
			viewport.getAttributeNames().filter((name) => name !== 'class' && name !== 'style'),
		).toEqual([])
	})

	it('атрибуты потребителя — окну: оно внешний узел компонента', async () => {
		await render(Table, {
			items: [{ data: ANNA }],
			columns: [NAME],
			class: 'staff',
			style: 'max-height: 320px',
			'data-testid': 'staff',
		})

		const viewport = node('.so-table__viewport')
		const table = node('table.so-table')

		expect(viewport.classList.contains('staff')).toBe(true)
		expect(viewport.dataset.testid).toBe('staff')
		expect(viewport.style.maxHeight).toBe('320px')
		expect(table.hasAttribute('data-testid')).toBe(false)
		expect(table.classList.contains('staff')).toBe(false)
		expect(table.hasAttribute('style')).toBe(false)
	})

	it('скрытая таблица прячет окно: скрытие — на окне', async () => {
		const props = reactiveProps<TableProps>({ engine: engineOf('none'), visible: false })

		await render(Table, props)

		expect(node('.so-table__viewport').style.display).toBe('none')
		expect(node('table.so-table').style.display).toBe('')

		act(() => (props.visible = true))

		expect(node('.so-table__viewport').style.display).toBe('')
	})

	/** Атрибуты окна и таблицы — разные узлы: смена атрибута окна таблицу не перепривязывает. */
	it('смена атрибута окна не перепривязывает таблицу', async () => {
		const ready = readyProbe()
		const props = reactiveProps<TableProps>({
			engine: engineOf('none'),
			title: 'a',
			onElementReady: ready.onElementReady,
		})

		await render(Table, props)

		act(() => (props.title = 'b'))
		await nextFrame()

		expect(node('.so-table__viewport').title).toBe('b')
		expect(ready.elements).toHaveLength(1)
		expect(ready.elements[0]).toBe(node('table.so-table'))
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
		nodes('.so-table-column').map((header) =>
			header.style.getPropertyValue('--so-table-column-width'),
		)

	it('columnFit none — ширины по умолчанию сразу, без места; признака места нет', async () => {
		await render(Table, { items: [{ data: ANNA }], columns: [NAME, AGE], columnFit: 'none' })

		expect(widths()).toEqual(['160px', '160px'])
		expect(nodes('.so-table-column').map((header) => header.dataset.sized)).toEqual([
			'true',
			'true',
		])
		expect(node('table.so-table').hasAttribute('data-overflow')).toBe(false)
		// Ширины известны и до места — таблица шириной в их сумму
		expect(node('table.so-table').dataset.sized).toBe('true')
	})

	it('по умолчанию auto — до места ширин нет, с местом — делят его', async () => {
		const engine = engineOf('none', [ANNA])

		await render(Table, { engine })

		expect(widths()).toEqual(['', ''])
		expect(node('table.so-table').hasAttribute('data-sized')).toBe(false)

		act(() => engine.extensions.columns.notifySpace(500))

		expect(widths()).toEqual(['250px', '250px'])
		expect(node('table.so-table').dataset.overflow).toBe('false')
		expect(node('table.so-table').dataset.sized).toBe('true')
	})

	it('смена columnFit пропом — новая раскладка; шире места — data-overflow', async () => {
		const engine = engineOf('none', [ANNA])
		const props = reactiveProps<TableProps>({ engine, columnFit: 'none' })

		await render(Table, props)

		act(() => engine.extensions.columns.notifySpace(600))

		expect(widths()).toEqual(['160px', '160px'])
		expect(node('table.so-table').dataset.overflow).toBe('false')

		act(() => (props.columnFit = 'auto'))

		expect(widths()).toEqual(['300px', '300px'])

		act(() => engine.extensions.columns.notifySpace(300))

		expect(widths()).toEqual(['160px', '160px'])
		expect(node('table.so-table').dataset.overflow).toBe('true')
	})
})

describe('слоты', () => {
	it('header — подпись заголовка по колонке, и у сортируемой тоже; кнопка — вне подписи', async () => {
		await render(Slots, {
			case: 'header',
			table: { items: [{ data: ANNA }], columns: [NAME, AGE] },
		})

		expect(nodes('.so-table-column__text b').map(text)).toEqual(['name:Имя', 'age:Возраст'])
		// Кнопку сортировки рисует колонка рядом с подписью, а не таблица в ней
		const button = node('.so-table-column__sort')

		expect(button.closest('.so-table-column__text')).toBeNull()
		expect(text(button)).toBe('')
	})

	/**
	 * Своё действие по заголовку — контрол в подписи: у `th` фокуса нет, и
	 * нажатие по ячейке ничего не делает. Нажатие по своему контролу
	 * сортировку не трогает.
	 */
	it('кнопка в слоте header нажимается и не сортирует', async () => {
		const opened = vi.fn()
		const engine = engineOf('none')

		await render(Slots, { case: 'header-button', table: { engine }, onOpen: opened })

		const age = nodes('.so-table-column')[1]

		click(node('button.menu', age))

		expect(opened.mock.calls).toEqual([['age']])
		expect(rowNames()).toEqual(['Анна', 'Борис', 'Вера'])
		expect(age.hasAttribute('aria-sort')).toBe(false)
		expect(engine.extensions.sort.sort).toEqual([])
	})

	/**
	 * `header` — проброс слота заголовка колонки: рядом с колонкой в scope то,
	 * что отдаёт слот самого заголовка, — текст и сортируемость.
	 */
	it('header получает текст и сортируемость колонки — scope слота заголовка', async () => {
		await render(Slots, {
			case: 'header-scope',
			table: { items: [{ data: ANNA }], columns: [NAME, AGE] },
		})

		expect(nodes('.so-table-column__text b').map(text)).toEqual([
			'name:Имя:false',
			'age:Возраст:true',
		])
	})

	/**
	 * Сниппет непрозрачен: что он нарисовал в подписи, колонка не видит, и
	 * заданный таблице `header` стоит в каждом заголовке вместо текста — и там,
	 * где ничего не нарисовал. У Vue и React пустой слот уступает место тексту.
	 */
	it('header задан — в каждом заголовке вместо текста, и где сниппет пуст', async () => {
		await render(Slots, {
			case: 'header-age',
			table: { items: [{ data: ANNA }], columns: [NAME, AGE] },
		})

		const [name, age] = nodes('.so-table-column__text')

		expect(text(name)).toBe('')
		expect(text(age)).toBe('Возраст')
	})

	it('cell — содержимое ячейки по строке, колонке и значению', async () => {
		await render(Slots, {
			case: 'cell',
			table: { items: [{ data: ANNA }, { data: BORIS }], columns: [NAME, AGE] },
		})

		expect(nodes('.so-table-row').map((row) => [...row.children].map(text))).toEqual([
			['Анна', '1/30'],
			['Борис', '2/41'],
		])
		expect(nodes('.so-table-row i').map(text)).toEqual(['1/30', '2/41'])
	})

	/** Сниппет непрозрачен и в ячейке: заданный, он стоит вместо значения в каждой. */
	it('cell задан — в каждой ячейке вместо значения, и где сниппет пуст', async () => {
		await render(Slots, {
			case: 'cell-age',
			table: { items: [{ data: ANNA }], columns: [NAME, AGE] },
		})

		expect([...node('.so-table-row').children].map(text)).toEqual(['', '30'])
	})

	/**
	 * Без слота значение — текстом, по правилу интерполяции Vue: `{value}`
	 * Svelte нарисовал бы объект как `[object Object]`, а массив — через
	 * запятую.
	 */
	it('без cell значение — текстом: число, булево, пусто, объект', async () => {
		const FLAG: TTableColumnSource = { field: 'flag', text: 'Флаг' }
		const NOTE: TTableColumnSource = { field: 'note', text: 'Заметка' }
		const TAGS: TTableColumnSource = { field: 'tags', text: 'Теги' }

		await render(Table, {
			items: [
				{ data: { id: 1, name: 'Анна', age: 30, flag: true, note: null, tags: ['a'] } },
			],
			columns: [NAME, AGE, FLAG, NOTE, TAGS],
		})

		expect([...node('.so-table-row').children].map((cell) => cell.textContent)).toEqual([
			'Анна',
			'30',
			'true',
			'',
			'[\n  "a"\n]',
		])
	})

	it('empty — пока строк нет, ячейка во всю ширину строки', async () => {
		await render(Table, {
			columns: [NAME, AGE],
			mode: 'multiple',
			empty: markup('<span>Нет данных</span>'),
		})

		const cell = node('.so-table__empty')

		expect(text(cell)).toBe('Нет данных')
		// Две колонки и колонка выбора
		expect(cell.getAttribute('colspan')).toBe('3')
	})

	it('строки появились — пустой строки нет', async () => {
		await render(Table, { items: [{ data: ANNA }], columns: [NAME] })

		expect(nodes('.so-table__empty-row')).toEqual([])
	})
})

describe('сортировка', () => {
	it('кнопка заголовка сортирует строки: по возрастанию, по убыванию, снята', async () => {
		const engine = engineOf('none')

		await render(Table, { engine })

		const age = nodes('.so-table-column')[1]
		const button = node('.so-table-column__sort', age)

		expect(rowNames()).toEqual(['Анна', 'Борис', 'Вера'])

		click(button)

		expect(rowNames()).toEqual(['Вера', 'Анна', 'Борис'])
		expect(age.getAttribute('aria-sort')).toBe('ascending')
		expect(age.dataset.sort).toBe('asc')

		click(button)

		expect(rowNames()).toEqual(['Борис', 'Анна', 'Вера'])
		expect(age.getAttribute('aria-sort')).toBe('descending')

		click(button)

		expect(rowNames()).toEqual(['Анна', 'Борис', 'Вера'])
		expect(age.hasAttribute('aria-sort')).toBe(false)
	})

	it('подпись — у всех колонок, кнопка — только у сортируемой и рядом с подписью; стрелка скрыта от скринридера', async () => {
		await render(Table, { engine: engineOf('none') })

		const [name, age] = nodes('.so-table-column')

		expect(nodes('.so-table-column__sort', name)).toEqual([])
		expect(text(node('.so-table-column__text', name))).toBe('Имя')
		expect(text(node('.so-table-column__text', age))).toBe('Возраст')

		const button = node('.so-table-column__sort', age)

		// Подпись и кнопка — соседи в ряду содержимого заголовка
		expect(button.parentElement).toBe(node('.so-table-column__content', age))
		expect(button.closest('.so-table-column__text')).toBeNull()
		expect(button.getAttribute('type')).toBe('button')
		expect(node('.so-table-column__sort-icon', age).getAttribute('aria-hidden')).toBe('true')
		expect(age.querySelector('.so-table-column__sort-icon svg')).not.toBeNull()
	})

	/**
	 * Заголовок назван подписью, кнопка — своим именем от локали: имя кнопки в
	 * имя заголовка не входит, и подписи заголовка в ссылке кнопки нет.
	 */
	it('имя кнопки — «Sort by …» от локали, имя заголовка — только подпись', async () => {
		await render(Table, { engine: engineOf('none') })

		const age = nodes('.so-table-column')[1]
		const button = node('.so-table-column__sort', age)
		const caption = node('.so-table-column__text', age)

		expect(button.getAttribute('aria-label')).toBe('Sort by Возраст')
		expect(button.hasAttribute('aria-labelledby')).toBe(false)
		expect(age.getAttribute('aria-labelledby')).toBe(caption.id)
		expect(caption.contains(button)).toBe(false)
	})

	it('смена локали — новое имя кнопки на той же кнопке, без перемонтирования', async () => {
		const props = reactiveProps({ locale: enUS, table: { engine: engineOf('none') } })

		await render(Localized, props)

		const button = node('.so-table-column__sort')

		expect(button.getAttribute('aria-label')).toBe('Sort by Возраст')

		act(() => (props.locale = ruRU))

		expect(node('.so-table-column__sort')).toBe(button)
		expect(button.getAttribute('aria-label')).toBe('Сортировать по столбцу Возраст')
	})

	it('нажатие по подписи и по ячейке заголовка не сортирует', async () => {
		const engine = engineOf('none')

		await render(Table, { engine })

		const age = nodes('.so-table-column')[1]

		click(node('.so-table-column__text', age))
		click(age)

		expect(rowNames()).toEqual(['Анна', 'Борис', 'Вера'])
		expect(age.hasAttribute('aria-sort')).toBe(false)
		expect(engine.extensions.sort.sort).toEqual([])
	})

	it('выключенная таблица — кнопка выключена, порядок прежний', async () => {
		await render(Table, { engine: engineOf('none'), disabled: true })

		const button = node('.so-table-column__sort')

		expect(button.hasAttribute('disabled')).toBe(true)

		click(button)

		expect(rowNames()).toEqual(['Анна', 'Борис', 'Вера'])
	})
})

describe('колонка выбора', () => {
	it('multiple — заголовок с чекбоксом «выбрать все», single — пустая ячейка, у строк — чекбоксы', async () => {
		const multiple = await render(Table, { engine: engineOf('multiple') })

		const head = node('.so-table__select')

		expect(head.tagName).toBe('TH')
		expect(nodes('.so-check-box', head)).toHaveLength(1)
		expect(nodes('.so-table-row__select .so-check-box')).toHaveLength(3)

		multiple.destroy()

		await render(Table, { engine: engineOf('single') })

		const single = node('.so-table__select')

		expect(single.tagName).toBe('TD')
		expect(single.children).toHaveLength(0)
		expect(nodes('.so-table-row__select .so-check-box')).toHaveLength(3)
	})

	it('колонка появляется и уходит вместе с режимом', async () => {
		const engine = engineOf('none')

		await render(Table, { engine })

		expect(nodes('.so-table__select, .so-table-row__select')).toEqual([])

		act(() => (engine.extensions.selection.mode = 'multiple'))
		await nextFrame()

		expect(nodes('.so-table-row__select')).toHaveLength(3)

		act(() => (engine.extensions.selection.mode = 'none'))
		await nextFrame()

		expect(nodes('.so-table__select, .so-table-row__select')).toEqual([])
	})

	it('клик по чекбоксу строки выбирает строку, повторный — снимает', async () => {
		const engine = engineOf('multiple')

		await render(Table, { engine })

		const anna = node('.so-table-row')
		const input = checkBoxInput('.so-table-row__select', anna)

		click(input)

		expect(engine.extensions.selection.selected).toEqual([rowOf(engine, 1)])
		expect(input.checked).toBe(true)
		expect(anna.dataset.selected).toBe('true')

		click(input)

		expect(engine.extensions.selection.selected).toEqual([])
		expect(input.checked).toBe(false)
		expect(anna.dataset.selected).toBe('false')
	})

	it('строки, выбранные по одной до всех, выбора не теряют; шапка — «часть», потом отмечена', async () => {
		const engine = engineOf('multiple')

		await render(Table, { engine })

		const head = checkBoxInput('.so-table__select')
		const inputs = nodes('.so-table-row').map((row) =>
			checkBoxInput('.so-table-row__select', row),
		)

		click(inputs[0])

		expect([head.checked, head.indeterminate]).toEqual([false, true])

		click(inputs[1])
		click(inputs[2])

		expect(engine.extensions.selection.selected).toHaveLength(3)
		expect(inputs.map((input) => input.checked)).toEqual([true, true, true])
		expect([head.checked, head.indeterminate]).toEqual([true, false])
	})

	it('чекбокс шапки: «часть» → все → ни одной', async () => {
		const engine = engineOf('multiple')

		engine.extensions.selection.select(rowOf(engine, 2))

		await render(Table, { engine })

		const head = checkBoxInput('.so-table__select')

		expect([head.checked, head.indeterminate]).toEqual([false, true])

		click(head)

		expect(engine.extensions.selection.selected).toHaveLength(3)
		expect([head.checked, head.indeterminate]).toEqual([true, false])
		expect(rowsChecked()).toEqual([true, true, true])

		click(head)

		expect(engine.extensions.selection.selected).toEqual([])
		expect([head.checked, head.indeterminate]).toEqual([false, false])
		expect(rowsChecked()).toEqual([false, false, false])
	})

	it('выбор снаружи доезжает до чекбоксов', async () => {
		const engine = engineOf('multiple')

		await render(Table, { engine })

		act(() => engine.extensions.selection.select(rowOf(engine, 3)))

		const vera = nodes('.so-table-row')[2]

		expect(checkBoxInput('.so-table-row__select', vera).checked).toBe(true)
		expect(checkBoxInput('.so-table__select').indeterminate).toBe(true)
	})

	it('пустая таблица и выключенные строки — чекбокс шапки выключен', async () => {
		const engine = engineOf('multiple', [])

		await render(Table, { engine })

		expect(checkBoxInput('.so-table__select').disabled).toBe(true)

		act(() => (engine.extensions.batch.items = [{ data: { ...ANNA } }]))
		await nextFrame()

		expect(checkBoxInput('.so-table__select').disabled).toBe(false)

		act(() => (rowOf(engine, 1).disabled = true))

		expect(checkBoxInput('.so-table__select').disabled).toBe(true)
		expect(checkBoxInput('.so-table-row__select').disabled).toBe(true)
	})

	it('чекбоксы — размера и варианта таблицы', async () => {
		await render(Table, { ctrl: new TTable({ size: 'lg' }), engine: engineOf('multiple') })

		expect(node('.so-table__select .so-check-box').classList).toContain('so-check-box--size-lg')
		expect(node('.so-table-row__select .so-check-box').classList).toContain(
			'so-check-box--size-lg',
		)
	})
})

describe('имена чекбоксов', () => {
	it('чекбокс строки называет заголовок строки — ячейка колонки rowHeader', async () => {
		await render(Table, { engine: engineOf('multiple') })

		const anna = node('.so-table-row')
		const input = checkBoxInput('.so-table-row__select', anna)
		const header = node('th[scope="row"]', anna)

		expect(input.getAttribute('aria-labelledby')).toBe(header.id)
		expect(text(header)).toBe('Анна')

		// У каждой строки — свой заголовок
		const ids = nodes('th[scope="row"]').map((cell) => cell.id)

		expect(new Set(ids).size).toBe(3)
	})

	it('без колонки rowHeader у чекбокса строки ссылки нет', async () => {
		await render(Table, {
			engine: engineOf('multiple', [ANNA], [{ ...NAME, rowHeader: false }, AGE]),
		})

		expect(checkBoxInput('.so-table-row__select').hasAttribute('aria-labelledby')).toBe(false)
		expect(nodes('th[scope="row"]')).toEqual([])
	})

	it('чекбокс шапки — имя от локали поддерева, на лету', async () => {
		const props = reactiveProps({ locale: enUS, table: { engine: engineOf('multiple') } })

		await render(Localized, props)

		expect(checkBoxInput('.so-table__select').getAttribute('aria-label')).toBe('Select all')

		act(() => (props.locale = ruRU))

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
		const field = node('.so-table-column__resizer', root).querySelector('input')

		if (!(field instanceof HTMLInputElement)) throw new Error('поля ручки нет')

		return field
	}

	/**
	 * Ширину на поле ставит attachment поля после атрибутов узла: ход 100–300
	 * уже стоит, и ширина 150 не прижата к ходу по умолчанию, 0–100.
	 */
	it('полоса с полем — у колонки resizable: ход и ширина колонки; у остальных её нет', async () => {
		await render(Table, {
			items: [{ data: ANNA }],
			columns: [{ ...RESIZABLE, minWidth: 100, maxWidth: 300 }, AGE],
		})

		const [name, age] = nodes('.so-table-column')
		const field = resizerField(name)

		expect(field.type).toBe('range')
		expect([field.min, field.max, field.value]).toEqual(['100', '300', '150'])
		expect(nodes('.so-table-column__resizer', age)).toEqual([])
	})

	it('колонка без своей ширины — полоса появляется с местом таблицы, ширина — раскладки', async () => {
		const engine = engineOf('none', [ANNA], [{ ...NAME, resizable: true }])

		await render(Table, { engine })

		// Места нет — ширину решает тема, и ручке нечего показать
		expect(nodes('.so-table-column__resizer')).toEqual([])

		act(() => engine.extensions.columns.notifySpace(180))
		await nextFrame()

		expect(resizerField().value).toBe('180')
		expect(node('.so-table-column').style.getPropertyValue('--so-table-column-width')).toBe(
			'180px',
		)
		// Ширина раскладки — не своя: колонка остаётся гибкой
		expect(columnOf(engine, 'name').getProps().width).toBeUndefined()
	})

	it('у выключенной таблицы ручек нет', async () => {
		await render(Table, { items: [{ data: ANNA }], columns: [RESIZABLE], disabled: true })

		expect(nodes('.so-table-column__resizer')).toEqual([])
	})

	it('заголовок и поле названы подписью — ровно текст колонки', async () => {
		await render(Table, { items: [{ data: ANNA }], columns: [RESIZABLE, AGE] })

		for (const header of nodes('.so-table-column')) {
			const caption = node('.so-table-column__text', header)

			expect(caption.id).not.toBe('')
			expect(header.getAttribute('aria-labelledby')).toBe(caption.id)
		}

		const name = nodes('.so-table-column')[0]

		expect(resizerField(name).getAttribute('aria-labelledby')).toBe(
			node('.so-table-column__text', name).id,
		)
		expect(text(node('.so-table-column__text', name))).toBe('Имя')
	})

	it('клавиша на поле — ширина заголовка, поле и onColumnResize таблицы', async () => {
		const resize = vi.fn()
		const engine = engineOf('none', [ANNA], [RESIZABLE])

		await render(Table, { engine, onColumnResize: resize })

		const header = node('.so-table-column')

		press(resizerField(), 'ArrowRight')

		expect(header.style.getPropertyValue('--so-table-column-width')).toBe('160px')
		expect(header.dataset.sized).toBe('true')
		expect(resizerField().value).toBe('160')
		expect(resize.mock.calls).toEqual([[{ column: columnOf(engine, 'name'), width: 160 }]])
	})

	/**
	 * Ширину на поле пишет attachment поля, только когда она разошлась с узлом:
	 * своя запись поля ничего не возвращает узлу, а ширина из кода доходит.
	 */
	it('ширина из кода — в поле, тот же узел', async () => {
		const engine = engineOf('none', [ANNA], [RESIZABLE])

		await render(Table, { engine })

		const field = resizerField()

		act(() => (columnOf(engine, 'name').width = 210))

		expect(resizerField()).toBe(field)
		expect(field.value).toBe('210')
	})
})

/**
 * Перестановку ведёт плагин таблицы, место колонки — расширение коллекции.
 * Здесь — что плагин стоит на корне таблицы и находит её заголовки, а
 * перестановка доезжает до шапки и ячеек строк и уходит наружу `onColumnMove`.
 * Протяжку указателем — `playground/vue/browser/table.spec.ts`.
 */
describe('перестановка колонок', () => {
	const MOVABLE: readonly TTableColumnSource[] = [
		{ ...NAME, reorderable: true },
		{ ...AGE, reorderable: true },
	]

	it('data-reorderable — на заголовке колонки', async () => {
		await render(Table, { items: [{ data: ANNA }], columns: [MOVABLE[0], AGE] })

		const [name, age] = nodes('.so-table-column')

		expect(name.dataset.reorderable).toBe('true')
		expect(age.dataset.reorderable).toBe('false')
	})

	it('Ctrl+Shift+← на кнопке сортировки — шапка и ячейки в новом порядке, onColumnMove', async () => {
		const move = vi.fn()

		await render(Table, { engine: engineOf('none', [ANNA], [...MOVABLE]), onColumnMove: move })

		press(node('.so-table-column__sort'), 'ArrowLeft', { ctrlKey: true, shiftKey: true })
		await nextFrame()

		expect(nodes('.so-table-column').map(text)).toEqual(['Возраст', 'Имя'])
		expect(nodes('.so-table-row__cell').map(text)).toEqual(['30', 'Анна'])
		expect(move).toHaveBeenCalledTimes(1)
		expect(move.mock.calls[0][0].order).toEqual(['age', 'name'])
	})

	/**
	 * Признак тела — `data-reorder-preview` — ставит корню расширение колонок,
	 * и только на время жеста в `column`: на покое его нет ни в одном режиме, и
	 * правила тела темы ячейкам ничего не стоят.
	 */
	it('data-reorder-preview — только в жесте column: на покое и в head его нет', async () => {
		const engine = engineOf('none', [ANNA], [...MOVABLE])
		const { columns } = engine.extensions
		const props = reactiveProps<TableProps>({ engine, reorderPreview: 'head' })

		await render(Table, props)

		const table = node('table.so-table')
		const [name] = columns.columns

		expect(table.hasAttribute('data-reorder-preview')).toBe(false)

		// head — нет и в жесте
		act(() => columns.dragStart(name))

		expect(table.hasAttribute('data-reorder-preview')).toBe(false)

		act(() => {
			columns.dragCancel()
			props.reorderPreview = 'column'
		})

		expect(table.hasAttribute('data-reorder-preview')).toBe(false)

		act(() => {
			columns.dragStart(name)
			columns.dragOver(1)
			columns.dragDrop()
		})

		expect(table.dataset.reorderPreview).toBe('column')

		// Встала — признак ушёл той же записью, что и перестановка
		act(() => columns.dragEnd())

		expect(nodes('.so-table-column').map(text)).toEqual(['Возраст', 'Имя'])
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

		await render(Table, { engine })

		const [name] = columns.columns

		act(() => {
			columns.dragStart(name)
			columns.dragOver(2)
			columns.dragDrop()
		})

		expect(nodes('.so-table-column').map(gesture)).toEqual([
			['dragging=true', 'landing=true'],
			['shift=start'],
			['drop=after', 'shift=start'],
		])

		act(() => columns.dragEnd())

		expect(nodes('.so-table-column').map(text)).toEqual(['Возраст', '№', 'Имя'])
		expect(nodes('.so-table-row__cell').map(text)).toEqual(['30', '1', 'Анна'])
		expect(nodes('.so-table-column').flatMap(gesture)).toEqual([])
	})
})

/**
 * Сетка — наборы коллекции в разметке и плагин сетки на корне. Ходьбу и выбор
 * считает ядро (`core/__tests__/table-grid.spec.ts`), клавиши — плагин
 * (`plugins/__tests__/table-grid.plugin.spec.ts`). Здесь — что наборы доезжают
 * до своих узлов, а плагин находит ячейки в разметке Svelte: узлы строк из
 * реестра, ячейки по колонкам сетки.
 */
describe('сетка', () => {
	it('роль grid и остановка Tab — у таблицы, ячейки и заголовки фокус только принимают', async () => {
		await render(Table, {
			items: [{ data: ANNA }, { data: BORIS }],
			columns: [NAME, AGE],
			mode: 'multiple',
			grid: true,
		})

		const table = node('.so-table')

		expect(table.getAttribute('role')).toBe('grid')
		expect(table.getAttribute('tabindex')).toBe('0')
		expect(table.getAttribute('aria-multiselectable')).toBe('true')
		expect(table.dataset.grid).toBe('true')
		expect(node('.so-table__select').getAttribute('tabindex')).toBe('-1')

		for (const header of nodes('.so-table-column')) {
			expect(header.getAttribute('tabindex')).toBe('-1')
		}

		for (const cell of nodes('.so-table-row__cell, .so-table-row__select')) {
			expect(cell.getAttribute('tabindex')).toBe('-1')
		}

		expect(nodes('.so-table-row').map((row) => row.getAttribute('aria-selected'))).toEqual([
			'false',
			'false',
		])
	})

	it('без сетки — простая таблица: ни роли, ни tabindex, ни aria-selected', async () => {
		await render(Table, { items: [{ data: ANNA }], columns: [NAME], mode: 'multiple' })

		expect(node('.so-table').hasAttribute('role')).toBe(false)
		expect(node('.so-table').hasAttribute('tabindex')).toBe(false)
		expect(node('.so-table-row__cell').hasAttribute('tabindex')).toBe(false)
		expect(node('.so-table-row').hasAttribute('aria-selected')).toBe(false)
	})

	it('Tab в таблицу — на ячейку, стрелка — на соседнюю, пробел — выбор строки', async () => {
		const engine = engineOf('multiple')

		engine.extensions.grid.grid = true

		await render(Table, { engine })

		act(() => node('.so-table').focus())

		// Выбор включили после колонок — фокус сетки на первой из них
		expect(document.activeElement).toBe(node('.so-table-column'))

		press(focused(), 'ArrowDown')

		const cell = node('.so-table-row th')

		expect(document.activeElement).toBe(cell)

		press(cell, ' ')

		expect(engine.extensions.selection.selected).toEqual([rowOf(engine, 1)])
		expect(node('.so-table-row').getAttribute('aria-selected')).toBe('true')
	})
})

/**
 * Выбор пишет строке `data-selected` (в сетке ещё `aria-selected`), и Svelte
 * переписывает атрибуты строки — только их. Содержимое ячейки читает ячейку
 * (`cells` строки) и сниппет `cell`, а выбор не меняет ни того, ни другого, — и
 * сниппет ячеек не перерисовывается. Иначе «выбрать все» перерисовывало бы
 * сниппет в каждой ячейке таблицы. Перерисовывают его новая запись строки —
 * только в её ячейках — и новый сниппет.
 *
 * В DOM лишняя перерисовка следов не оставляет — значения те же, — поэтому
 * считаются отрисовки сниппета: каждое его чтение scope (`countedText`).
 * Сколько их при монтировании, проверяет отдельный тест; в остальных счёт
 * сбрасывается после монтирования.
 */
describe('перерисовка ячеек', () => {
	/** Scope слота `cell`. */
	type TCellScope = { row: ITableRow; column: ITableColumn; value: unknown }

	/** Отрисовки сниппета `cell` — scope каждой — и сам сниппет: значение текстом, по `format`. */
	function cellSlot(format: (value: unknown) => string = String) {
		const draws: TCellScope[] = []
		const snippet = countedText<TCellScope>(
			({ value }) => format(value),
			(scope) => draws.push(scope),
		)

		return { draws, snippet }
	}

	/**
	 * Таблица над движком со сниппетом под счётом; счёт сброшен после
	 * монтирования. Сниппет и имя таблицы — пропсы: их смена — новый проп от
	 * родителя.
	 */
	async function renderCounted(engine: TTableCollection) {
		const slot = cellSlot()
		const props = reactiveProps<TableProps>({ engine, cell: slot.snippet })

		await render(Table, props)

		// Ячейки нарисованы сниппетом: иначе счёт ниже ничего бы не стерёг
		expect(slot.draws.length).toBeGreaterThan(0)
		slot.draws.length = 0

		return { slot, props }
	}

	/** Текст ячеек по строкам. */
	const cellTexts = () =>
		nodes('.so-table-row').map((row) => nodes('.so-table-row__cell', row).map(text))

	it('монтирование рисует сниппет по разу на ячейку', async () => {
		const slot = cellSlot()

		await render(Table, { engine: engineOf('none'), cell: slot.snippet })

		expect(cellTexts()).toEqual([
			['Анна', '30'],
			['Борис', '41'],
			['Вера', '25'],
		])
		expect(slot.draws).toHaveLength(6)
	})

	it('«выбрать все» и снятие выбора сниппет ячеек не перерисовывают', async () => {
		const { slot } = await renderCounted(engineOf('multiple'))
		const head = checkBoxInput('.so-table__select')

		click(head)

		expect(rowsSelected()).toEqual(['true', 'true', 'true'])

		click(head)

		expect(rowsSelected()).toEqual(['false', 'false', 'false'])
		expect(cellTexts()).toEqual([
			['Анна', '30'],
			['Борис', '41'],
			['Вера', '25'],
		])
		expect(slot.draws).toEqual([])
	})

	it('смена пропа таблицы сниппет ячеек не перерисовывает', async () => {
		const { slot, props } = await renderCounted(engineOf('none'))

		act(() => (props.aria_label = 'Сотрудники'))

		expect(node('.so-table').getAttribute('aria-label')).toBe('Сотрудники')
		expect(slot.draws).toEqual([])
	})

	it('запись строки сменилась — перерисованы ячейки этой строки, и только её', async () => {
		const engine = engineOf('none')
		const { slot } = await renderCounted(engine)

		act(() => (rowOf(engine, 2).data = { ...BORIS, age: 42 }))

		expect(cellTexts()).toEqual([
			['Анна', '30'],
			['Борис', '42'],
			['Вера', '25'],
		])
		expect(slot.draws.map((scope) => idOf(scope.row.data))).toEqual([2, 2])
	})

	/**
	 * Ячейки строки — новые записи на каждую смену, а петля держит узел ячейки
	 * по колонке: новая запись рисуется в том же узле, и фокус сетки на нём
	 * остаётся.
	 */
	it('запись строки сменилась — узлы её ячеек те же', async () => {
		const engine = engineOf('none')

		await render(Table, { engine })

		const boris = nodes('.so-table-row')[1]
		const before = nodes('.so-table-row__cell', boris)

		act(() => (rowOf(engine, 2).data = { ...BORIS, age: 42 }))

		const after = nodes('.so-table-row__cell', boris)

		expect(after.map(text)).toEqual(['Борис', '42'])
		after.forEach((cell, index) => expect(cell).toBe(before[index]))
	})

	it('в сетке выбор пробелом сниппет ячеек не перерисовывает', async () => {
		const engine = engineOf('multiple')

		engine.extensions.grid.grid = true

		const { slot } = await renderCounted(engine)

		act(() => node('.so-table').focus())
		press(focused(), 'ArrowDown')

		const cell = node('.so-table-row th')

		expect(document.activeElement).toBe(cell)

		press(cell, ' ')

		expect(engine.extensions.selection.selected).toEqual([rowOf(engine, 1)])
		expect(node('.so-table-row').getAttribute('aria-selected')).toBe('true')
		expect(slot.draws).toEqual([])
	})

	it('новый сниппет — ячейки всех строк нарисованы им', async () => {
		const { slot, props } = await renderCounted(engineOf('none'))
		const next = cellSlot((value) => `${String(value)}!`)

		act(() => (props.cell = next.snippet))

		expect(cellTexts()).toEqual([
			['Анна!', '30!'],
			['Борис!', '41!'],
			['Вера!', '25!'],
		])
		expect(next.draws).toHaveLength(6)
		expect(slot.draws).toEqual([])
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

		await render(Table, { engine })

		const anna = node('.so-table-row')
		const input = checkBoxInput('.so-table-row__select', anna)

		click(input)

		expect(engine.extensions.selection.selected).toEqual([])
		expect(input.checked).toBe(false)
		expect(anna.dataset.selected).toBe('false')
	})

	it('чекбокс шапки: выбор отменён — поле не отмечено и не «часть»', async () => {
		const engine = engineOf('multiple')

		engine.extensions.selection.events.on('item:select:before', (e) => e.preventDefault())

		await render(Table, { engine })

		const head = checkBoxInput('.so-table__select')

		click(head)

		expect(engine.extensions.selection.selected).toEqual([])
		expect([head.checked, head.indeterminate]).toEqual([false, false])
	})

	it('чекбокс шапки из «части»: выбор отменён — «часть» остаётся', async () => {
		const engine = engineOf('multiple')

		engine.extensions.selection.select(rowOf(engine, 1))
		engine.extensions.selection.events.on('item:select:before', (e) => e.preventDefault())

		await render(Table, { engine })

		const head = checkBoxInput('.so-table__select')

		click(head)

		expect(engine.extensions.selection.selected).toEqual([rowOf(engine, 1)])
		expect([head.checked, head.indeterminate]).toEqual([false, true])
	})
})

/**
 * Окно (обёртка `Virtual`): тело рисует то, что отдаёт коллекция (`drawn`), —
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

	/** Таблица над движком в обёртке `Virtual`. */
	const inWindow = (engine: TTableCollection) =>
		render(Windowed, { kind: 'table', table: { engine } })

	/** Замер, как его подаёт плагин окна: полоса от верха таблицы и шаг строк. */
	function measure(engine: TTableCollection, top: number, bottom: number): void {
		act(() => engine.extensions.draw.notifyViewport({ top, bottom, step: 40 }))
	}

	/** Строка по номеру среди строк таблицы (`aria-rowindex`). */
	const rowAt = (index: string) =>
		nodes('.so-table-row').find((row) => row.getAttribute('aria-rowindex') === index)

	it('до замера — первые 50 строк; у таблицы число строк, у шапки и строк — номера', async () => {
		await inWindow(manyRows(80))

		const rows = nodes('.so-table-row')
		const table = node('table.so-table')

		expect(rows).toHaveLength(50)
		expect(table.getAttribute('aria-rowcount')).toBe('81')
		expect(table.dataset.virtual).toBe('true')
		expect(node('.so-table__head-row').getAttribute('aria-rowindex')).toBe('1')
		expect(rows[0].getAttribute('aria-rowindex')).toBe('2')
	})

	it('по замеру — распорки на месте пропущенных: скрыты, во всю ширину, высотой в строки', async () => {
		const engine = manyRows(80)

		await inWindow(engine)

		measure(engine, 1200, 1600)

		const body = node('.so-table__body')
		const fillers = nodes('.so-table__filler-row', body)

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
		expect(node('.so-table__filler', fillers[0]).getAttribute('colspan')).toBe('3')
		expect(nodes('.so-table-row', body)).toHaveLength(30)
	})

	/**
	 * Строки и распорки — одной петлёй по ключу записи: строка, которая
	 * осталась в окне, — тот же узел, хотя распорка перед ней сменилась.
	 */
	it('строка, оставшаяся в окне, при сдвиге окна не перемонтируется', async () => {
		const engine = manyRows(80)

		await inWindow(engine)

		measure(engine, 1200, 1600)

		const kept = rowAt('40')

		measure(engine, 1240, 1640)

		expect(kept).toBeDefined()
		expect(rowAt('40')).toBe(kept)
	})

	it('без обёртки — все строки, без распорок и номеров', async () => {
		await render(Table, { items: [ANNA, BORIS].map((data) => ({ data })), columns: [NAME] })

		expect(nodes('.so-table-row')).toHaveLength(2)
		expect(nodes('.so-table__filler-row')).toEqual([])
		expect(node('table.so-table').hasAttribute('aria-rowcount')).toBe(false)
		expect(node('.so-table__head-row').hasAttribute('aria-rowindex')).toBe(false)
	})
})

/**
 * Закреплённая шапка (`stickyHead`) — свойство таблицы: ядро пишет его в
 * набор `dataset`, разметка раскладывает набор на корне. Закрепляет шапку
 * тема (`playground/vue/browser/table-sticky-head.spec.ts`).
 */
describe('закреплённая шапка', () => {
	it('data-sticky-head на корне — по пропу и вместе с ним', async () => {
		const props = reactiveProps<TableProps>({ engine: engineOf('none'), stickyHead: false })

		await render(Table, props)

		const table = node('table.so-table')

		expect(table.dataset.stickyHead).toBe('false')

		act(() => (props.stickyHead = true))

		expect(table.dataset.stickyHead).toBe('true')

		act(() => (props.stickyHead = false))

		expect(table.dataset.stickyHead).toBe('false')
	})

	it('с инстанса: шапку закрепили — атрибут на корне', async () => {
		const owner = new TTable()

		await render(Table, { ctrl: owner, engine: engineOf('none') })

		expect(node('table.so-table').dataset.stickyHead).toBe('false')

		act(() => (owner.stickyHead = true))

		expect(node('table.so-table').dataset.stickyHead).toBe('true')
	})
})

describe('типы', () => {
	/** Тип проверяет не vitest, а шаг CI «Типы — Svelte». */
	it('сниппеты таблицы несут scope из дескриптора', () => {
		expectTypeOf<
			Snippet<[{ column: ITableColumn; text: string; sortable: boolean }]>
		>().toExtend<NonNullable<TableProps['header']>>()
		expectTypeOf<
			Snippet<[{ row: ITableRow; column: ITableColumn; value: unknown }]>
		>().toExtend<NonNullable<TableProps['cell']>>()
		expectTypeOf<Snippet>().toExtend<NonNullable<TableProps['empty']>>()
	})

	it('колбэки фасада — пропсы таблицы', () => {
		expectTypeOf<TableProps>().toHaveProperty('onColumnResize')
		expectTypeOf<TableProps>().toHaveProperty('onColumnMove')
		expectTypeOf<TableProps>().toHaveProperty('onChangeSelection')
		expectTypeOf<TableProps>().toHaveProperty('onEngineCreate')
	})
})
