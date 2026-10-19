/**
 * Table в React — проводка на настоящей разметке.
 *
 * Модель — колонки, ячейки, сортировку, счёт выбора и чекбоксы колонки выбора
 * — проверяет ядро (`core/__tests__/table*.spec.ts`), раскладку и вид —
 * браузер (`playground/vue/browser/table.spec.ts`). Здесь, как у Vue
 * (`ui/vue/__tests__/table.spec.ts`), важно, что выходы коллекции доезжают
 * туда, куда должны: колонки — в заголовки, строки — в `tbody` в порядке
 * сортировки, ячейки — в строки, а нажатия по кнопкам сортировки и чекбоксам
 * доходят до модели и возвращаются в разметку — и тогда, когда модель выбор
 * отменила. «Перерисовка ячеек» — как у Vue: выбор не перерисовывает ячейки
 * строк; перерисовки самих строк считает `table-row-renders.spec.tsx`. Группы
 * Vue «вес строки» здесь нет: она про реактивные прокси и узлы Vue, а у React
 * их нет.
 *
 * Своё у React — сборка на рендере и приём при коммите: лишний цикл эффектов
 * StrictMode пересобирает таблицу и строки, и чекбоксы колонки выбора обязаны
 * выбирать и после него; сервер рисует таблицу из данных, и гидратация
 * сходится вместе с `id` заголовков строк и обёрток колонок.
 */

import { describe, it, expect, vi } from 'vitest'
import { StrictMode, act, type ReactElement } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { LocaleProvider, Table, TableColumn, TableRow, Virtual } from '@soldy-ui/react'
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
import { mount, nextFrame, track, type TMounted } from './mount'

/**
 * Смонтировать и дождаться кадра: корень плагины получают через
 * `requestAnimationFrame`, и слушатели плагинов встают по его `ready`.
 */
async function render(element: ReactElement): Promise<TMounted> {
	const mounted = mount(element)

	await nextFrame()

	return mounted
}

/** Изменение снаружи — в `act`, и кадр: новые узлы объявляют себя плагинам кадром позже. */
async function settle(action: () => void): Promise<void> {
	act(action)
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

/** Клик — как его шлёт браузер, в `act`: выбор перерисовывает таблицу. */
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
const rowNames = () => findAll('.so-table-row').map((row) => text(find('th', row)))

/** Отметка выбора строк. */
const rowsSelected = () => findAll('.so-table-row').map((row) => row.dataset.selected)

/** Отметки чекбоксов строк. */
const rowsChecked = () =>
	findAll('.so-table-row').map((row) => checkBoxInput('.so-table-row__select', row).checked)

describe('разметка', () => {
	it('шапка — показанные колонки, тело — строки, в строке — ячейки по колонкам', async () => {
		await render(
			<Table items={[ANNA, BORIS].map((data) => ({ data }))} columns={[NAME, AGE]} />,
		)

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
		await render(<Table items={[{ data: ANNA }]} columns={[NAME, { ...AGE, width: 120 }]} />)

		const [name, age] = findAll('.so-table-column')

		expect(age.tagName).toBe('TH')
		expect(age.dataset.align).toBe('end')
		expect(age.style.getPropertyValue('--so-table-column-width')).toBe('120px')
		expect(name.style.getPropertyValue('--so-table-column-width')).toBe('')
	})

	it('ячейка колонки rowHeader — th scope="row" с id, остальные — td', async () => {
		await render(<Table items={[{ data: ANNA }]} columns={[AGE, NAME]} />)

		const [age, name] = [...find('.so-table-row').children]

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
		await render(
			<Table items={[{ data: ANNA }]} columns={[NAME]} stickyHead aria_label="Сотрудники" />,
		)

		const table = find('table.so-table')
		const viewport = find('.so-table__viewport')

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

	/**
	 * Атрибуты потребителя делятся, как у поля и у Vue: класс и стиль — окну,
	 * внешнему узлу компонента, остальное — `table`, где роль и имя таблицы
	 * (`toWrappedRootProps`).
	 */
	it('атрибуты потребителя: aria-label, id и data-* — table, класс и стиль — окну', async () => {
		await render(
			<Table
				items={[{ data: ANNA }]}
				columns={[NAME]}
				className="staff"
				style={{ maxHeight: 320 }}
				aria-label="Сотрудники"
				id="staff"
				data-testid="staff"
			/>,
		)

		const viewport = find('.so-table__viewport')
		const table = find('table.so-table')

		expect(table.getAttribute('aria-label')).toBe('Сотрудники')
		expect(table.id).toBe('staff')
		expect(table.dataset.testid).toBe('staff')
		expect(
			['aria-label', 'id', 'data-testid'].filter((name) => viewport.hasAttribute(name)),
		).toEqual([])
		expect(viewport.classList.contains('staff')).toBe(true)
		expect(viewport.style.maxHeight).toBe('320px')
		expect(table.classList.contains('staff')).toBe(false)
		expect(table.hasAttribute('style')).toBe(false)
	})

	it('скрытая таблица прячет окно: скрытие — на окне', async () => {
		const { render: rerender } = await render(
			<Table items={[{ data: ANNA }]} columns={[NAME]} visible={false} />,
		)

		expect(find('.so-table__viewport').style.display).toBe('none')
		expect(find('table.so-table').style.display).toBe('')

		rerender(<Table items={[{ data: ANNA }]} columns={[NAME]} visible />)

		expect(find('.so-table__viewport').style.display).toBe('')
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
		await render(<Table items={[{ data: ANNA }]} columns={[NAME, AGE]} columnFit="none" />)

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

		await render(<Table engine={engine} />)

		expect(widths()).toEqual(['', ''])
		expect(find('table.so-table').hasAttribute('data-sized')).toBe(false)

		await settle(() => engine.extensions.columns.notifySpace(500))

		expect(widths()).toEqual(['250px', '250px'])
		expect(find('table.so-table').dataset.overflow).toBe('false')
		expect(find('table.so-table').dataset.sized).toBe('true')
	})

	it('смена columnFit пропом — новая раскладка; шире места — data-overflow', async () => {
		const engine = engineOf('none', [ANNA])
		const view = (fit: TTableColumnFit) => <Table engine={engine} columnFit={fit} />
		const { render: rerender } = await render(view('none'))

		await settle(() => engine.extensions.columns.notifySpace(600))

		expect(widths()).toEqual(['160px', '160px'])
		expect(find('table.so-table').dataset.overflow).toBe('false')

		rerender(view('auto'))
		await nextFrame()

		expect(widths()).toEqual(['300px', '300px'])

		await settle(() => engine.extensions.columns.notifySpace(300))

		expect(widths()).toEqual(['160px', '160px'])
		expect(find('table.so-table').dataset.overflow).toBe('true')
	})
})

describe('слоты', () => {
	it('header — подпись заголовка по колонке, и у сортируемой тоже; кнопка — вне подписи', async () => {
		await render(
			<Table
				items={[{ data: ANNA }]}
				columns={[NAME, AGE]}
				header={({ column }) => <b>{`${column.field}:${column.text}`}</b>}
			/>,
		)

		expect(findAll('.so-table-column__text b').map(text)).toEqual(['name:Имя', 'age:Возраст'])
		// Кнопку сортировки рисует колонка рядом с подписью, а не таблица в ней
		const button = find('.so-table-column__sort')

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

		await render(
			<Table
				engine={engine}
				header={({ column, text: caption }) => (
					<button type="button" className="menu" onClick={() => opened(column.field)}>
						{caption}
					</button>
				)}
			/>,
		)

		const age = findAll('.so-table-column')[1]

		click(find('button.menu', age))

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
		await render(
			<Table
				items={[{ data: ANNA }]}
				columns={[NAME, AGE]}
				header={({ column, text: caption, sortable }) => (
					<b>{`${column.field}:${caption}:${String(sortable)}`}</b>
				)}
			/>,
		)

		expect(findAll('.so-table-column__text b').map(text)).toEqual([
			'name:Имя:false',
			'age:Возраст:true',
		])
	})

	it('cell — содержимое ячейки по строке, колонке и значению', async () => {
		await render(
			<Table
				items={[{ data: ANNA }, { data: BORIS }]}
				columns={[NAME, AGE]}
				cell={({ row, column, value }) =>
					column.field === 'age' ? (
						<i>{`${String(idOf(row.data))}/${String(value)}`}</i>
					) : (
						String(value)
					)
				}
			/>,
		)

		expect(findAll('.so-table-row').map((row) => [...row.children].map(text))).toEqual([
			['Анна', '1/30'],
			['Борис', '2/41'],
		])
	})

	/**
	 * Без слота значение — текстом ядра (`text` ячейки): React сам булево и
	 * `null` не рисует, а на объекте падает.
	 */
	it('без cell значение — текстом: число, булево, пусто, объект', async () => {
		const FLAG: TTableColumnSource = { field: 'flag', text: 'Флаг' }
		const NOTE: TTableColumnSource = { field: 'note', text: 'Заметка' }
		const TAGS: TTableColumnSource = { field: 'tags', text: 'Теги' }

		await render(
			<Table
				items={[
					{ data: { id: 1, name: 'Анна', age: 30, flag: true, note: null, tags: ['a'] } },
				]}
				columns={[NAME, AGE, FLAG, NOTE, TAGS]}
			/>,
		)

		expect([...find('.so-table-row').children].map((cell) => cell.textContent)).toEqual([
			'Анна',
			'30',
			'true',
			'',
			'[\n  "a"\n]',
		])
	})

	it('empty — пока строк нет, ячейка во всю ширину строки', async () => {
		await render(<Table columns={[NAME, AGE]} mode="multiple" empty="Нет данных" />)

		const cell = find('.so-table__empty')

		expect(text(cell)).toBe('Нет данных')
		// Две колонки и колонка выбора
		expect(cell.getAttribute('colspan')).toBe('3')
	})

	it('строки появились — пустой строки нет', async () => {
		await render(<Table items={[{ data: ANNA }]} columns={[NAME]} />)

		expect(findAll('.so-table__empty-row')).toEqual([])
	})
})

describe('сортировка', () => {
	it('кнопка заголовка сортирует строки: по возрастанию, по убыванию, снята', async () => {
		await render(<Table engine={engineOf('none')} />)

		const age = findAll('.so-table-column')[1]
		const button = find('.so-table-column__sort', age)

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
		await render(<Table engine={engineOf('none')} />)

		const [name, age] = findAll('.so-table-column')

		expect(findAll('.so-table-column__sort', name)).toEqual([])
		expect(text(find('.so-table-column__text', name))).toBe('Имя')
		expect(text(find('.so-table-column__text', age))).toBe('Возраст')

		const button = find('.so-table-column__sort', age)

		// Подпись и кнопка — соседи в ряду содержимого заголовка
		expect(button.parentElement).toBe(find('.so-table-column__content', age))
		expect(button.closest('.so-table-column__text')).toBeNull()
		expect(button.getAttribute('type')).toBe('button')
		expect(find('.so-table-column__sort-icon', age).getAttribute('aria-hidden')).toBe('true')
		expect(age.querySelector('.so-table-column__sort-icon svg')).not.toBeNull()
	})

	/**
	 * Заголовок назван подписью, кнопка — своим именем от локали: имя кнопки в
	 * имя заголовка не входит, и подписи заголовка в ссылке кнопки нет.
	 */
	it('имя кнопки — «Sort by …» от локали, имя заголовка — только подпись', async () => {
		await render(<Table engine={engineOf('none')} />)

		const age = findAll('.so-table-column')[1]
		const button = find('.so-table-column__sort', age)
		const caption = find('.so-table-column__text', age)

		expect(button.getAttribute('aria-label')).toBe('Sort by Возраст')
		expect(button.hasAttribute('aria-labelledby')).toBe(false)
		expect(age.getAttribute('aria-labelledby')).toBe(caption.id)
		expect(caption.contains(button)).toBe(false)
	})

	it('смена локали — новое имя кнопки на той же кнопке, без перемонтирования', async () => {
		const engine = engineOf('none')
		const view = (locale: TLocale) => (
			<LocaleProvider locale={locale}>
				<Table engine={engine} />
			</LocaleProvider>
		)
		const { render: rerender } = await render(view(enUS))
		const button = find('.so-table-column__sort')

		expect(button.getAttribute('aria-label')).toBe('Sort by Возраст')

		rerender(view(ruRU))

		expect(find('.so-table-column__sort')).toBe(button)
		expect(button.getAttribute('aria-label')).toBe('Сортировать по столбцу Возраст')
	})

	it('нажатие по подписи и по ячейке заголовка не сортирует', async () => {
		const engine = engineOf('none')

		await render(<Table engine={engine} />)

		const age = findAll('.so-table-column')[1]

		click(find('.so-table-column__text', age))
		click(age)

		expect(rowNames()).toEqual(['Анна', 'Борис', 'Вера'])
		expect(age.hasAttribute('aria-sort')).toBe(false)
		expect(engine.extensions.sort.sort).toEqual([])
	})

	it('выключенная таблица — кнопка выключена, порядок прежний', async () => {
		await render(<Table engine={engineOf('none')} disabled />)

		const button = find('.so-table-column__sort')

		expect(button.hasAttribute('disabled')).toBe(true)

		click(button)

		expect(rowNames()).toEqual(['Анна', 'Борис', 'Вера'])
	})
})

describe('колонка выбора', () => {
	it('multiple — заголовок с чекбоксом «выбрать все», single — пустая ячейка, у строк — чекбоксы', async () => {
		const multiple = await render(<Table engine={engineOf('multiple')} />)

		const head = find('.so-table__select')

		expect(head.tagName).toBe('TH')
		expect(findAll('.so-check-box', head)).toHaveLength(1)
		expect(findAll('.so-table-row__select .so-check-box')).toHaveLength(3)

		multiple.render(<></>)
		await render(<Table engine={engineOf('single')} />)

		const single = find('.so-table__select')

		expect(single.tagName).toBe('TD')
		expect(single.children).toHaveLength(0)
		expect(findAll('.so-table-row__select .so-check-box')).toHaveLength(3)
	})

	it('колонка появляется и уходит вместе с режимом', async () => {
		const engine = engineOf('none')

		await render(<Table engine={engine} />)

		expect(findAll('.so-table__select, .so-table-row__select')).toEqual([])

		await settle(() => {
			engine.extensions.selection.mode = 'multiple'
		})

		expect(findAll('.so-table-row__select')).toHaveLength(3)

		await settle(() => {
			engine.extensions.selection.mode = 'none'
		})

		expect(findAll('.so-table__select, .so-table-row__select')).toEqual([])
	})

	it('клик по чекбоксу строки выбирает строку, повторный — снимает', async () => {
		const engine = engineOf('multiple')

		await render(<Table engine={engine} />)

		const anna = find('.so-table-row')
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

		await render(<Table engine={engine} />)

		const head = checkBoxInput('.so-table__select')
		const inputs = findAll('.so-table-row').map((row) =>
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

		await render(<Table engine={engine} />)

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

		await render(<Table engine={engine} />)

		act(() => {
			engine.extensions.selection.select(rowOf(engine, 3))
		})

		const vera = findAll('.so-table-row')[2]

		expect(checkBoxInput('.so-table-row__select', vera).checked).toBe(true)
		expect(checkBoxInput('.so-table__select').indeterminate).toBe(true)
	})

	it('пустая таблица и выключенные строки — чекбокс шапки выключен', async () => {
		const engine = engineOf('multiple', [])

		await render(<Table engine={engine} />)

		expect(checkBoxInput('.so-table__select').disabled).toBe(true)

		await settle(() => {
			engine.extensions.batch.items = [{ data: { ...ANNA } }]
		})

		expect(checkBoxInput('.so-table__select').disabled).toBe(false)

		act(() => {
			rowOf(engine, 1).disabled = true
		})

		expect(checkBoxInput('.so-table__select').disabled).toBe(true)
		expect(checkBoxInput('.so-table-row__select').disabled).toBe(true)
	})

	it('чекбоксы — размера и варианта таблицы', async () => {
		const owner = new TTable({ size: 'lg' })

		await render(<Table ctrl={owner} engine={engineOf('multiple')} />)

		expect(find('.so-table__select .so-check-box').classList).toContain('so-check-box--size-lg')
		expect(find('.so-table-row__select .so-check-box').classList).toContain(
			'so-check-box--size-lg',
		)
	})
})

describe('имена чекбоксов', () => {
	it('чекбокс строки называет заголовок строки — ячейка колонки rowHeader', async () => {
		await render(<Table engine={engineOf('multiple')} />)

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
		await render(
			<Table engine={engineOf('multiple', [ANNA], [{ ...NAME, rowHeader: false }, AGE])} />,
		)

		expect(checkBoxInput('.so-table-row__select').hasAttribute('aria-labelledby')).toBe(false)
		expect(findAll('th[scope="row"]')).toEqual([])
	})

	it('чекбокс шапки — имя от локали поддерева, на лету', async () => {
		const engine = engineOf('multiple')
		const view = (locale: TLocale) => (
			<LocaleProvider locale={locale}>
				<Table engine={engine} />
			</LocaleProvider>
		)
		const { render: rerender } = await render(view(enUS))

		expect(checkBoxInput('.so-table__select').getAttribute('aria-label')).toBe('Select all')

		rerender(view(ruRU))

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

	it('полоса с полем — у колонки resizable: ход и ширина колонки; у остальных её нет', async () => {
		await render(
			<Table
				items={[{ data: ANNA }]}
				columns={[{ ...RESIZABLE, minWidth: 100, maxWidth: 300 }, AGE]}
			/>,
		)

		const [name, age] = findAll('.so-table-column')
		const field = resizerField(name)

		expect(field.type).toBe('range')
		expect([field.min, field.max, field.value]).toEqual(['100', '300', '150'])
		expect(findAll('.so-table-column__resizer', age)).toEqual([])
	})

	it('колонка без своей ширины — полоса появляется с местом таблицы, ширина — раскладки', async () => {
		const engine = engineOf('none', [ANNA], [{ ...NAME, resizable: true }])

		await render(<Table engine={engine} />)

		// Места нет — ширину решает тема, и ручке нечего показать
		expect(findAll('.so-table-column__resizer')).toEqual([])

		await settle(() => engine.extensions.columns.notifySpace(180))

		expect(resizerField().value).toBe('180')
		expect(find('.so-table-column').style.getPropertyValue('--so-table-column-width')).toBe(
			'180px',
		)
		// Ширина раскладки — не своя: колонка остаётся гибкой
		expect(columnOf(engine, 'name').getProps().width).toBeUndefined()
	})

	it('у выключенной таблицы ручек нет', async () => {
		await render(<Table items={[{ data: ANNA }]} columns={[RESIZABLE]} disabled />)

		expect(findAll('.so-table-column__resizer')).toEqual([])
	})

	it('заголовок и поле названы подписью — ровно текст колонки', async () => {
		await render(<Table items={[{ data: ANNA }]} columns={[RESIZABLE, AGE]} />)

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

	it('клавиша на поле — ширина заголовка, поле и onColumnResize таблицы', async () => {
		const resize = vi.fn()
		const engine = engineOf('none', [ANNA], [RESIZABLE])

		await render(<Table engine={engine} onColumnResize={resize} />)

		const header = find('.so-table-column')

		press(resizerField(), 'ArrowRight')

		expect(header.style.getPropertyValue('--so-table-column-width')).toBe('160px')
		expect(header.dataset.sized).toBe('true')
		expect(resizerField().value).toBe('160')
		expect(resize.mock.calls).toEqual([[{ column: columnOf(engine, 'name'), width: 160 }]])
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
		await render(<Table items={[{ data: ANNA }]} columns={[MOVABLE[0], AGE]} />)

		const [name, age] = findAll('.so-table-column')

		expect(name.dataset.reorderable).toBe('true')
		expect(age.dataset.reorderable).toBe('false')
	})

	it('Ctrl+Shift+← на кнопке сортировки — шапка и ячейки в новом порядке, onColumnMove', async () => {
		const move = vi.fn()
		const engine = engineOf('none', [ANNA], [...MOVABLE])

		await render(<Table engine={engine} onColumnMove={move} />)

		press(find('.so-table-column__sort'), 'ArrowLeft', { ctrlKey: true, shiftKey: true })
		await nextFrame()

		expect(findAll('.so-table-column').map(text)).toEqual(['Возраст', 'Имя'])
		expect(findAll('.so-table-row__cell').map(text)).toEqual(['30', 'Анна'])
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
		const view = (preview: TTableReorderPreview) => (
			<Table engine={engine} reorderPreview={preview} />
		)
		const { render: rerender } = await render(view('head'))

		const table = find('table.so-table')
		const [name] = columns.columns

		expect(table.hasAttribute('data-reorder-preview')).toBe(false)

		// head — нет и в жесте
		act(() => columns.dragStart(name))

		expect(table.hasAttribute('data-reorder-preview')).toBe(false)

		act(() => columns.dragCancel())
		rerender(view('column'))

		expect(table.hasAttribute('data-reorder-preview')).toBe(false)

		act(() => {
			columns.dragStart(name)
			columns.dragOver(1)
			columns.dragDrop()
		})

		expect(table.dataset.reorderPreview).toBe('column')

		// Встала — признак ушёл той же перерисовкой, что и перестановка
		act(() => columns.dragEnd())

		expect(findAll('.so-table-column').map(text)).toEqual(['Возраст', 'Имя'])
		expect(table.hasAttribute('data-reorder-preview')).toBe(false)
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

		await render(<Table engine={engine} />)

		const [name] = columns.columns

		act(() => {
			columns.dragStart(name)
			columns.dragOver(2)
			columns.dragDrop()
		})

		expect(findAll('.so-table-column').map(gesture)).toEqual([
			['dragging=true', 'landing=true'],
			['shift=start'],
			['drop=after', 'shift=start'],
		])

		act(() => columns.dragEnd())

		expect(findAll('.so-table-column').map(text)).toEqual(['Возраст', '№', 'Имя'])
		expect(findAll('.so-table-row__cell').map(text)).toEqual(['30', '1', 'Анна'])
		expect(findAll('.so-table-column').flatMap(gesture)).toEqual([])
	})
})

/**
 * Сетка — наборы коллекции в разметке и плагин сетки на корне. Ходьбу и выбор
 * считает ядро (`core/__tests__/table-grid.spec.ts`), клавиши — плагин
 * (`plugins/__tests__/table-grid.plugin.spec.ts`). Здесь — что наборы доезжают
 * до своих узлов, а плагин находит ячейки в разметке React: узлы строк из
 * реестра, ячейки по колонкам сетки.
 */
describe('сетка', () => {
	it('роль grid и остановка Tab — у таблицы, ячейки и заголовки фокус только принимают', async () => {
		await render(
			<Table
				items={[{ data: ANNA }, { data: BORIS }]}
				columns={[NAME, AGE]}
				mode="multiple"
				grid
			/>,
		)

		const table = find('.so-table')

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
	})

	it('без сетки — простая таблица: ни роли, ни tabindex, ни aria-selected', async () => {
		await render(<Table items={[{ data: ANNA }]} columns={[NAME]} mode="multiple" />)

		expect(find('.so-table').hasAttribute('role')).toBe(false)
		expect(find('.so-table').hasAttribute('tabindex')).toBe(false)
		expect(find('.so-table-row__cell').hasAttribute('tabindex')).toBe(false)
		expect(find('.so-table-row').hasAttribute('aria-selected')).toBe(false)
	})

	it('Tab в таблицу — на ячейку, стрелка — на соседнюю, пробел — выбор строки', async () => {
		const engine = engineOf('multiple')

		engine.extensions.grid.grid = true

		await render(<Table engine={engine} />)

		act(() => find('.so-table').focus())

		// Выбор включили после колонок — фокус сетки на первой из них
		expect(document.activeElement).toBe(find('.so-table-column'))

		const active = document.activeElement

		if (!active) throw new Error('фокуса нет')

		press(active, 'ArrowDown')

		const cell = find('.so-table-row th')

		expect(document.activeElement).toBe(cell)

		press(cell, ' ')

		expect(engine.extensions.selection.selected).toEqual([rowOf(engine, 1)])
		expect(find('.so-table-row').getAttribute('aria-selected')).toBe('true')
	})
})

/**
 * Выбор пишет строке `data-selected` (в сетке ещё `aria-selected`), и строка
 * рисуется заново по своей подписке. Ячейки строки — своя внутренняя часть под
 * границей перерисовки адаптера: её входы — ячейки, их набор и слот `cell` —
 * выбор не меняет, и ячейки вместе со слотом не перерисовываются. Иначе
 * «выбрать все» перерисовывало бы ячейки всех строк таблицы. Перерисовывают
 * их новая запись строки и новый слот.
 *
 * В DOM лишняя перерисовка следов не оставляет — значения те же, — поэтому
 * считаются вызовы слота: слот `cell` — шпион, один и тот же объект между
 * рендерами потребителя. Сколько раз его зовут при монтировании, здесь не
 * проверяется: шпион сбрасывается после монтирования. Перерисовки самих строк
 * считает `table-row-renders.spec.tsx`.
 */
describe('перерисовка ячеек', () => {
	/** Scope слота `cell`. */
	type TCellScope = { row: ITableRow; column: ITableColumn; value: unknown }

	/** Слот `cell` под шпионом: значение текстом, по `format`. */
	const cellSlot = (format: (value: unknown) => string = String) =>
		vi.fn(({ value }: TCellScope) => format(value))

	/** Что потребитель меняет между своими рендерами: слот и имя таблицы. */
	type TConsumerProps = { cell?: ReturnType<typeof cellSlot>; label?: string }

	/**
	 * Таблица над движком со слотом-шпионом; шпион сброшен после монтирования.
	 * `rerender` — следующий рендер потребителя: слот тот же, пока не задан новый.
	 */
	async function renderCounted(engine: TTableCollection) {
		const slot = cellSlot()
		const view = ({ cell = slot, label }: TConsumerProps = {}) => (
			<Table engine={engine} cell={cell} aria_label={label} />
		)
		const { render: rerender } = await render(view())

		// Ячейки нарисованы слотом: иначе счётчик ниже ничего бы не стерёг
		expect(slot).toHaveBeenCalled()
		slot.mockClear()

		return { slot, rerender: (props: TConsumerProps) => rerender(view(props)) }
	}

	/** Текст ячеек по строкам. */
	const cellTexts = () =>
		findAll('.so-table-row').map((row) => findAll('.so-table-row__cell', row).map(text))

	it('монтирование зовёт слот по разу на ячейку', async () => {
		const slot = cellSlot()

		await render(<Table engine={engineOf('none')} cell={slot} />)

		expect(cellTexts()).toEqual([
			['Анна', '30'],
			['Борис', '41'],
			['Вера', '25'],
		])
		expect(slot).toHaveBeenCalledTimes(6)
	})

	it('«выбрать все» и снятие выбора слот ячеек не зовут', async () => {
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
		expect(slot).not.toHaveBeenCalled()
	})

	it('таблица перерисована сменой пропа — слот ячеек не зван', async () => {
		const { slot, rerender } = await renderCounted(engineOf('none'))

		rerender({ label: 'Сотрудники' })

		expect(find('.so-table').getAttribute('aria-label')).toBe('Сотрудники')
		expect(slot).not.toHaveBeenCalled()
	})

	it('запись строки сменилась — перерисованы ячейки этой строки, и только её', async () => {
		const engine = engineOf('none')
		const { slot } = await renderCounted(engine)

		act(() => {
			rowOf(engine, 2).data = { ...BORIS, age: 42 }
		})

		expect(cellTexts()).toEqual([
			['Анна', '30'],
			['Борис', '42'],
			['Вера', '25'],
		])
		expect(slot.mock.calls.map(([scope]) => idOf(scope.row.data))).toEqual([2, 2])
	})

	it('в сетке выбор пробелом слот ячеек не зовёт', async () => {
		const engine = engineOf('multiple')

		engine.extensions.grid.grid = true

		const { slot } = await renderCounted(engine)

		act(() => find('.so-table').focus())

		const active = document.activeElement

		if (!active) throw new Error('фокуса нет')

		press(active, 'ArrowDown')

		const cell = find('.so-table-row th')

		expect(document.activeElement).toBe(cell)

		press(cell, ' ')

		expect(engine.extensions.selection.selected).toEqual([rowOf(engine, 1)])
		expect(find('.so-table-row').getAttribute('aria-selected')).toBe('true')
		expect(slot).not.toHaveBeenCalled()
	})

	it('новый слот — ячейки всех строк перерисованы им', async () => {
		const { slot, rerender } = await renderCounted(engineOf('none'))
		const next = cellSlot((value) => `${String(value)}!`)

		rerender({ cell: next })

		expect(cellTexts()).toEqual([
			['Анна!', '30!'],
			['Борис!', '41!'],
			['Вера!', '25!'],
		])
		expect(next).toHaveBeenCalledTimes(6)
		expect(slot).not.toHaveBeenCalled()
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

		await render(<Table engine={engine} />)

		const anna = find('.so-table-row')
		const input = checkBoxInput('.so-table-row__select', anna)

		click(input)

		expect(engine.extensions.selection.selected).toEqual([])
		expect(input.checked).toBe(false)
		expect(anna.dataset.selected).toBe('false')
	})

	it('чекбокс шапки: выбор отменён — поле не отмечено и не «часть»', async () => {
		const engine = engineOf('multiple')

		engine.extensions.selection.events.on('item:select:before', (e) => e.preventDefault())

		await render(<Table engine={engine} />)

		const head = checkBoxInput('.so-table__select')

		click(head)

		expect(engine.extensions.selection.selected).toEqual([])
		expect([head.checked, head.indeterminate]).toEqual([false, false])
	})

	it('чекбокс шапки из «части»: выбор отменён — «часть» остаётся', async () => {
		const engine = engineOf('multiple')

		engine.extensions.selection.select(rowOf(engine, 1))
		engine.extensions.selection.events.on('item:select:before', (e) => e.preventDefault())

		await render(<Table engine={engine} />)

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
	const inWindow = (engine: TTableCollection) => (
		<Virtual>
			<Table engine={engine} />
		</Virtual>
	)

	/** Замер, как его подаёт плагин окна: полоса от верха таблицы и шаг строк. */
	function measure(engine: TTableCollection, top: number, bottom: number): void {
		act(() => engine.extensions.draw.notifyViewport({ top, bottom, step: 40 }))
	}

	it('до замера — первые 50 строк; у таблицы число строк, у шапки и строк — номера', async () => {
		await render(inWindow(manyRows(80)))

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

		await render(inWindow(engine))

		measure(engine, 1200, 1600)

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
	it('строка, оставшаяся в окне, при сдвиге окна не перемонтируется', async () => {
		const engine = manyRows(80)

		await render(inWindow(engine))

		measure(engine, 1200, 1600)

		const kept = findAll('.so-table-row').find(
			(row) => row.getAttribute('aria-rowindex') === '40',
		)

		measure(engine, 1240, 1640)

		expect(kept).toBeDefined()
		expect(
			findAll('.so-table-row').find((row) => row.getAttribute('aria-rowindex') === '40'),
		).toBe(kept)
	})

	it('без обёртки — все строки, без распорок и номеров', async () => {
		await render(<Table items={[ANNA, BORIS].map((data) => ({ data }))} columns={[NAME]} />)

		expect(findAll('.so-table-row')).toHaveLength(2)
		expect(findAll('.so-table__filler-row')).toEqual([])
		expect(find('table.so-table').hasAttribute('aria-rowcount')).toBe(false)
		expect(find('.so-table__head-row').hasAttribute('aria-rowindex')).toBe(false)
	})
})

/**
 * Закреплённая шапка (`stickyHead`) — свойство таблицы: ядро пишет его в
 * набор `dataset`, разметка раскладывает набор на корне. Закрепляет шапку
 * тема (`playground/vue/browser/table-sticky-head.spec.ts`).
 */
describe('закреплённая шапка', () => {
	it('data-sticky-head на корне — по пропу и вместе с ним', async () => {
		const view = (sticky: boolean) => (
			<Table
				items={[ANNA, BORIS].map((data) => ({ data }))}
				columns={[NAME]}
				stickyHead={sticky}
			/>
		)
		const { render: rerender } = await render(view(false))

		const table = find('table.so-table')

		expect(table.dataset.stickyHead).toBe('false')

		rerender(view(true))

		expect(table.dataset.stickyHead).toBe('true')

		rerender(view(false))

		expect(table.dataset.stickyHead).toBe('false')
	})

	it('с инстанса: шапку закрепили — атрибут на корне', async () => {
		const owner = new TTable()

		await render(<Table ctrl={owner} engine={engineOf('none')} />)

		expect(find('table.so-table').dataset.stickyHead).toBe('false')

		act(() => {
			owner.stickyHead = true
		})

		expect(find('table.so-table').dataset.stickyHead).toBe('true')
	})
})

/**
 * StrictMode уничтожает контексты после первой установки эффектов и собирает
 * их заново. Строка, пересобранная так, отпускает чекбокс выбора и берёт у
 * таблицы новый; таблица без движка снаружи пересобирается с новым движком и
 * новым «выбрать все». После лишнего цикла чекбоксы обязаны выбирать и
 * показывать выбор, а события таблицы — приходить по одному разу: прежние
 * сборки с движка сняты.
 */
describe('StrictMode', () => {
	it('движок снаружи: чекбоксы строки и шапки выбирают, событие — одно на действие', async () => {
		const engine = engineOf(
			'multiple',
			[ANNA, BORIS, VERA],
			[{ ...NAME, resizable: true, width: 150 }, AGE],
		)
		const select = vi.fn()
		const resize = vi.fn()

		await render(
			<StrictMode>
				<Table engine={engine} onChangeSelection={select} onColumnResize={resize} />
			</StrictMode>,
		)

		const anna = find('.so-table-row')

		click(checkBoxInput('.so-table-row__select', anna))

		expect(engine.extensions.selection.selected).toEqual([rowOf(engine, 1)])
		expect(checkBoxInput('.so-table-row__select', anna).checked).toBe(true)
		expect(anna.dataset.selected).toBe('true')
		expect(select).toHaveBeenCalledTimes(1)

		click(checkBoxInput('.so-table__select'))

		expect(engine.extensions.selection.selected).toHaveLength(3)
		expect(rowsChecked()).toEqual([true, true, true])
		expect(checkBoxInput('.so-table__select').checked).toBe(true)
		expect(select).toHaveBeenCalledTimes(2)

		const field = find('.so-table-column__resizer input')

		press(field, 'ArrowRight')

		expect(resize).toHaveBeenCalledTimes(1)
	})

	it('строки из данных: «выбрать все» нового движка отмечает строки', async () => {
		await render(
			<StrictMode>
				<Table
					items={[ANNA, BORIS].map((data) => ({ data }))}
					columns={[NAME, AGE]}
					mode="multiple"
				/>
			</StrictMode>,
		)

		const head = checkBoxInput('.so-table__select')

		click(head)

		expect(rowsSelected()).toEqual(['true', 'true'])
		expect(rowsChecked()).toEqual([true, true])
		expect([head.checked, head.indeterminate]).toEqual([true, false])

		click(checkBoxInput('.so-table-row__select', find('.so-table-row')))

		expect(rowsSelected()).toEqual(['false', 'true'])
		expect([head.checked, head.indeterminate]).toEqual([false, true])
	})
})

/**
 * Сервер рисует таблицу из данных: строки в коллекции с самой сборки, а `id`
 * заголовков строк и подписей колонок плагины связок строят от id
 * монтирования — у React он от `useId`, и браузер получает те же. Имя кнопки
 * сортировки плагин имён пишет при сборке — оно уже в серверной разметке.
 * Гидратация сходится без расхождений, ссылки чекбоксов и заголовков — на те
 * же узлы.
 */
describe('сервер', () => {
	it('сервер рисует таблицу, гидратация сходится, id заголовков те же', () => {
		const element = (
			<Table
				items={[ANNA, BORIS].map((data) => ({ data }))}
				columns={[NAME, { ...AGE, resizable: true, width: 120 }]}
				mode="multiple"
			/>
		)
		const container = document.createElement('div')
		const onRecoverableError = vi.fn()

		container.innerHTML = renderToString(element)

		const rowHeaders = findAll('th[scope="row"]', container).map((cell) => cell.id)
		const contents = findAll('.so-table-column__text', container).map((caption) => caption.id)

		// Строки из данных — в коллекции с самой сборки: сервер рисует их со
		// ссылками чекбоксов на заголовки строк
		expect(rowHeaders).toHaveLength(2)
		expect(contents).toHaveLength(2)
		expect(rowHeaders.every(Boolean)).toBe(true)
		expect(contents.every(Boolean)).toBe(true)
		expect(
			findAll('.so-table-row__select input', container).map((input) =>
				input.getAttribute('aria-labelledby'),
			),
		).toEqual(rowHeaders)
		expect(
			findAll('.so-table-column__sort', container).map((button) =>
				button.getAttribute('aria-label'),
			),
		).toEqual(['Sort by Возраст'])

		document.body.append(container)

		act(() => {
			track(hydrateRoot(container, element, { onRecoverableError }))
		})

		expect(onRecoverableError).not.toHaveBeenCalled()
		expect(findAll('th[scope="row"]', container).map((cell) => cell.id)).toEqual(rowHeaders)
		expect(
			findAll('.so-table-row__select input', container).map((input) =>
				input.getAttribute('aria-labelledby'),
			),
		).toEqual(rowHeaders)
		expect(
			findAll('.so-table-column', container).map((header) =>
				header.getAttribute('aria-labelledby'),
			),
		).toEqual(contents)
		expect(
			find('.so-table-column__resizer input', container).getAttribute('aria-labelledby'),
		).toBe(contents[1])
		expect(find('.so-table-column__sort', container).getAttribute('aria-label')).toBe(
			'Sort by Возраст',
		)
	})
})
