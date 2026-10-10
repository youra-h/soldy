/**
 * Table во Vue — проводка на настоящей разметке.
 *
 * Модель — колонки, ячейки, сортировку, счёт выбора и чекбоксы колонки выбора
 * — проверяет ядро (`core/__tests__/table*.spec.ts`), раскладку и вид —
 * браузер (`playground/vue/browser/table.spec.ts`). Здесь важно, что выходы
 * коллекции доезжают туда, куда должны: колонки — в заголовки, строки — в
 * `tbody` в порядке сортировки, ячейки — в строки, а нажатия по кнопкам
 * сортировки и чекбоксам доходят до модели и возвращаются в разметку — и
 * тогда, когда модель выбор отменила.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import {
	defineComponent,
	h,
	isProxy,
	isVNode,
	nextTick,
	ref,
	type ComponentInternalInstance,
	type ComponentOptions,
	type VNode,
} from 'vue'
import { LocaleProvider, Table, TableColumn, TableRow, Virtual } from '@soldy-ui/vue'
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
import type { TLocale } from '@soldy-ui/plugins'
import Harness from './Table.test.vue'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** Смонтировать и дождаться кадра: корень плагины получают через `requestAnimationFrame`. */
async function render(content: () => VNode): Promise<void> {
	wrapper = mount(defineComponent({ render: content }), { attachTo: document.body })

	await settle()
}

/** Перерисовка и кадр: новые узлы объявляют себя плагинам кадром позже. */
async function settle(): Promise<void> {
	await nextTick()
	await nextFrame()
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

/** Поле чекбокса по селектору его обёртки. */
function checkBoxInput(selector: string, root: ParentNode = document): HTMLInputElement {
	const input = find(selector, root).querySelector('input')

	if (!(input instanceof HTMLInputElement)) throw new Error(`${selector}: поля чекбокса нет`)

	return input
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

/** Строки `tbody` — по тексту ячейки заголовка. */
const rowNames = () => findAll('.s-table-row').map((row) => text(find('th', row)))

describe('разметка', () => {
	it('шапка — показанные колонки, тело — строки, в строке — ячейки по колонкам', async () => {
		await render(() =>
			h(Table, {
				items: [ANNA, BORIS].map((data) => ({ data })),
				columns: [NAME, AGE],
			}),
		)

		const table = find('table.s-table')

		expect(findAll('.s-table__head-row > th', table).map(text)).toEqual(['Имя', 'Возраст'])
		expect(findAll('.s-table-row').map((row) => [...row.children].map(text))).toEqual([
			['Анна', '30'],
			['Борис', '41'],
		])
		// Колонки выбора нет: режим по умолчанию — `none`
		expect(findAll('.s-table__select, .s-table-row__select')).toEqual([])
	})

	it('заголовок колонки — th с набором колонки и шириной переменной', async () => {
		await render(() =>
			h(Table, {
				items: [{ data: ANNA }],
				columns: [NAME, { ...AGE, width: 120 }],
			}),
		)

		const [name, age] = findAll('.s-table-column')

		expect(age.tagName).toBe('TH')
		expect(age.dataset.align).toBe('end')
		expect(age.style.getPropertyValue('--s-table-column-width')).toBe('120px')
		expect(name.style.getPropertyValue('--s-table-column-width')).toBe('')
	})

	it('ячейка колонки rowHeader — th scope="row" с id, остальные — td', async () => {
		await render(() => h(Table, { items: [{ data: ANNA }], columns: [AGE, NAME] }))

		const [age, name] = [...find('.s-table-row').children]

		expect(age.tagName).toBe('TD')
		expect(age.getAttribute('data-align')).toBe('end')
		expect(name.tagName).toBe('TH')
		expect(name.getAttribute('scope')).toBe('row')
		expect(name.id).not.toBe('')
	})

	it('Table.Column и Table.Row — части таблицы', () => {
		expect(Table.Column).toBe(TableColumn)
		expect(Table.Row).toBe(TableRow)
	})

	it('окно вокруг таблицы: корень, классы и наборы — у table, а не у окна', async () => {
		await render(() =>
			h(Table, {
				items: [{ data: ANNA }],
				columns: [NAME],
				stickyHead: true,
				aria_label: 'Сотрудники',
			}),
		)

		const table = find('table.s-table')
		const viewport = find('.s-table__viewport')

		expect(table.parentElement).toBe(viewport)
		expect(viewport.tagName).toBe('DIV')
		expect(table.dataset.stickyHead).toBe('true')
		expect(table.getAttribute('aria-label')).toBe('Сотрудники')
		// У окна — только свой класс: ни наборов, ни имени
		expect(viewport.className).toBe('s-table__viewport')
		expect(
			viewport.getAttributeNames().filter((name) => name !== 'class' && name !== 'style'),
		).toEqual([])
	})

	it('атрибуты потребителя — окну: оно внешний узел компонента', async () => {
		await render(() =>
			h(Table, {
				items: [{ data: ANNA }],
				columns: [NAME],
				class: 'staff',
				'data-testid': 'staff',
			}),
		)

		const viewport = find('.s-table__viewport')

		expect(viewport.classList.contains('staff')).toBe(true)
		expect(viewport.dataset.testid).toBe('staff')
		expect(find('table.s-table').hasAttribute('data-testid')).toBe(false)
	})

	it('скрытая таблица прячет окно: v-show — на окне', async () => {
		await render(() => h(Table, { items: [{ data: ANNA }], columns: [NAME], visible: false }))

		expect(find('.s-table__viewport').style.display).toBe('none')
	})
})

/**
 * Ширины колонок без своей ширины раскладывает ядро по месту таблицы и её
 * `columnFit` (`core/__tests__/table-layout.spec.ts`), место мерит плагин
 * (`plugins/__tests__/table-layout.plugin.spec.ts`), раскладку в браузере —
 * `playground/vue/browser/table.spec.ts`. Здесь — что проп доходит до
 * таблицы, а ширины раскладки и `data-overflow` — до разметки.
 */
describe('раскладка колонок', () => {
	/** Колонки заголовков — переменные ширины по порядку. */
	const widths = () =>
		findAll('.s-table-column').map((header) =>
			header.style.getPropertyValue('--s-table-column-width'),
		)

	it('columnFit none — ширины по умолчанию сразу, без места; признака места нет', async () => {
		await render(() =>
			h(Table, { items: [{ data: ANNA }], columns: [NAME, AGE], columnFit: 'none' }),
		)

		expect(widths()).toEqual(['160px', '160px'])
		expect(findAll('.s-table-column').map((header) => header.dataset.sized)).toEqual([
			'true',
			'true',
		])
		expect(find('table.s-table').hasAttribute('data-overflow')).toBe(false)
	})

	it('по умолчанию auto — до места ширин нет, с местом — делят его', async () => {
		const engine = engineOf('none', [ANNA])

		await render(() => h(Table, { engine }))

		expect(widths()).toEqual(['', ''])

		engine.extensions.columns.notifySpace(500)
		await settle()

		expect(widths()).toEqual(['250px', '250px'])
		expect(find('table.s-table').dataset.overflow).toBe('false')
	})

	it('смена columnFit пропом — новая раскладка; шире места — data-overflow', async () => {
		const engine = engineOf('none', [ANNA])
		const fit = ref<TTableColumnFit>('none')

		await render(() => h(Table, { engine, columnFit: fit.value }))

		engine.extensions.columns.notifySpace(600)
		await settle()

		expect(widths()).toEqual(['160px', '160px'])
		expect(find('table.s-table').dataset.overflow).toBe('false')

		fit.value = 'auto'
		await settle()

		expect(widths()).toEqual(['300px', '300px'])

		engine.extensions.columns.notifySpace(300)
		await settle()

		expect(widths()).toEqual(['160px', '160px'])
		expect(find('table.s-table').dataset.overflow).toBe('true')
	})
})

describe('слоты', () => {
	it('header — содержимое заголовка по колонке, и у сортируемой тоже', async () => {
		await render(() =>
			h(
				Table,
				{ items: [{ data: ANNA }], columns: [NAME, AGE] },
				{
					header: ({ column }: { column: ITableColumn }) =>
						h('b', `${column.field}:${column.text}`),
				},
			),
		)

		expect(findAll('.s-table-column b').map(text)).toEqual(['name:Имя', 'age:Возраст'])
		expect(text(find('.s-table-column__sort'))).toBe('age:Возраст')
	})

	/**
	 * `header` — проброс слота заголовка колонки: рядом с колонкой в scope то,
	 * что отдаёт слот самого заголовка, — текст и сортируемость.
	 */
	it('header получает текст и сортируемость колонки — scope слота заголовка', async () => {
		await render(() =>
			h(
				Table,
				{ items: [{ data: ANNA }], columns: [NAME, AGE] },
				{
					header: ({
						column,
						text: caption,
						sortable,
					}: {
						column: ITableColumn
						text: string
						sortable: boolean
					}) => h('b', `${column.field}:${caption}:${String(sortable)}`),
				},
			),
		)

		expect(findAll('.s-table-column b').map(text)).toEqual([
			'name:Имя:false',
			'age:Возраст:true',
		])
	})

	it('cell — содержимое ячейки по строке, колонке и значению', async () => {
		await render(() =>
			h(
				Table,
				{ items: [{ data: ANNA }, { data: BORIS }], columns: [NAME, AGE] },
				{
					cell: ({
						row,
						column,
						value,
					}: {
						row: ITableRow
						column: ITableColumn
						value: unknown
					}) =>
						column.field === 'age'
							? h('i', `${String(idOf(row.data))}/${String(value)}`)
							: String(value),
				},
			),
		)

		expect(findAll('.s-table-row').map((row) => [...row.children].map(text))).toEqual([
			['Анна', '1/30'],
			['Борис', '2/41'],
		])
	})

	it('empty — пока строк нет, ячейка во всю ширину строки', async () => {
		await render(() =>
			h(Table, { columns: [NAME, AGE], mode: 'multiple' }, { empty: () => 'Нет данных' }),
		)

		const cell = find('.s-table__empty')

		expect(text(cell)).toBe('Нет данных')
		// Две колонки и колонка выбора
		expect(cell.getAttribute('colspan')).toBe('3')
	})

	it('строки появились — пустой строки нет', async () => {
		await render(() => h(Table, { items: [{ data: ANNA }], columns: [NAME] }))

		expect(findAll('.s-table__empty-row')).toEqual([])
	})
})

describe('сортировка', () => {
	it('кнопка заголовка сортирует строки: по возрастанию, по убыванию, снята', async () => {
		await render(() => h(Table, { engine: engineOf('none') }))

		const age = findAll('.s-table-column')[1]
		const button = find('.s-table-column__sort', age)

		expect(rowNames()).toEqual(['Анна', 'Борис', 'Вера'])

		button.click()
		await settle()

		expect(rowNames()).toEqual(['Вера', 'Анна', 'Борис'])
		expect(age.getAttribute('aria-sort')).toBe('ascending')
		expect(age.dataset.sort).toBe('asc')

		button.click()
		await settle()

		expect(rowNames()).toEqual(['Борис', 'Анна', 'Вера'])
		expect(age.getAttribute('aria-sort')).toBe('descending')

		button.click()
		await settle()

		expect(rowNames()).toEqual(['Анна', 'Борис', 'Вера'])
		expect(age.hasAttribute('aria-sort')).toBe(false)
	})

	it('кнопка — только у сортируемой колонки; отметка скрыта от скринридера', async () => {
		await render(() => h(Table, { engine: engineOf('none') }))

		const [name, age] = findAll('.s-table-column')

		expect(findAll('.s-table-column__sort', name)).toEqual([])
		expect(text(find('.s-table-column__text', name))).toBe('Имя')
		expect(find('.s-table-column__sort-icon', age).getAttribute('aria-hidden')).toBe('true')
		expect(age.querySelector('.s-table-column__sort-icon svg')).not.toBeNull()
	})

	it('выключенная таблица — кнопка выключена, порядок прежний', async () => {
		await render(() => h(Table, { engine: engineOf('none'), disabled: true }))

		const button = find('.s-table-column__sort')

		expect(button.hasAttribute('disabled')).toBe(true)

		button.click()
		await settle()

		expect(rowNames()).toEqual(['Анна', 'Борис', 'Вера'])
	})
})

describe('колонка выбора', () => {
	it('multiple — заголовок с чекбоксом «выбрать все», single — пустая ячейка, у строк — чекбоксы', async () => {
		await render(() => h(Table, { engine: engineOf('multiple') }))

		const head = find('.s-table__select')

		expect(head.tagName).toBe('TH')
		expect(findAll('.s-check-box', head)).toHaveLength(1)
		expect(findAll('.s-table-row__select .s-check-box')).toHaveLength(3)

		wrapper?.unmount()
		await render(() => h(Table, { engine: engineOf('single') }))

		const single = find('.s-table__select')

		expect(single.tagName).toBe('TD')
		expect(single.children).toHaveLength(0)
		expect(findAll('.s-table-row__select .s-check-box')).toHaveLength(3)
	})

	it('колонка появляется и уходит вместе с режимом', async () => {
		const engine = engineOf('none')

		await render(() => h(Table, { engine }))

		expect(findAll('.s-table__select, .s-table-row__select')).toEqual([])

		engine.extensions.selection.mode = 'multiple'
		await settle()

		expect(findAll('.s-table-row__select')).toHaveLength(3)

		engine.extensions.selection.mode = 'none'
		await settle()

		expect(findAll('.s-table__select, .s-table-row__select')).toEqual([])
	})

	it('клик по чекбоксу строки выбирает строку, повторный — снимает', async () => {
		const engine = engineOf('multiple')

		await render(() => h(Table, { engine }))

		const anna = find('.s-table-row')
		const input = checkBoxInput('.s-table-row__select', anna)

		input.click()
		await settle()

		expect(engine.extensions.selection.selected).toEqual([rowOf(engine, 1)])
		expect(input.checked).toBe(true)
		expect(anna.dataset.selected).toBe('true')

		input.click()
		await settle()

		expect(engine.extensions.selection.selected).toEqual([])
		expect(input.checked).toBe(false)
		expect(anna.dataset.selected).toBe('false')
	})

	it('строки, выбранные по одной до всех, выбора не теряют; шапка — «часть», потом отмечена', async () => {
		const engine = engineOf('multiple')

		await render(() => h(Table, { engine }))

		const head = checkBoxInput('.s-table__select')
		const inputs = findAll('.s-table-row').map((row) =>
			checkBoxInput('.s-table-row__select', row),
		)

		inputs[0].click()
		await settle()

		expect([head.checked, head.indeterminate]).toEqual([false, true])

		inputs[1].click()
		inputs[2].click()
		await settle()

		expect(engine.extensions.selection.selected).toHaveLength(3)
		expect(inputs.map((input) => input.checked)).toEqual([true, true, true])
		expect([head.checked, head.indeterminate]).toEqual([true, false])
	})

	it('чекбокс шапки: «часть» → все → ни одной', async () => {
		const engine = engineOf('multiple')

		engine.extensions.selection.select(rowOf(engine, 2))

		await render(() => h(Table, { engine }))

		const head = checkBoxInput('.s-table__select')
		const inputs = () =>
			findAll('.s-table-row').map((row) => checkBoxInput('.s-table-row__select', row).checked)

		expect([head.checked, head.indeterminate]).toEqual([false, true])

		head.click()
		await settle()

		expect(engine.extensions.selection.selected).toHaveLength(3)
		expect([head.checked, head.indeterminate]).toEqual([true, false])
		expect(inputs()).toEqual([true, true, true])

		head.click()
		await settle()

		expect(engine.extensions.selection.selected).toEqual([])
		expect([head.checked, head.indeterminate]).toEqual([false, false])
		expect(inputs()).toEqual([false, false, false])
	})

	it('выбор снаружи доезжает до чекбоксов', async () => {
		const engine = engineOf('multiple')

		await render(() => h(Table, { engine }))

		engine.extensions.selection.select(rowOf(engine, 3))
		await settle()

		const vera = findAll('.s-table-row')[2]

		expect(checkBoxInput('.s-table-row__select', vera).checked).toBe(true)
		expect(checkBoxInput('.s-table__select').indeterminate).toBe(true)
	})

	it('пустая таблица и выключенные строки — чекбокс шапки выключен', async () => {
		const engine = engineOf('multiple', [])

		await render(() => h(Table, { engine }))

		expect(checkBoxInput('.s-table__select').disabled).toBe(true)

		engine.extensions.batch.items = [{ data: { ...ANNA } }]
		await settle()

		expect(checkBoxInput('.s-table__select').disabled).toBe(false)

		rowOf(engine, 1).disabled = true
		await settle()

		expect(checkBoxInput('.s-table__select').disabled).toBe(true)
		expect(checkBoxInput('.s-table-row__select').disabled).toBe(true)
	})

	it('чекбоксы — размера и варианта таблицы', async () => {
		const owner = new TTable({ size: 'lg' })

		await render(() => h(Table, { ctrl: owner, engine: engineOf('multiple') }))

		expect(find('.s-table__select .s-check-box').classList).toContain('s-check-box--size-lg')
		expect(find('.s-table-row__select .s-check-box').classList).toContain(
			's-check-box--size-lg',
		)
	})
})

describe('имена чекбоксов', () => {
	it('чекбокс строки называет заголовок строки — ячейка колонки rowHeader', async () => {
		await render(() => h(Table, { engine: engineOf('multiple') }))

		const anna = find('.s-table-row')
		const input = checkBoxInput('.s-table-row__select', anna)
		const header = find('th[scope="row"]', anna)

		expect(input.getAttribute('aria-labelledby')).toBe(header.id)
		expect(text(header)).toBe('Анна')

		// У каждой строки — свой заголовок
		const ids = findAll('th[scope="row"]').map((cell) => cell.id)

		expect(new Set(ids).size).toBe(3)
	})

	it('без колонки rowHeader у чекбокса строки ссылки нет', async () => {
		await render(() =>
			h(Table, {
				engine: engineOf('multiple', [ANNA], [{ ...NAME, rowHeader: false }, AGE]),
			}),
		)

		expect(checkBoxInput('.s-table-row__select').hasAttribute('aria-labelledby')).toBe(false)
		expect(findAll('th[scope="row"]')).toEqual([])
	})

	it('чекбокс шапки — имя от локали поддерева, на лету', async () => {
		const locale = ref<TLocale>(enUS)
		const engine = engineOf('multiple')

		await render(() => h(LocaleProvider, { locale: locale.value }, () => h(Table, { engine })))

		expect(checkBoxInput('.s-table__select').getAttribute('aria-label')).toBe('Select all')

		locale.value = ruRU
		await nextTick()

		expect(checkBoxInput('.s-table__select').getAttribute('aria-label')).toBe('Выбрать все')
	})
})

/**
 * Ручка ширины — полоса с полем у края заголовка. Какой станет ширина, решает
 * ядро (`core/__tests__/table-columns.spec.ts`), указатель и клавиши ведёт
 * плагин (`plugins/__tests__/table-column-resize.plugin.spec.ts`), протяжку в
 * настоящей раскладке — браузер (`playground/vue/browser/table.spec.ts`).
 * Здесь — что полоса рисуется, когда она есть, имена доходят до разметки, а
 * ширина — до заголовка и наружу событием таблицы.
 */
describe('ручка ширины', () => {
	const RESIZABLE: TTableColumnSource = { ...NAME, resizable: true, width: 150 }

	/** Поле ручки в заголовке. */
	function resizerField(root: ParentNode = document): HTMLInputElement {
		const field = find('.s-table-column__resizer', root).querySelector('input')

		if (!(field instanceof HTMLInputElement)) throw new Error('поля ручки нет')

		return field
	}

	/** Колонка коллекции по полю. */
	function columnOf(engine: TTableCollection, field: string): ITableColumn {
		const found = engine.extensions.columns.columns.find((column) => column.field === field)

		if (!found) throw new Error(`колонки ${field} нет`)

		return found
	}

	it('полоса с полем — у колонки resizable: ход и ширина колонки; у остальных её нет', async () => {
		await render(() =>
			h(Table, {
				items: [{ data: ANNA }],
				columns: [{ ...RESIZABLE, minWidth: 100, maxWidth: 300 }, AGE],
			}),
		)

		const [name, age] = findAll('.s-table-column')
		const field = resizerField(name)

		expect(field.type).toBe('range')
		expect([field.min, field.max, field.value]).toEqual(['100', '300', '150'])
		expect(findAll('.s-table-column__resizer', age)).toEqual([])
	})

	it('колонка без своей ширины — полоса появляется с местом таблицы, ширина — раскладки', async () => {
		const engine = engineOf('none', [ANNA], [{ ...NAME, resizable: true }])

		await render(() => h(Table, { engine }))

		// Места нет — ширину решает тема, и ручке нечего показать
		expect(findAll('.s-table-column__resizer')).toEqual([])

		engine.extensions.columns.notifySpace(180)
		await settle()

		expect(resizerField().value).toBe('180')
		expect(find('.s-table-column').style.getPropertyValue('--s-table-column-width')).toBe(
			'180px',
		)
		// Ширина раскладки — не своя: колонка остаётся гибкой
		expect(columnOf(engine, 'name').getProps().width).toBeUndefined()
	})

	it('у выключенной таблицы ручек нет', async () => {
		await render(() =>
			h(Table, { items: [{ data: ANNA }], columns: [RESIZABLE], disabled: true }),
		)

		expect(findAll('.s-table-column__resizer')).toEqual([])
	})

	it('заголовок и поле названы обёрткой содержимого — ровно текст колонки', async () => {
		await render(() => h(Table, { items: [{ data: ANNA }], columns: [RESIZABLE, AGE] }))

		for (const header of findAll('.s-table-column')) {
			const content = find('.s-table-column__content', header)

			expect(content.id).not.toBe('')
			expect(header.getAttribute('aria-labelledby')).toBe(content.id)
		}

		const name = findAll('.s-table-column')[0]

		expect(resizerField(name).getAttribute('aria-labelledby')).toBe(
			find('.s-table-column__content', name).id,
		)
		expect(text(find('.s-table-column__content', name))).toBe('Имя')
	})

	it('клавиша на поле — ширина заголовка, поле и column:resize таблицы', async () => {
		const resize = vi.fn()
		const engine = engineOf('none', [ANNA], [RESIZABLE])

		await render(() => h(Table, { engine, 'onColumn:resize': resize }))

		const header = find('.s-table-column')

		resizerField().dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
		)
		await settle()

		expect(header.style.getPropertyValue('--s-table-column-width')).toBe('160px')
		expect(header.dataset.sized).toBe('true')
		expect(resizerField().value).toBe('160')
		expect(resize.mock.calls).toEqual([[{ column: columnOf(engine, 'name'), width: 160 }]])
	})
})

/**
 * Перестановку ведёт плагин таблицы, место колонки — расширение коллекции.
 * Здесь — что плагин стоит на корне таблицы и находит её заголовки, а
 * перестановка доезжает до шапки и ячеек строк и уходит наружу `column:move`.
 * Протяжку указателем — `playground/vue/browser/table.spec.ts`.
 */
describe('перестановка колонок', () => {
	const MOVABLE: readonly TTableColumnSource[] = [
		{ ...NAME, reorderable: true },
		{ ...AGE, reorderable: true },
	]

	it('data-reorderable — на заголовке колонки', async () => {
		await render(() => h(Table, { items: [{ data: ANNA }], columns: [MOVABLE[0], AGE] }))

		const [name, age] = findAll('.s-table-column')

		expect(name.dataset.reorderable).toBe('true')
		expect(age.dataset.reorderable).toBe('false')
	})

	it('Ctrl+Shift+← на кнопке сортировки — шапка и ячейки в новом порядке, column:move', async () => {
		const move = vi.fn()
		const engine = engineOf('none', [ANNA], [...MOVABLE])

		await render(() => h(Table, { engine, 'onColumn:move': move }))

		const age = find('.s-table-column__sort')

		age.dispatchEvent(
			new KeyboardEvent('keydown', {
				key: 'ArrowLeft',
				ctrlKey: true,
				shiftKey: true,
				bubbles: true,
				cancelable: true,
			}),
		)
		await settle()

		expect(findAll('.s-table-column').map(text)).toEqual(['Возраст', 'Имя'])
		expect(findAll('.s-table-row__cell').map(text)).toEqual(['30', 'Анна'])
		expect(move).toHaveBeenCalledTimes(1)
		expect(move.mock.calls[0][0].order).toEqual(['age', 'name'])
	})

	it('data-reorder-preview на корне — по пропу и вместе с ним', async () => {
		const preview = ref<TTableReorderPreview>('head')

		await render(() =>
			h(Table, {
				items: [{ data: ANNA }],
				columns: [...MOVABLE],
				reorderPreview: preview.value,
			}),
		)

		const table = find('table.s-table')

		expect(table.dataset.reorderPreview).toBe('head')

		preview.value = 'column'
		await settle()

		expect(table.dataset.reorderPreview).toBe('column')
	})

	/**
	 * Метки жеста пишет расширение колонок, рисует их тема; здесь — что они
	 * доезжают до заголовков и уходят вместе с перестановкой одной
	 * перерисовкой.
	 */
	it('метки жеста — на заголовках: data-shift, data-landing; встала — меток нет', async () => {
		const ID: TTableColumnSource = { field: 'id', text: '№', reorderable: true }
		const engine = engineOf('none', [ANNA], [...MOVABLE, ID])
		const { columns } = engine.extensions
		const gesture = (header: HTMLElement) =>
			['dragging', 'landing', 'drop', 'shift']
				.filter((mark) => header.hasAttribute(`data-${mark}`))
				.map((mark) => `${mark}=${header.getAttribute(`data-${mark}`)}`)

		await render(() => h(Table, { engine }))

		const [name] = columns.columns

		columns.dragStart(name)
		columns.dragOver(2)
		columns.dragDrop()
		await settle()

		expect(findAll('.s-table-column').map(gesture)).toEqual([
			['dragging=true', 'landing=true'],
			['shift=start'],
			['drop=after', 'shift=start'],
		])

		columns.dragEnd()
		await settle()

		expect(findAll('.s-table-column').map(text)).toEqual(['Возраст', '№', 'Имя'])
		expect(findAll('.s-table-row__cell').map(text)).toEqual(['30', '1', 'Анна'])
		expect(findAll('.s-table-column').flatMap(gesture)).toEqual([])
	})
})

/**
 * Сетка — наборы коллекции в разметке и плагин сетки на корне. Ходьбу и выбор
 * считает ядро (`core/__tests__/table-grid.spec.ts`), клавиши — плагин
 * (`plugins/__tests__/table-grid.plugin.spec.ts`). Здесь — что наборы доезжают
 * до своих узлов, а плагин находит ячейки в разметке Vue: узлы строк из
 * реестра, ячейки по колонкам сетки.
 */
describe('сетка', () => {
	it('роль grid и остановка Tab — у таблицы, ячейки и заголовки фокус только принимают', async () => {
		await render(() =>
			h(Table, {
				items: [{ data: ANNA }, { data: BORIS }],
				columns: [NAME, AGE],
				mode: 'multiple',
				grid: true,
			}),
		)

		const table = find('.s-table')

		expect(table.getAttribute('role')).toBe('grid')
		expect(table.getAttribute('tabindex')).toBe('0')
		expect(table.getAttribute('aria-multiselectable')).toBe('true')
		expect(table.dataset.grid).toBe('true')
		expect(find('.s-table__select').getAttribute('tabindex')).toBe('-1')

		for (const header of findAll('.s-table-column')) {
			expect(header.getAttribute('tabindex')).toBe('-1')
		}

		for (const cell of findAll('.s-table-row__cell, .s-table-row__select')) {
			expect(cell.getAttribute('tabindex')).toBe('-1')
		}

		expect(findAll('.s-table-row').map((row) => row.getAttribute('aria-selected'))).toEqual([
			'false',
			'false',
		])
	})

	it('без сетки — простая таблица: ни роли, ни tabindex, ни aria-selected', async () => {
		await render(() => h(Table, { items: [{ data: ANNA }], columns: [NAME], mode: 'multiple' }))

		expect(find('.s-table').hasAttribute('role')).toBe(false)
		expect(find('.s-table').hasAttribute('tabindex')).toBe(false)
		expect(find('.s-table-row__cell').hasAttribute('tabindex')).toBe(false)
		expect(find('.s-table-row').hasAttribute('aria-selected')).toBe(false)
	})

	it('Tab в таблицу — на ячейку, стрелка — на соседнюю, пробел — выбор строки', async () => {
		const engine = engineOf('multiple')

		engine.extensions.grid.grid = true

		await render(() => h(Table, { engine }))

		find('.s-table').focus()

		// Выбор включили после колонок — фокус сетки на первой из них
		expect(document.activeElement).toBe(find('.s-table-column'))

		document.activeElement?.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
		)

		const cell = find('.s-table-row th')

		expect(document.activeElement).toBe(cell)

		cell.dispatchEvent(
			new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
		)
		await settle()

		expect(engine.extensions.selection.selected).toEqual([rowOf(engine, 1)])
		expect(find('.s-table-row').getAttribute('aria-selected')).toBe('true')
	})
})

/**
 * Выбор пишет строке `data-selected` (в сетке ещё `aria-selected`), и Vue
 * рисует строку заново. Ячейки строки — свой внутренний компонент: его входы —
 * ячейки и их набор — выбор не меняет, и ячейки вместе со слотом `cell` не
 * перерисовываются. Иначе «выбрать все» перерисовывало бы ячейки всех строк
 * таблицы. Перерисовывают их новая запись строки и состояние, которое читает
 * слот.
 *
 * В DOM лишняя перерисовка следов не оставляет — значения те же, — поэтому
 * считаются рендеры: без слота — перерисовки компонентов по имени, со слотом —
 * вызовы слота. Слот — из харнесса: стабильным Vue считает только
 * скомпилированный слот (AGENTS.md, Pitfalls).
 */
describe('перерисовка ячеек', () => {
	let harness: ReturnType<typeof mountHarness> | null = null

	afterEach(() => {
		harness?.unmount()
		harness = null
	})

	/**
	 * Перерисовки строк и их ячеек — по имени компонента, глобальной примесью;
	 * заодно — сколько компонентов ячеек смонтировано.
	 */
	function watchUpdates() {
		const updates = { rows: 0, cells: 0 }
		let cellsMounted = 0
		const mixin: ComponentOptions = {
			mounted() {
				if (this.$options.name === '_TableRowCells') cellsMounted++
			},
			beforeUpdate() {
				if (this.$options.name === '_TableRow') updates.rows++
				if (this.$options.name === '_TableRowCells') updates.cells++
			},
		}

		return { updates, mixin, cellsMounted: () => cellsMounted }
	}

	/** Таблица без слотов — и счётчик перерисовок её строк и ячеек. */
	async function renderCounted(content: () => VNode) {
		const { updates, mixin, cellsMounted } = watchUpdates()

		wrapper = mount(defineComponent({ render: content }), {
			attachTo: document.body,
			global: { mixins: [mixin] },
		})
		await settle()

		// Ячейки каждой строки — свой компонент: иначе их перерисовку не отличить
		// от перерисовки строки, и счётчик ниже ничего бы не стерёг
		expect(cellsMounted()).toBe(findAll('.s-table-row').length)

		// Считаются перерисовки после монтирования
		updates.rows = 0
		updates.cells = 0

		return updates
	}

	function mountHarness(engine: TTableCollection, count: (field: string) => void) {
		return mount(Harness, { props: { engine, count }, attachTo: document.body })
	}

	/** Таблица со слотом `cell` из харнесса — и вызовы слота после монтирования. */
	async function renderHarness(engine: TTableCollection) {
		const count = vi.fn<(field: string) => void>()

		harness = mountHarness(engine, count)
		await settle()

		// Слот звали на каждую ячейку: три строки по две колонки
		expect(count).toHaveBeenCalledTimes(6)
		count.mockClear()

		return count
	}

	/** Текст ячеек по строкам. */
	const cellTexts = () =>
		findAll('.s-table-row').map((row) => findAll('.s-table-row__cell', row).map(text))

	/** Отметка выбора строк. */
	const rowsSelected = () => findAll('.s-table-row').map((row) => row.dataset.selected)

	it('без слота: «выбрать все» и снятие выбора перерисовывают строки, но не их ячейки', async () => {
		const engine = engineOf('multiple')
		const updates = await renderCounted(() => h(Table, { engine }))
		const head = checkBoxInput('.s-table__select')

		head.click()
		await settle()

		expect(rowsSelected()).toEqual(['true', 'true', 'true'])

		head.click()
		await settle()

		expect(rowsSelected()).toEqual(['false', 'false', 'false'])
		// Строку выбор перерисовывает — на каждый клик по разу
		expect(updates).toEqual({ rows: 6, cells: 0 })
	})

	it('со слотом: «выбрать все» и снятие выбора слот ячеек не зовут', async () => {
		const count = await renderHarness(engineOf('multiple'))
		const head = checkBoxInput('.s-table__select')

		head.click()
		await settle()

		expect(rowsSelected()).toEqual(['true', 'true', 'true'])

		head.click()
		await settle()

		expect(rowsSelected()).toEqual(['false', 'false', 'false'])
		expect(cellTexts()).toEqual([
			['Анна', '30'],
			['Борис', '41'],
			['Вера', '25'],
		])
		expect(count).not.toHaveBeenCalled()
	})

	it('без слота: таблица перерисована сменой пропа — строки и ячейки нет', async () => {
		const engine = engineOf('none')
		const label = ref('Люди')
		const updates = await renderCounted(() => h(Table, { engine, aria_label: label.value }))

		label.value = 'Сотрудники'
		await settle()

		expect(find('.s-table').getAttribute('aria-label')).toBe('Сотрудники')
		expect(updates).toEqual({ rows: 0, cells: 0 })
	})

	it('со слотом: таблица перерисована сменой пропа — слот ячеек не зван', async () => {
		const count = await renderHarness(engineOf('none'))

		await harness?.setProps({ label: 'Люди' })
		await settle()

		expect(find('.s-table').getAttribute('aria-label')).toBe('Люди')
		expect(count).not.toHaveBeenCalled()
	})

	it('состояние, которое читает слот, сменилось — ячейки перерисованы', async () => {
		const count = await renderHarness(engineOf('none'))

		await harness?.setProps({ mark: '!' })
		await settle()

		expect(cellTexts()).toEqual([
			['Анна!', '30!'],
			['Борис!', '41!'],
			['Вера!', '25!'],
		])
		expect(count).toHaveBeenCalledTimes(6)
	})

	it('запись строки сменилась — перерисованы ячейки этой строки, и только её', async () => {
		const engine = engineOf('none')
		const count = await renderHarness(engine)

		rowOf(engine, 2).data = { ...BORIS, age: 42 }
		await settle()

		expect(cellTexts()).toEqual([
			['Анна', '30'],
			['Борис', '42'],
			['Вера', '25'],
		])
		expect(count).toHaveBeenCalledTimes(2)
	})

	it('в сетке выбор пробелом слот ячеек не зовёт', async () => {
		const engine = engineOf('multiple')

		engine.extensions.grid.grid = true

		const count = await renderHarness(engine)

		find('.s-table').focus()
		document.activeElement?.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
		)

		const cell = find('.s-table-row th')

		expect(document.activeElement).toBe(cell)

		cell.dispatchEvent(
			new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
		)
		await settle()

		expect(engine.extensions.selection.selected).toEqual([rowOf(engine, 1)])
		expect(find('.s-table-row').getAttribute('aria-selected')).toBe('true')
		expect(count).not.toHaveBeenCalled()
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

		await render(() => h(Table, { engine }))

		const anna = find('.s-table-row')
		const input = checkBoxInput('.s-table-row__select', anna)

		input.click()
		await settle()

		expect(engine.extensions.selection.selected).toEqual([])
		expect(input.checked).toBe(false)
		expect(anna.dataset.selected).toBe('false')
	})

	it('чекбокс шапки: выбор отменён — поле не отмечено и не «часть»', async () => {
		const engine = engineOf('multiple')

		engine.extensions.selection.events.on('item:select:before', (e) => e.preventDefault())

		await render(() => h(Table, { engine }))

		const head = checkBoxInput('.s-table__select')

		head.click()
		await settle()

		expect(engine.extensions.selection.selected).toEqual([])
		expect([head.checked, head.indeterminate]).toEqual([false, false])
	})

	it('чекбокс шапки из «части»: выбор отменён — «часть» остаётся', async () => {
		const engine = engineOf('multiple')

		engine.extensions.selection.select(rowOf(engine, 1))
		engine.extensions.selection.events.on('item:select:before', (e) => e.preventDefault())

		await render(() => h(Table, { engine }))

		const head = checkBoxInput('.s-table__select')

		head.click()
		await settle()

		expect(engine.extensions.selection.selected).toEqual([rowOf(engine, 1)])
		expect([head.checked, head.indeterminate]).toEqual([false, true])
	})
})

/**
 * Вес строки (BENCHMARKS.md, 869fekb4g): строку размножают тысячи раз, и всё,
 * что Vue заводит на её значение или на её ячейку, умножается так же.
 */
describe('вес строки', () => {
	/** Экземпляр Vue первой строки или её ячеек — по имени компонента. */
	function instanceOf(name: string): ComponentInternalInstance {
		const found = wrapper?.findAllComponents({ name })[0]

		if (!found) throw new Error(`${name}: компонента нет`)

		return found.vm.$
	}

	it('значения ядра доходят до шаблона строки без реактивных прокси', async () => {
		await render(() => h(Table, { engine: engineOf('multiple') }))

		// Прокси экземпляра отдаёт значение рефа из `setup()` — то, что видит шаблон
		const cells: unknown = Reflect.get(instanceOf('_TableRow').proxy ?? {}, 'cells')

		// Глубокий реф обернул бы массив ячеек, каждую ячейку, её `aria` и
		// `dataset` в прокси с зависимостью на каждый ключ
		expect(Array.isArray(cells) && cells.length > 0).toBe(true)
		expect(isProxy(cells)).toBe(false)
		expect(Array.isArray(cells) && cells.some((cell) => isProxy(cell))).toBe(false)
	})

	it('без слота ячейка — узел ячейки и её текст, без обёрток цикла и слота', async () => {
		await render(() => h(Table, { engine: engineOf('multiple') }))

		const { subTree } = instanceOf('_TableRowCells')
		const nodes: VNode[] = []
		const walk = (vnode: VNode): void => {
			nodes.push(vnode)

			if (Array.isArray(vnode.children))
				for (const child of vnode.children) if (isVNode(child)) walk(child)
		}

		walk(subTree)

		const cells = nodes.filter((vnode) => vnode.type === 'td' || vnode.type === 'th')

		expect(cells.map((vnode) => vnode.type)).toEqual(['th', 'td'])
		// Ребёнок ячейки — сам текст, а не фрагмент слота с запасным текстом
		expect(
			cells.map((vnode) =>
				Array.isArray(vnode.children)
					? vnode.children.map((child) => (isVNode(child) ? child.children : child))
					: vnode.children,
			),
		).toEqual([['Анна'], ['30']])
		// Сверх ячеек и их текста — один фрагмент цикла на все ячейки строки
		expect(nodes.length).toBe(cells.length * 2 + 1)
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
	const inWindow = (engine: TTableCollection) => () => h(Virtual, () => h(Table, { engine }))

	it('до замера — первые 50 строк; у таблицы число строк, у шапки и строк — номера', async () => {
		const engine = manyRows(80)

		await render(inWindow(engine))

		const rows = findAll('.s-table-row')
		const table = find('table.s-table')

		expect(rows).toHaveLength(50)
		expect(table.getAttribute('aria-rowcount')).toBe('81')
		expect(table.dataset.virtual).toBe('true')
		expect(find('.s-table__head-row').getAttribute('aria-rowindex')).toBe('1')
		expect(rows[0].getAttribute('aria-rowindex')).toBe('2')
	})

	it('по замеру — распорки на месте пропущенных: скрыты, во всю ширину, высотой в строки', async () => {
		const engine = manyRows(80)

		await render(inWindow(engine))

		engine.extensions.draw.notifyViewport({ top: 1200, bottom: 1600, step: 40 })
		await settle()

		const body = find('.s-table__body')
		const fillers = findAll('.s-table__filler-row', body)

		expect(fillers).toHaveLength(2)
		expect(body.firstElementChild).toBe(fillers[0])
		expect(body.lastElementChild).toBe(fillers[1])
		expect(fillers.map((filler) => filler.getAttribute('aria-hidden'))).toEqual([
			'true',
			'true',
		])
		// Места 20–49: перед ними 20 строк, за ними 30
		expect(fillers.map((filler) => filler.style.getPropertyValue('--s-filler-height'))).toEqual(
			['800px', '1200px'],
		)
		// Колонка выбора и две колонки
		expect(find('.s-table__filler', fillers[0]).getAttribute('colspan')).toBe('3')
		expect(findAll('.s-table-row', body)).toHaveLength(30)
	})

	it('строка, оставшаяся в окне, при сдвиге окна не перемонтируется', async () => {
		const engine = manyRows(80)

		await render(inWindow(engine))

		engine.extensions.draw.notifyViewport({ top: 1200, bottom: 1600, step: 40 })
		await settle()

		const kept = findAll('.s-table-row').find(
			(row) => row.getAttribute('aria-rowindex') === '40',
		)

		engine.extensions.draw.notifyViewport({ top: 1240, bottom: 1640, step: 40 })
		await settle()

		expect(
			findAll('.s-table-row').find((row) => row.getAttribute('aria-rowindex') === '40'),
		).toBe(kept)
	})

	it('без обёртки — все строки, без распорок и номеров', async () => {
		await render(() =>
			h(Table, { items: [ANNA, BORIS].map((data) => ({ data })), columns: [NAME] }),
		)

		expect(findAll('.s-table-row')).toHaveLength(2)
		expect(findAll('.s-table__filler-row')).toEqual([])
		expect(find('table.s-table').hasAttribute('aria-rowcount')).toBe(false)
		expect(find('.s-table__head-row').hasAttribute('aria-rowindex')).toBe(false)
	})
})

/**
 * Закреплённая шапка (`stickyHead`) — свойство таблицы: ядро пишет его в
 * набор `dataset`, разметка раскладывает набор на корне. Закрепляет шапку
 * тема (`playground/vue/browser/table-sticky-head.spec.ts`).
 */
describe('закреплённая шапка', () => {
	it('data-sticky-head на корне — по пропу и вместе с ним', async () => {
		const sticky = ref(false)

		await render(() =>
			h(Table, {
				items: [ANNA, BORIS].map((data) => ({ data })),
				columns: [NAME],
				stickyHead: sticky.value,
			}),
		)

		const table = find('table.s-table')

		expect(table.dataset.stickyHead).toBe('false')

		sticky.value = true
		await settle()

		expect(table.dataset.stickyHead).toBe('true')

		sticky.value = false
		await settle()

		expect(table.dataset.stickyHead).toBe('false')
	})

	it('с инстанса: шапку закрепили — атрибут на корне', async () => {
		const owner = new TTable()

		await render(() => h(Table, { ctrl: owner, engine: engineOf('none') }))

		expect(find('table.s-table').dataset.stickyHead).toBe('false')

		owner.stickyHead = true
		await settle()

		expect(find('table.s-table').dataset.stickyHead).toBe('true')
	})
})
