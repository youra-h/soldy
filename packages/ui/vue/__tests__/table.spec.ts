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
import { defineComponent, h, nextTick, ref, type VNode } from 'vue'
import { LocaleProvider, Table, TableColumn, TableRow } from '@soldy-ui/vue'
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
import type { TLocale } from '@soldy-ui/plugins'

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

	it('колонка без своей ширины — полоса появляется с замером ширины', async () => {
		const engine = engineOf('none', [ANNA], [{ ...NAME, resizable: true }])

		await render(() => h(Table, { engine }))

		expect(findAll('.s-table-column__resizer')).toEqual([])

		columnOf(engine, 'name').notifyWidth(180)
		await settle()

		expect(resizerField().value).toBe('180')
		// Замер — не своя ширина: ширину колонки по-прежнему решает тема
		expect(find('.s-table-column').style.getPropertyValue('--s-table-column-width')).toBe('')
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
