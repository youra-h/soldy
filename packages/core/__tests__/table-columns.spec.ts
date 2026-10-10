import { describe, it, expect, vi } from 'vitest'
import {
	TBatchExtension,
	TCollectionEngine,
	TEvented,
	TItemContext,
	TPlainExtension,
	TTableColumn,
	TTableColumnCollectionFacade,
	TTableColumnsExtension,
	TTableRow,
	createEngine,
	createEngineTableColumns,
} from '@soldy-ui/core'
import type {
	IExtension,
	ITableColumn,
	ITableColumnProps,
	ITableColumnsExtension,
	ITableRow,
	TNoEvents,
	TTableColumnSource,
	TTableColumnsEvents,
} from '@soldy-ui/core'
import { columnsOf } from '../src/components/custom/table/collection/extensions/guards'

/**
 * Колонки таблицы — расширение `columns` коллекции строк.
 *
 * Таблица — две одномерные коллекции: строки и колонки. Коллекцию колонок
 * расширение создаёт и держит само, и всё, что колонки умеют как коллекция, —
 * её стандартные детали: состав из данных (`batch` со сверкой по `field`),
 * порядок (`order`), перемещение (`plain`). Свои у неё — показанные колонки и
 * одно событие «перечитай показанные».
 *
 * Движок строк здесь голый — только состав и колонки: ячейки строк, выбор и
 * свойства таблицы на строках — в `table.spec.ts`.
 */

type TRowsExtensions = {
	plain: TPlainExtension<ITableRow>
	batch: TBatchExtension<ITableRow>
	columns: TTableColumnsExtension
}

/** Голый движок строк: состав и колонки. */
function rows(): TCollectionEngine<ITableRow, TRowsExtensions> {
	return new TCollectionEngine<ITableRow, TRowsExtensions>({
		extensions: {
			plain: new TPlainExtension<ITableRow>(),
			batch: new TBatchExtension<ITableRow>(),
			columns: new TTableColumnsExtension(),
		},
	})
}

/** Строка над записью приложения. */
const row = (id: number, name: string, age: number): ITableRow =>
	new TTableRow({ data: { id, name, age } })

/** Расширение колонок голого движка строк, уже с колонками из данных. */
function columnsWith(sources: readonly TTableColumnSource[]): ITableColumnsExtension {
	const { columns } = rows().extensions

	columns.columns = sources

	return columns
}

const fields = (columns: ReadonlyArray<ITableColumn>): string[] =>
	columns.map((column) => column.field)

/** Колонка по полю; нет такой — тест падает здесь. */
function columnOf(columns: ITableColumnsExtension, field: string): ITableColumn {
	const found = columns.columns.find((column) => column.field === field)

	if (!found) throw new Error(`колонки ${field} нет`)

	return found
}

/** Счётчик «перечитай показанные» — ставится до действия. */
function watchShown(columns: ITableColumnsExtension) {
	const shown = vi.fn<TTableColumnsEvents['change:shownColumns']>()

	columns.events.on('change:shownColumns', shown)

	return shown
}

/**
 * Сколько обработчиков `change:visible` висит на колонке — считая с вызова,
 * поэтому ставится до того, как колонка попадёт в коллекцию.
 */
function watchVisibleListeners(column: ITableColumn): () => number {
	const on = vi.spyOn(column.events, 'on')
	const off = vi.spyOn(column.events, 'off')
	const count = (calls: ReadonlyArray<readonly unknown[]>) =>
		calls.filter(([event]) => event === 'change:visible').length

	return () => count(on.mock.calls) - count(off.mock.calls)
}

const NAME: TTableColumnSource = { field: 'name', text: 'Имя' }
const AGE: TTableColumnSource = { field: 'age', text: 'Возраст' }
const ID: TTableColumnSource = { field: 'id', text: '№' }

describe('колонки в движке строк', () => {
	it('голый движок строк: колонки — своя коллекция, строки их не видят', () => {
		const engine = rows()
		const { columns, batch } = engine.extensions

		const anna = row(1, 'Анна', 30)

		batch.set([anna])
		columns.columns = [NAME, AGE]

		expect(fields(columns.columns)).toEqual(['name', 'age'])
		expect(fields(columns.engine.extensions.batch.items)).toEqual(['name', 'age'])
		expect(batch.items).toEqual([anna])
	})

	it('колонки живут в движке строк: кто получил движок, получил и колонки', () => {
		const engine = rows()
		const { columns } = engine.extensions

		columns.columns = [NAME, AGE]
		columns.engine.extensions.plain.move(columnOf(columns, 'age'), 0)
		columnOf(columns, 'name').width = 140

		// Так движок строк видит тот, кому его передали: по контракту соседа
		const received = columnsOf(engine)

		if (!received) throw new Error('расширения колонок нет')

		expect(received.engine).toBe(columns.engine)
		expect(fields(received.shownColumns)).toEqual(['age', 'name'])
		expect(columnOf(received, 'name').width).toBe(140)
	})

	it('ставится в движок, пришедший снаружи', () => {
		const engine = createEngine<ITableRow>({ items: [row(1, 'Анна', 30)] })

		engine.use(new TTableColumnsExtension())

		const columns = columnsOf(engine)

		if (!columns) throw new Error('расширения колонок нет')

		columns.columns = [NAME, AGE]

		expect(fields(columns.shownColumns)).toEqual(['name', 'age'])
		expect(engine.extensions.batch.items).toHaveLength(1)
	})

	it('сосед узнаёт колонки по контракту', () => {
		const stranger: IExtension<ITableRow> = {
			name: 'columns',
			events: new TEvented<TNoEvents>(),
			install: () => {},
		}
		const engine = createEngine<ITableRow>()

		expect(columnsOf(rows())).toBeInstanceOf(TTableColumnsExtension)
		expect(columnsOf(engine)).toBeUndefined()
		expect(columnsOf(undefined)).toBeUndefined()

		engine.use(stranger)

		expect(columnsOf(engine)).toBeUndefined()
	})
})

describe('состав из данных', () => {
	it('колонки из данных — экземпляры в порядке данных', () => {
		const columns = columnsWith([NAME, AGE])

		expect(fields(columns.columns)).toEqual(['name', 'age'])
		expect(columns.columns.every((column) => column instanceof TTableColumn)).toBe(true)
		expect(columnOf(columns, 'name').text).toBe('Имя')
	})

	it('повтор теми же данными — те же экземпляры, и показанные не устарели', () => {
		const columns = columnsWith([NAME, AGE])
		const before = [...columns.columns]
		const shown = watchShown(columns)

		columns.columns = [{ ...NAME }, { ...AGE }]

		expect(columns.columns).toHaveLength(2)
		columns.columns.forEach((column, index) => expect(column).toBe(before[index]))
		expect(shown).not.toHaveBeenCalled()
	})

	it('данные обновляют колонку на месте', () => {
		const columns = columnsWith([NAME, AGE])
		const name = columnOf(columns, 'name')

		columns.columns = [{ field: 'name', text: 'ФИО', width: 160, align: 'end' }, AGE]

		expect(columnOf(columns, 'name')).toBe(name)
		expect(name.text).toBe('ФИО')
		expect(name.width).toBe(160)
		expect(name.align).toBe('end')
	})

	it('новая колонка встаёт в конец; место колонок, которые уже есть, данные не меняют', () => {
		const columns = columnsWith([NAME, AGE])

		columns.columns = [ID, AGE, NAME]

		expect(fields(columns.columns)).toEqual(['name', 'age', 'id'])
	})

	it('пропавшая колонка удаляется', () => {
		const columns = columnsWith([NAME, AGE, ID])
		const age = columnOf(columns, 'age')

		columns.columns = [NAME, ID]

		expect(fields(columns.columns)).toEqual(['name', 'id'])
		expect(columns.columns).not.toContain(age)
	})

	it('пустой состав удаляет все колонки', () => {
		const columns = columnsWith([NAME, AGE])

		columns.columns = []

		expect(columns.columns).toEqual([])
		expect(columns.shownColumns).toEqual([])
	})

	it('коллекция колонок сама по себе сверяет их по field', () => {
		const engine = createEngineTableColumns({ items: [NAME, AGE] })
		const [name] = engine.extensions.batch.items

		engine.extensions.batch.items = [{ field: 'name', text: 'ФИО' }]

		expect(engine.extensions.batch.items).toEqual([name])
		expect(name.text).toBe('ФИО')
	})
})

describe('показанные колонки', () => {
	it('без скрытых и в порядке коллекции', () => {
		const columns = columnsWith([NAME, { ...AGE, visible: false }, ID])

		expect(fields(columns.shownColumns)).toEqual(['name', 'id'])
		expect(fields(columns.columns)).toEqual(['name', 'age', 'id'])
	})

	it('показанная снова колонка возвращается на своё место', () => {
		const columns = columnsWith([NAME, { ...AGE, visible: false }, ID])

		columnOf(columns, 'age').visible = true

		expect(fields(columns.shownColumns)).toEqual(['name', 'age', 'id'])
	})

	it('перемещение в коллекции меняет порядок показанных', () => {
		const columns = columnsWith([NAME, AGE, ID])

		columns.engine.extensions.plain.move(columnOf(columns, 'id'), 0)

		expect(fields(columns.shownColumns)).toEqual(['id', 'name', 'age'])
	})

	it('показанные — выборка коллекции колонок', () => {
		const columns = columnsWith([NAME, { ...AGE, visible: false }])

		expect(columns.shownColumns).toEqual(columns.engine.extensions.batch.shown)
	})

	describe('событие — ровно одно на смену', () => {
		it('первый состав', () => {
			const { columns } = rows().extensions
			const shown = watchShown(columns)

			columns.columns = [NAME, AGE, ID]

			expect(shown).toHaveBeenCalledTimes(1)
		})

		it('колонка добавлена и колонка удалена', () => {
			const columns = columnsWith([NAME, AGE])
			const shown = watchShown(columns)

			columns.columns = [NAME, AGE, ID]

			expect(shown).toHaveBeenCalledTimes(1)

			columns.columns = [NAME, ID]

			expect(shown).toHaveBeenCalledTimes(2)
		})

		it('колонку скрыли и показали', () => {
			const columns = columnsWith([NAME, AGE])
			const shown = watchShown(columns)
			const age = columnOf(columns, 'age')

			age.hide()

			expect(shown).toHaveBeenCalledTimes(1)
			expect(fields(columns.shownColumns)).toEqual(['name'])

			age.show()

			expect(shown).toHaveBeenCalledTimes(2)
			expect(fields(columns.shownColumns)).toEqual(['name', 'age'])
		})

		it('колонку переставили', () => {
			const columns = columnsWith([NAME, AGE, ID])
			const shown = watchShown(columns)

			columns.engine.extensions.plain.move(columnOf(columns, 'name'), 2)

			expect(shown).toHaveBeenCalledTimes(1)
		})

		it('запись сменила и состав, и видимость — событие одно, в её конце', () => {
			const columns = columnsWith([NAME, AGE])
			const shown = watchShown(columns)
			const seen: string[][] = []

			columns.events.on('change:shownColumns', () => seen.push(fields(columns.shownColumns)))
			columns.columns = [{ ...NAME, visible: false }, ID]

			expect(shown).toHaveBeenCalledTimes(1)
			expect(seen).toEqual([['id']])
		})

		it('коллекцию колонок очистили', () => {
			const columns = columnsWith([NAME, AGE])
			const shown = watchShown(columns)

			columns.engine.extensions.batch.clear()

			expect(shown).toHaveBeenCalledTimes(1)
			expect(columns.shownColumns).toEqual([])
		})
	})

	it('без смены состава, порядка и видимости события нет', () => {
		const columns = columnsWith([NAME, AGE])
		const shown = watchShown(columns)
		const name = columnOf(columns, 'name')

		name.text = 'ФИО'
		name.width = 200
		name.align = 'center'
		columns.columns = [{ ...NAME, text: 'Имя и фамилия' }, AGE]
		name.show()

		expect(shown).not.toHaveBeenCalled()
	})

	describe('удалённую колонку коллекция больше не слушает', () => {
		it('ушла из данных', () => {
			const columns = columnsWith([NAME])
			const late = new TTableColumn({ field: 'age' })
			const listeners = watchVisibleListeners(late)

			columns.engine.extensions.plain.push(late)

			expect(listeners()).toBe(1)

			columns.columns = [NAME]

			expect(listeners()).toBe(0)

			const shown = watchShown(columns)

			late.hide()

			expect(shown).not.toHaveBeenCalled()
		})

		it('удалена из коллекции и коллекцию очистили', () => {
			const columns = columnsWith([NAME])
			const removed = new TTableColumn({ field: 'age' })
			const cleared = new TTableColumn({ field: 'id' })
			const removedListeners = watchVisibleListeners(removed)
			const clearedListeners = watchVisibleListeners(cleared)
			const { plain, batch } = columns.engine.extensions

			plain.push(removed)
			plain.push(cleared)
			plain.remove(removed)

			expect(removedListeners()).toBe(0)
			expect(clearedListeners()).toBe(1)

			batch.clear()

			expect(clearedListeners()).toBe(0)
		})

		it('вернувшуюся колонку слушают снова — одной подпиской', () => {
			const columns = columnsWith([NAME])
			const age = new TTableColumn({ field: 'age' })
			const listeners = watchVisibleListeners(age)
			const { plain } = columns.engine.extensions

			plain.push(age)
			plain.remove(age)
			plain.push(age)

			expect(listeners()).toBe(1)

			const shown = watchShown(columns)

			age.hide()

			expect(shown).toHaveBeenCalledTimes(1)
		})
	})
})

describe('ширина', () => {
	it('ни своей, ни раскладки — итог undefined: ширину решает тема, границы ни при чём', () => {
		const column = new TTableColumn({ minWidth: 100, maxWidth: 200 })

		expect(column.width).toBeUndefined()
		expect(column.layoutWidth).toBeUndefined()
	})

	it('без своей — итог от раскладки, прижатый к границам', () => {
		const column = new TTableColumn({ minWidth: 100, maxWidth: 200 })

		column.layoutWidth = 150

		expect(column.width).toBe(150)

		column.layoutWidth = 480

		expect(column.width).toBe(200)

		column.layoutWidth = 40

		expect(column.width).toBe(100)
	})

	it('своя сильнее раскладки; сняли свою — итог снова от раскладки', () => {
		const column = new TTableColumn({ width: 120 })

		column.layoutWidth = 300

		expect(column.width).toBe(120)

		column.width = undefined

		expect(column.width).toBe(300)
	})

	it('change:width — на смену итога от раскладки; у колонки со своей шириной раскладка его не меняет', () => {
		const flexible = new TTableColumn()
		const fixed = new TTableColumn({ width: 120 })
		const changed = vi.fn()
		const unchanged = vi.fn()

		flexible.events.on('change:width', changed)
		fixed.events.on('change:width', unchanged)

		flexible.layoutWidth = 150
		flexible.layoutWidth = 150
		flexible.layoutWidth = undefined
		fixed.layoutWidth = 300

		expect(changed.mock.calls).toEqual([[150], [undefined]])
		expect(unchanged).not.toHaveBeenCalled()
	})

	it('в пропсах ширины раскладки нет — только своя', () => {
		const column = new TTableColumn()

		column.layoutWidth = 150

		expect(column.getProps().width).toBeUndefined()
	})

	it('итог прижат к границам; нижняя граница сильнее верхней', () => {
		expect(new TTableColumn({ width: 50, minWidth: 100 }).width).toBe(100)
		expect(new TTableColumn({ width: 300, maxWidth: 200 }).width).toBe(200)
		expect(new TTableColumn({ width: 150, minWidth: 100, maxWidth: 200 }).width).toBe(150)
		expect(new TTableColumn({ width: 150, minWidth: 300, maxWidth: 200 }).width).toBe(300)
	})

	it('change:width — только на смену итога', () => {
		const column = new TTableColumn({ width: 50, minWidth: 100 })
		const changed = vi.fn()

		column.events.on('change:width', changed)

		column.width = 80

		expect(changed).not.toHaveBeenCalled()

		column.width = 150

		expect(changed).toHaveBeenCalledTimes(1)
		expect(changed).toHaveBeenLastCalledWith(150)

		column.width = 150

		expect(changed).toHaveBeenCalledTimes(1)
	})

	it('смена границ двигает итог', () => {
		const column = new TTableColumn({ width: 150 })
		const width = vi.fn()
		const maxWidth = vi.fn()

		column.events.on('change:width', width)
		column.events.on('change:maxWidth', maxWidth)

		column.maxWidth = 120

		expect(column.width).toBe(120)
		expect(width).toHaveBeenCalledWith(120)
		expect(maxWidth).toHaveBeenCalledWith(120)

		column.minWidth = 130

		expect(column.width).toBe(130)
		expect(width).toHaveBeenLastCalledWith(130)
	})

	it('граница, не сменившая итог, ширину не трогает', () => {
		const column = new TTableColumn({ width: 150 })
		const width = vi.fn()

		column.events.on('change:width', width)

		column.minWidth = 100
		column.maxWidth = 200

		expect(column.width).toBe(150)
		expect(width).not.toHaveBeenCalled()
	})

	it('своё значение возвращается, когда границы снова его пускают', () => {
		const column = new TTableColumn({ width: 150, maxWidth: 100 })
		const width = vi.fn()

		column.events.on('change:width', width)

		expect(column.width).toBe(100)

		column.maxWidth = undefined

		expect(column.width).toBe(150)
		expect(width).toHaveBeenCalledWith(150)
	})

	it('своё значение, равное итогу, записывается', () => {
		const column = new TTableColumn({ width: 50, minWidth: 100 })
		const width = vi.fn()

		column.events.on('change:width', width)

		column.width = 100

		expect(width).not.toHaveBeenCalled()

		column.minWidth = undefined

		expect(column.width).toBe(100)
		expect(width).not.toHaveBeenCalled()
	})

	it('в пропсах — своё значение, а не итог', () => {
		const column = new TTableColumn({ width: 50, minWidth: 100 })

		expect(column.getProps()).toMatchObject({ width: 50, minWidth: 100, maxWidth: undefined })
	})

	it('из данных — тем же правилом', () => {
		const columns = columnsWith([{ field: 'name', width: 300, maxWidth: 200 }])
		const name = columnOf(columns, 'name')

		expect(name.width).toBe(200)

		columns.columns = [{ field: 'name', width: 300, maxWidth: 400 }]

		expect(columnOf(columns, 'name')).toBe(name)
		expect(name.width).toBe(300)
	})

	it('теме — итог переменной заголовка, в px; без ширины переменной нет', () => {
		const column = new TTableColumn({ width: 300, maxWidth: 200 })

		expect(column.widthStyle).toEqual({ '--s-table-column-width': '200px' })

		column.maxWidth = undefined

		expect(column.widthStyle).toEqual({ '--s-table-column-width': '300px' })

		column.width = undefined

		expect(column.widthStyle).toEqual({})
		expect(new TTableColumn().widthStyle).toEqual({})
	})

	it('переменная — значение: каждое чтение собирает её заново', () => {
		const column = new TTableColumn({ width: 120 })
		const first = column.widthStyle

		expect(column.widthStyle).not.toBe(first)
		expect(column.widthStyle).toEqual(first)
	})

	it('data-sized — ширина известна, своя или раскладки, с первой отрисовки; границы его не меняют', () => {
		const column = new TTableColumn({ maxWidth: 200 })

		expect(column.dataset.get('sized')).toBe('false')
		expect(new TTableColumn({ width: 120 }).dataset.get('sized')).toBe('true')

		column.width = 300

		expect(column.dataset.get('sized')).toBe('true')

		column.minWidth = 400
		column.width = undefined

		expect(column.dataset.get('sized')).toBe('false')

		column.layoutWidth = 160

		expect(column.dataset.get('sized')).toBe('true')
		expect(column.widthStyle).toEqual({ '--s-table-column-width': '400px' })

		column.layoutWidth = undefined

		expect(column.dataset.get('sized')).toBe('false')
	})
})

/**
 * Ручка ширины — значение у колонки, операция у плагина: где указатель и какая
 * клавиша, знает плагин (`plugins/__tests__/table-column-resize.plugin.spec.ts`),
 * а здесь — какой станет ширина: ход, пределы, нажатие без движения и одно
 * `commit` на действие.
 */
describe('ручка ширины', () => {
	/** Колонка с ручкой — и счётчик `commit`, поставленный до действия. */
	function resizable(props: Partial<ITableColumnProps> = {}) {
		const column = new TTableColumn({ resizable: true, ...props })
		const commit = vi.fn<(width: number) => void>()

		column.events.on('commit', commit)

		return { column, commit }
	}

	describe('рисовать ли ручку', () => {
		it('по умолчанию ручки нет: решение потребителя; признак — из данных', () => {
			expect(new TTableColumn({ width: 120 }).resizable).toBe(false)
			expect(new TTableColumn({ width: 120 }).resizerRendered).toBe(false)

			const columns = columnsWith([{ ...NAME, resizable: true }, AGE])

			expect(columns.columns.map((column) => column.resizable)).toEqual([true, false])
		})

		it('ручка — у колонки с известной шириной: своей или раскладки', () => {
			const { column } = resizable()

			// Ширину решает тема, и до раскладки полю нечего показать
			expect(column.resizerRendered).toBe(false)

			column.layoutWidth = 150

			expect(column.resizerRendered).toBe(true)
			expect(resizable({ width: 120 }).column.resizerRendered).toBe(true)
		})

		it('раскладку сняли — ширина снова неизвестна, ручки нет', () => {
			const { column } = resizable()

			column.layoutWidth = 150
			column.layoutWidth = undefined

			expect(column.resizerRendered).toBe(false)
		})

		it('у выключенной колонки ручки нет', () => {
			const { column } = resizable({ width: 120, disabled: true })

			expect(column.resizerRendered).toBe(false)

			column.disabled = false

			expect(column.resizerRendered).toBe(true)
		})

		it('change:resizerRendered — только на смену', () => {
			const column = new TTableColumn()
			const rendered = vi.fn()

			column.events.on('change:resizerRendered', rendered)

			column.resizable = true
			column.layoutWidth = 150
			column.layoutWidth = 160
			column.width = 200
			column.disabled = true
			column.disabled = true

			expect(rendered.mock.calls).toEqual([[true], [false]])
		})

		it('change:resizable и change:disabled — только на смену; в пропсах — оба', () => {
			const column = new TTableColumn()
			const changed = vi.fn()

			column.events.on('change:resizable', changed)
			column.events.on('change:disabled', changed)

			column.resizable = true
			column.resizable = true
			column.disabled = true
			column.disabled = true

			expect(changed.mock.calls).toEqual([[true], [true]])
			expect(column.getProps()).toMatchObject({ resizable: true, disabled: true })
		})
	})

	describe('поле ручки', () => {
		it('ход — границы колонки; значение — итог ширины', () => {
			const { column } = resizable({ width: 150, minWidth: 100, maxWidth: 300 })

			expect(column.resizer).toEqual({ min: 100, max: 300, value: 150 })

			column.width = 500

			expect(column.resizer).toEqual({ min: 100, max: 300, value: 300 })
		})

		it('без границ — пределы ядра: конечные и вокруг обычной ширины', () => {
			const { min, max, value } = resizable({ width: 150 }).column.resizer

			expect(value).toBe(150)
			expect(min).toBeGreaterThan(0)
			expect(min).toBeLessThan(150)
			expect(max).toBeGreaterThan(150)
			expect(Number.isFinite(max)).toBe(true)
		})

		it('ширина всегда в ходе: ширина за пределами ядра расширяет ход до себя', () => {
			const wide = resizable({ width: 100_000 }).column.resizer
			const narrow = resizable({ width: 1 }).column.resizer

			expect(wide.max).toBe(100_000)
			expect(narrow.min).toBe(1)
		})

		it('одна граница — пределы ядра её не переходят', () => {
			expect(resizable({ width: 20, maxWidth: 30 }).column.resizer).toEqual({
				min: 20,
				max: 30,
				value: 20,
			})
			expect(resizable({ width: 5000, minWidth: 4000 }).column.resizer.min).toBe(4000)
		})

		it('нижняя граница сильнее верхней, как у итога', () => {
			expect(resizable({ width: 150, minWidth: 300, maxWidth: 200 }).column.resizer).toEqual({
				min: 300,
				max: 300,
				value: 300,
			})
		})

		it('без своей ширины — ширина раскладки, в границах; ход полю — тот же', () => {
			const { column } = resizable({ minWidth: 100, maxWidth: 360 })

			column.layoutWidth = 180

			expect(column.resizer).toEqual({ min: 100, max: 360, value: 180 })

			// Раскладка шире границы — поле показывает итог, в ходе
			column.layoutWidth = 480

			expect(column.resizer).toEqual({ min: 100, max: 360, value: 360 })
		})

		it('поле — значение: каждое чтение собирает его заново', () => {
			const { column } = resizable({ width: 150 })
			const first = column.resizer

			expect(column.resizer).not.toBe(first)
			expect(column.resizer).toEqual(first)
		})

		it('change:resizer — только на смену хода или ширины', () => {
			const { column } = resizable({ width: 150 })
			const changed = vi.fn()

			column.events.on('change:resizer', changed)

			// Раскладка колонке со своей шириной поля не меняет
			column.layoutWidth = 170
			column.width = 150
			column.maxWidth = 300
			column.maxWidth = 300
			column.width = 200

			expect(changed.mock.calls).toEqual([
				[{ min: column.resizer.min, max: 300, value: 150 }],
				[{ min: column.resizer.min, max: 300, value: 200 }],
			])
		})
	})

	describe('жест указателя', () => {
		it('нажатие без движения ширину не задаёт и commit не шлёт: гибкая остаётся гибкой', () => {
			const { column, commit } = resizable()
			const width = vi.fn()

			column.layoutWidth = 150
			column.events.on('change:width', width)

			expect(column.grab()).toBe(true)

			column.drag(0)
			column.release()

			expect(column.width).toBe(150)
			expect(column.getProps().width).toBeUndefined()
			expect(width).not.toHaveBeenCalled()
			expect(commit).not.toHaveBeenCalled()
		})

		it('протяжка — итог при нажатии плюс сдвиг; commit — один, на отпускание', () => {
			const { column, commit } = resizable({ width: 150 })
			const width = vi.fn()

			column.events.on('change:width', width)

			column.grab()
			column.drag(10)
			column.drag(25)
			column.drag(-5)

			expect(width.mock.calls).toEqual([[160], [175], [145]])
			expect(commit).not.toHaveBeenCalled()

			column.release()

			expect(column.width).toBe(145)
			expect(commit.mock.calls).toEqual([[145]])
		})

		it('ширина нажатия — итог, а не своё значение: сдвиг идёт от того, что видно', () => {
			const { column } = resizable({ width: 300, maxWidth: 200 })

			column.grab()
			column.drag(-10)

			expect(column.width).toBe(190)
		})

		it('без ширины жеста нет: гибкой колонке без раскладки тянуть нечего', () => {
			const { column } = resizable()

			expect(column.grab()).toBe(false)
			expect(column.dataset.get('resizing')).toBe('false')
		})

		it('гибкая колонка: протяжка задаёт свою ширину, commit — с итогом', () => {
			const { column, commit } = resizable()

			column.layoutWidth = 200
			column.grab()
			column.drag(-40)
			column.release()

			expect(column.width).toBe(160)
			expect(column.getProps().width).toBe(160)
			expect(commit.mock.calls).toEqual([[160]])
		})

		it('туда и обратно — ширина та же, commit нет', () => {
			const { column, commit } = resizable({ width: 150 })

			column.grab()
			column.drag(30)
			column.drag(0)
			column.release()

			expect(column.width).toBe(150)
			expect(commit).not.toHaveBeenCalled()
		})

		it('гибкая колонка: жест, вернувшийся к точке нажатия, оставляет её гибкой', () => {
			const { column, commit } = resizable()

			column.layoutWidth = 200
			column.grab()
			column.drag(-40)

			expect(column.getProps().width).toBe(160)

			column.drag(0)

			expect(column.getProps().width).toBeUndefined()

			// Раскладка сменилась посреди жеста — колонка от неё, пока она гибкая
			column.layoutWidth = 210

			expect(column.width).toBe(210)

			column.release()

			expect(commit).not.toHaveBeenCalled()
		})

		it('протяжка за край хода от его края — гибкая остаётся гибкой', () => {
			const { column, commit } = resizable({ maxWidth: 200 })

			column.layoutWidth = 200
			column.grab()
			column.drag(40)
			column.release()

			expect(column.width).toBe(200)
			expect(column.getProps().width).toBeUndefined()
			expect(commit).not.toHaveBeenCalled()
		})

		it('протяжка — в ходе ручки; ход считан при нажатии, на весь жест', () => {
			const { column } = resizable({ width: 150, minWidth: 100, maxWidth: 200 })

			column.grab()
			column.drag(500)

			expect(column.width).toBe(200)

			column.drag(-500)

			expect(column.width).toBe(100)
		})

		it('ширина — целые px', () => {
			const { column, commit } = resizable({ width: 150.4 })

			column.grab()
			column.drag(10.3)
			column.release()

			expect(column.width).toBe(160)
			expect(commit.mock.calls).toEqual([[160]])
		})

		it('data-resizing — от нажатия до отпускания; с первой отрисовки false', () => {
			const { column } = resizable({ width: 150 })

			expect(column.dataset.get('resizing')).toBe('false')

			column.grab()

			expect(column.dataset.get('resizing')).toBe('true')

			column.release()

			expect(column.dataset.get('resizing')).toBe('false')
		})

		it('без ручки жеста нет: не resizable или выключена', () => {
			const fixed = new TTableColumn({ width: 150 })
			const { column } = resizable({ width: 150, disabled: true })

			expect(fixed.grab()).toBe(false)
			expect(column.grab()).toBe(false)

			fixed.drag(20)
			column.drag(20)

			expect(fixed.width).toBe(150)
			expect(column.width).toBe(150)
			expect(column.dataset.get('resizing')).toBe('false')
		})

		it('вне жеста протяжка и отпускание ничего не делают', () => {
			const { column, commit } = resizable({ width: 150 })

			column.drag(20)
			column.release()

			expect(column.width).toBe(150)
			expect(commit).not.toHaveBeenCalled()
		})

		it('выключили посреди жеста — протяжка стоит, отпускание отдаёт сделанное', () => {
			const { column, commit } = resizable({ width: 150 })

			column.grab()
			column.drag(20)
			column.disabled = true
			column.drag(40)
			column.release()

			expect(column.width).toBe(170)
			expect(commit.mock.calls).toEqual([[170]])
		})

		it('новое нажатие закрывает незаконченный жест', () => {
			const { column, commit } = resizable({ width: 150 })

			column.grab()
			column.drag(20)
			column.grab()

			expect(commit.mock.calls).toEqual([[170]])

			column.drag(10)
			column.release()

			expect(commit.mock.calls).toEqual([[170], [180]])
		})
	})

	describe('клавиши', () => {
		it('shift — шире и уже на сдвиг; commit на каждое действие', () => {
			const { column, commit } = resizable({ width: 150 })

			column.shift(10)
			column.shift(-30)

			expect(column.width).toBe(130)
			expect(commit.mock.calls).toEqual([[160], [130]])
		})

		it('у края хода — ни смены, ни commit', () => {
			const { column, commit } = resizable({ width: 200, maxWidth: 200 })

			column.shift(10)

			expect(column.width).toBe(200)
			expect(commit).not.toHaveBeenCalled()

			column.shift(-10)

			expect(commit.mock.calls).toEqual([[190]])
		})

		it('moveToEdge — края хода', () => {
			const { column, commit } = resizable({ width: 150, minWidth: 100, maxWidth: 300 })

			column.moveToEdge('end')

			expect(column.width).toBe(300)

			column.moveToEdge('start')
			column.moveToEdge('start')

			expect(column.width).toBe(100)
			expect(commit.mock.calls).toEqual([[300], [100]])
		})

		it('без своей ширины — от раскладки; без раскладки клавиши ничего не делают', () => {
			const { column, commit } = resizable()

			column.shift(10)
			column.moveToEdge('end')

			expect(column.width).toBeUndefined()

			column.layoutWidth = 150
			column.shift(10)

			expect(column.width).toBe(160)
			expect(column.getProps().width).toBe(160)
			expect(commit.mock.calls).toEqual([[160]])
		})

		it('у края хода своё значение не пишется: гибкая колонка остаётся гибкой', () => {
			const { column, commit } = resizable({ minWidth: 120, maxWidth: 360 })

			column.layoutWidth = 360
			column.shift(10)
			column.moveToEdge('end')

			expect(column.getProps().width).toBeUndefined()

			column.layoutWidth = 120
			column.shift(-10)
			column.moveToEdge('start')

			expect(column.getProps().width).toBeUndefined()
			expect(commit).not.toHaveBeenCalled()
		})

		it('раскладка в границах — первая клавиша двигает ширину ровно на шаг', () => {
			const { column, commit } = resizable({ minWidth: 120, maxWidth: 360 })

			column.layoutWidth = 360
			column.shift(-10)

			expect(column.width).toBe(350)
			expect(commit.mock.calls).toEqual([[350]])
		})

		it('без ручки клавиши ничего не делают', () => {
			const fixed = new TTableColumn({ width: 150 })
			const { column } = resizable({ width: 150, disabled: true })

			fixed.shift(10)
			fixed.moveToEdge('end')
			column.shift(10)
			column.moveToEdge('end')

			expect(fixed.width).toBe(150)
			expect(column.width).toBe(150)
		})
	})

	describe('наборы', () => {
		it('у поля ручки и обёртки содержимого — свои, пустые до плагина связок', () => {
			const column = new TTableColumn()

			expect(column.resizerAria.toObject()).toEqual({})
			expect(column.contentAria.toObject()).toEqual({})
			expect(column.resizerAria).not.toBe(column.contentAria)
			expect(column.resizerAria).not.toBe(column.aria)
		})

		it('смена набора — событие с его снимком', () => {
			const column = new TTableColumn()
			const resizer = vi.fn()
			const content = vi.fn()

			column.events.on('change:resizerAria', resizer)
			column.events.on('change:contentAria', content)

			column.resizerAria.add('aria-labelledby', 'x')
			column.contentAria.add('id', 'x')

			expect(resizer.mock.calls).toEqual([[{ 'aria-labelledby': 'x' }]])
			expect(content.mock.calls).toEqual([[{ id: 'x' }]])
		})
	})
})

describe('заголовок строки', () => {
	it('по умолчанию колонка строки не называет; признак — из данных', () => {
		expect(new TTableColumn().rowHeader).toBe(false)

		const columns = columnsWith([{ ...NAME, rowHeader: true }, AGE])

		expect(columns.columns.map((column) => column.rowHeader)).toEqual([true, false])
	})

	it('change:rowHeader — только на смену; в пропсах — признак', () => {
		const column = new TTableColumn()
		const changed = vi.fn()

		column.events.on('change:rowHeader', changed)
		column.rowHeader = false
		column.rowHeader = true
		column.rowHeader = true

		expect(changed.mock.calls).toEqual([[true]])
		expect(column.getProps()).toMatchObject({ rowHeader: true })
	})
})

describe('заголовок', () => {
	it('корень — ячейка шапки', () => {
		expect(new TTableColumn().tag).toBe('th')
	})

	it('scope="col" — нативный атрибут заголовка-th; у другого тега его нет', () => {
		const column = new TTableColumn()

		expect(column.attrs.toObject()).toMatchObject({ scope: 'col' })

		column.tag = 'td'

		expect(column.attrs.has('scope')).toBe(false)

		column.tag = 'th'

		expect(column.attrs.get('scope')).toBe('col')
	})

	it('data-align — с первой отрисовки, по умолчанию start', () => {
		expect(new TTableColumn().dataset.get('align')).toBe('start')
		expect(new TTableColumn({ align: 'center' }).dataset.get('align')).toBe('center')
	})

	it('смена выравнивания — data-align и change:align', () => {
		const column = new TTableColumn()
		const align = vi.fn()
		const dataset = vi.fn()

		column.events.on('change:align', align)
		column.events.on('change:dataset', dataset)

		column.align = 'end'

		expect(column.dataset.toObject()).toMatchObject({ 'data-align': 'end' })
		expect(align).toHaveBeenCalledWith('end')
		expect(dataset).toHaveBeenCalledTimes(1)

		column.align = 'end'

		expect(align).toHaveBeenCalledTimes(1)
	})
})

/**
 * Перестановка колонок пользователем — команда `moveColumn` и жест
 * `dragStart` → `dragOver` → `dragDrop` → `dragEnd` расширения `columns`.
 *
 * Место — среди показанных: скрытые колонки пользователь не видит, и они
 * остаются между своими соседями. Жест коллекцию не трогает, пока заголовок не
 * встал (`dragEnd`): перестановка одна, — строк в таблице тысячи, и
 * перестановка на каждом шаге указателя перерисовывала бы их все. Пока несут,
 * метки рассказывают теме, куда колонка встанет и кто уступает ей место;
 * отпустили (`dragDrop`) — место заморожено, пока заголовок едет туда.
 */
describe('перестановка колонок', () => {
	const MOVABLE = [NAME, AGE, ID].map((source) => ({ ...source, reorderable: true }))

	/** Колонки, которые пользователь вправе переставлять, и счётчик `column:move`. */
	function movable(sources: readonly TTableColumnSource[] = MOVABLE) {
		const columns = columnsWith(sources)
		const move = vi.fn<TTableColumnsEvents['column:move']>()

		columns.events.on('column:move', move)

		return { columns, move }
	}

	describe('reorderable', () => {
		it('по умолчанию нет; data-reorderable — с первой отрисовки', () => {
			expect(new TTableColumn().reorderable).toBe(false)
			expect(new TTableColumn().dataset.get('reorderable')).toBe('false')
			expect(new TTableColumn({ reorderable: true }).dataset.get('reorderable')).toBe('true')
		})

		it('смена — data-reorderable и change:reorderable, только на смену; в пропсах', () => {
			const column = new TTableColumn()
			const changed = vi.fn()

			column.events.on('change:reorderable', changed)

			column.reorderable = true
			column.reorderable = true

			expect(changed).toHaveBeenCalledTimes(1)
			expect(changed).toHaveBeenCalledWith(true)
			expect(column.dataset.get('reorderable')).toBe('true')
			expect(column.getProps()).toMatchObject({ reorderable: true })
		})
	})

	describe('moveColumn', () => {
		it('вперёд — после колонки места, назад — перед ней; column:move — с порядком', () => {
			const { columns, move } = movable()
			const name = columnOf(columns, 'name')

			expect(columns.moveColumn(name, 2)).toBe(true)
			expect(fields(columns.columns)).toEqual(['age', 'id', 'name'])
			expect(move).toHaveBeenCalledTimes(1)
			expect(move).toHaveBeenCalledWith({ column: name, order: ['age', 'id', 'name'] })

			expect(columns.moveColumn(columnOf(columns, 'id'), 0)).toBe(true)
			expect(fields(columns.columns)).toEqual(['id', 'age', 'name'])
		})

		it('место — среди показанных: скрытая колонка остаётся между соседями', () => {
			const { columns } = movable([...MOVABLE, { field: 'city', reorderable: true }])
			const age = columnOf(columns, 'age')

			age.visible = false

			expect(fields(columns.shownColumns)).toEqual(['name', 'id', 'city'])

			// `city` — на место `name`, первое из показанных
			columns.moveColumn(columnOf(columns, 'city'), 0)

			expect(fields(columns.columns)).toEqual(['city', 'name', 'age', 'id'])

			// `name` — на место `id`: скрытая `age` остаётся перед `id`
			columns.moveColumn(columnOf(columns, 'name'), 2)

			expect(fields(columns.columns)).toEqual(['city', 'age', 'id', 'name'])
		})

		it('место за краем показанных — край', () => {
			const { columns } = movable()

			columns.moveColumn(columnOf(columns, 'name'), 99)

			expect(fields(columns.columns)).toEqual(['age', 'id', 'name'])

			columns.moveColumn(columnOf(columns, 'name'), -5)

			expect(fields(columns.columns)).toEqual(['name', 'age', 'id'])
		})

		it('отказ: без reorderable, выключенная, скрытая, то же место — без column:move', () => {
			const { columns, move } = movable([NAME, ...MOVABLE.slice(1)])
			const age = columnOf(columns, 'age')
			const id = columnOf(columns, 'id')

			expect(columns.moveColumn(columnOf(columns, 'name'), 2)).toBe(false)

			age.disabled = true

			expect(columns.moveColumn(age, 0)).toBe(false)

			id.visible = false

			expect(columns.moveColumn(id, 0)).toBe(false)

			age.disabled = false

			expect(columns.moveColumn(age, 1)).toBe(false)
			expect(fields(columns.columns)).toEqual(['name', 'age', 'id'])
			expect(move).not.toHaveBeenCalled()
		})

		it('колонку без reorderable можно обойти: другие встают по обе стороны от неё', () => {
			const { columns } = movable([MOVABLE[0], { field: 'fixed' }, MOVABLE[2]])

			columns.moveColumn(columnOf(columns, 'id'), 0)

			expect(fields(columns.columns)).toEqual(['id', 'name', 'fixed'])
		})

		it('перемещение, отменённое в item:move:before, — false и без column:move', () => {
			const { columns, move } = movable()

			columns.engine.extensions.plain.events.on('item:move:before', (e) => e.preventDefault())

			expect(columns.moveColumn(columnOf(columns, 'name'), 2)).toBe(false)
			expect(fields(columns.columns)).toEqual(['name', 'age', 'id'])
			expect(move).not.toHaveBeenCalled()
		})

		it('код переставляет любые колонки перемещением в коллекции — без column:move', () => {
			const { columns, move } = movable([NAME, AGE])

			columns.engine.extensions.plain.move(columnOf(columns, 'age'), 0)

			expect(fields(columns.columns)).toEqual(['age', 'name'])
			expect(move).not.toHaveBeenCalled()
		})
	})

	describe('жест', () => {
		const drop = (column: ITableColumn) => column.dataset.get('drop')

		it('взятая колонка — data-dragging; коллекцию жест не трогает до отпускания', () => {
			const { columns, move } = movable()
			const name = columnOf(columns, 'name')
			const shown = watchShown(columns)

			expect(columns.dragStart(name)).toBe(true)
			expect(columns.dragged).toBe(name)
			expect(name.dataset.get('dragging')).toBe('true')

			columns.dragOver(1)
			columns.dragOver(2)

			expect(fields(columns.columns)).toEqual(['name', 'age', 'id'])
			expect(shown).not.toHaveBeenCalled()

			columns.dragEnd()

			expect(fields(columns.columns)).toEqual(['age', 'id', 'name'])
			expect(shown).toHaveBeenCalledTimes(1)
			expect(move).toHaveBeenCalledTimes(1)
			expect(columns.dragged).toBeUndefined()
			expect(name.dataset.has('dragging')).toBe(false)
		})

		it('метка — на колонке места, у края, к которому встанет колонка; на своём месте — нет', () => {
			const { columns } = movable()
			const [name, age, id] = columns.columns

			columns.dragStart(age)
			columns.dragOver(2)

			expect(drop(id)).toBe('after')

			columns.dragOver(0)

			expect(drop(id)).toBeUndefined()
			expect(drop(name)).toBe('before')

			columns.dragOver(1)

			expect(drop(name)).toBeUndefined()
			expect([name, age, id].some((column) => column.dataset.has('drop'))).toBe(false)
		})

		it('отпустили на своём месте — перестановки и column:move нет', () => {
			const { columns, move } = movable()

			columns.dragStart(columnOf(columns, 'age'))
			columns.dragOver(1)
			columns.dragEnd()

			expect(fields(columns.columns)).toEqual(['name', 'age', 'id'])
			expect(move).not.toHaveBeenCalled()
		})

		describe('соседи уступают место', () => {
			const CITY: TTableColumnSource = { field: 'city', text: 'Город', reorderable: true }

			/** Метки сдвига по порядку колонок: нет метки — `-`. */
			const shifts = (columns: ITableColumnsExtension) =>
				columns.columns.map((column) => column.dataset.get('shift') ?? '-')

			it('несут к концу — колонки от места взятой до места включительно уступают к началу', () => {
				const { columns } = movable([...MOVABLE, CITY])
				const name = columnOf(columns, 'name')

				columns.dragStart(name)

				expect(shifts(columns)).toEqual(['-', '-', '-', '-'])

				columns.dragOver(1)

				expect(shifts(columns)).toEqual(['-', 'start', '-', '-'])

				columns.dragOver(3)

				expect(shifts(columns)).toEqual(['-', 'start', 'start', 'start'])

				// Назад, но не до своего места — уступает меньше колонок
				columns.dragOver(2)

				expect(shifts(columns)).toEqual(['-', 'start', 'start', '-'])
			})

			it('несут к началу — колонки уступают к концу; через своё место — сторона меняется', () => {
				const { columns } = movable([...MOVABLE, CITY])
				const id = columnOf(columns, 'id')

				columns.dragStart(id)
				columns.dragOver(0)

				expect(shifts(columns)).toEqual(['end', 'end', '-', '-'])

				columns.dragOver(3)

				expect(shifts(columns)).toEqual(['-', '-', '-', 'start'])
			})

			it('вернули на своё место — меток нет', () => {
				const { columns } = movable([...MOVABLE, CITY])

				columns.dragStart(columnOf(columns, 'age'))
				columns.dragOver(3)
				columns.dragOver(1)

				expect(shifts(columns)).toEqual(['-', '-', '-', '-'])
			})

			it('пишется только то, что сменилось: остальные колонки шаг не трогает', () => {
				const { columns } = movable([...MOVABLE, CITY])
				const [name, age, id, city] = columns.columns
				const changes = new Map(
					[name, age, id, city].map((column) => {
						const changed = vi.fn()

						column.events.on('change:dataset', changed)

						return [column, changed] as const
					}),
				)
				const count = (column: ITableColumn) => changes.get(column)?.mock.calls.length

				columns.dragStart(name)
				columns.dragOver(2)
				changes.forEach((changed) => changed.mockClear())

				// Шаг вперёд: метка — новой колонке места, у прежних не меняется
				columns.dragOver(3)

				expect(count(age)).toBe(0)
				// У `id` снята метка места, а сдвиг тот же
				expect(count(id)).toBe(1)
				// У `city` — метка места и сдвиг
				expect(count(city)).toBe(2)

				changes.forEach((changed) => changed.mockClear())

				// Тот же шаг — ничего
				columns.dragOver(3)

				expect(
					[...changes.values()].every((changed) => changed.mock.calls.length === 0),
				).toBe(true)
			})
		})

		describe('приземление', () => {
			/** Метки жеста, которые стоят на колонках, — по полям. */
			const marks = (columns: ITableColumnsExtension) =>
				columns.columns.flatMap((column) =>
					['dragging', 'landing', 'drop', 'shift']
						.filter((mark) => column.dataset.has(mark))
						.map((mark) => `${column.field}:${mark}`),
				)

			it('dragDrop — взятой data-landing, место заморожено, коллекция не тронута', () => {
				const { columns, move } = movable()
				const [name, age, id] = columns.columns

				columns.dragStart(name)
				columns.dragOver(2)
				columns.dragDrop()

				expect(name.dataset.get('landing')).toBe('true')
				expect(columns.dragged).toBe(name)

				// Указатель ещё шлёт места — заморожено
				columns.dragOver(0)

				expect(id.dataset.get('drop')).toBe('after')
				expect([age, id].map((column) => column.dataset.get('shift'))).toEqual([
					'start',
					'start',
				])
				expect(fields(columns.columns)).toEqual(['name', 'age', 'id'])
				expect(move).not.toHaveBeenCalled()
			})

			it('dragEnd после него — на замороженное место, одним column:move, меток нет', () => {
				const { columns, move } = movable()
				const name = columnOf(columns, 'name')
				const shown = watchShown(columns)

				columns.dragStart(name)
				columns.dragOver(2)
				columns.dragDrop()
				columns.dragOver(0)

				expect(marks(columns)).toEqual([
					'name:dragging',
					'name:landing',
					'age:shift',
					'id:drop',
					'id:shift',
				])

				columns.dragEnd()

				expect(fields(columns.columns)).toEqual(['age', 'id', 'name'])
				expect(move).toHaveBeenCalledTimes(1)
				expect(move).toHaveBeenCalledWith({ column: name, order: ['age', 'id', 'name'] })
				expect(shown).toHaveBeenCalledTimes(1)
				expect(columns.dragged).toBeUndefined()
				expect(marks(columns)).toEqual([])
			})

			it('dragCancel — колонка на месте, все метки сняты', () => {
				const { columns, move } = movable()

				columns.dragStart(columnOf(columns, 'name'))
				columns.dragOver(2)
				columns.dragDrop()
				columns.dragCancel()

				expect(fields(columns.columns)).toEqual(['name', 'age', 'id'])
				expect(move).not.toHaveBeenCalled()
				expect(marks(columns)).toEqual([])
			})

			it('вне жеста dragDrop ничего не делает', () => {
				const { columns } = movable()
				const name = columnOf(columns, 'name')

				columns.dragDrop()

				expect(name.dataset.has('landing')).toBe(false)
				expect(columns.dragged).toBeUndefined()
			})

			it('состав показанных сменился, пока заголовок приземляется, — жест прерван', () => {
				const { columns, move } = movable()
				const [name, age] = columns.columns

				columns.dragStart(name)
				columns.dragOver(2)
				columns.dragDrop()
				age.visible = false

				expect(columns.dragged).toBeUndefined()
				expect(marks(columns)).toEqual([])

				columns.dragEnd()

				expect(fields(columns.columns)).toEqual(['name', 'age', 'id'])
				expect(move).not.toHaveBeenCalled()
			})

			it('перемещение отменили в item:move:before — колонка на месте, метки сняты', () => {
				const { columns, move } = movable()

				columns.engine.extensions.plain.events.on('item:move:before', (e) =>
					e.preventDefault(),
				)

				columns.dragStart(columnOf(columns, 'name'))
				columns.dragOver(2)
				columns.dragDrop()
				columns.dragEnd()

				expect(fields(columns.columns)).toEqual(['name', 'age', 'id'])
				expect(move).not.toHaveBeenCalled()
				expect(columns.dragged).toBeUndefined()
				expect(marks(columns)).toEqual([])
			})
		})

		it('dragCancel — колонка на месте, метки сняты', () => {
			const { columns, move } = movable()
			const [name, , id] = columns.columns

			columns.dragStart(name)
			columns.dragOver(2)
			columns.dragCancel()

			expect(fields(columns.columns)).toEqual(['name', 'age', 'id'])
			expect(name.dataset.has('dragging')).toBe(false)
			expect(id.dataset.has('drop')).toBe(false)
			expect(move).not.toHaveBeenCalled()

			// Вне жеста команды жеста ничего не делают
			columns.dragOver(1)
			columns.dragEnd()

			expect(move).not.toHaveBeenCalled()
		})

		it('колонку без reorderable, выключенную и скрытую не взять', () => {
			const { columns } = movable([NAME, ...MOVABLE.slice(1)])
			const age = columnOf(columns, 'age')
			const id = columnOf(columns, 'id')

			expect(columns.dragStart(columnOf(columns, 'name'))).toBe(false)

			age.disabled = true
			id.visible = false

			expect(columns.dragStart(age)).toBe(false)
			expect(columns.dragStart(id)).toBe(false)
			expect(columns.dragged).toBeUndefined()
		})

		it('выключили, пока несли, — отпускание колонку не переставляет', () => {
			const { columns, move } = movable()
			const name = columnOf(columns, 'name')

			columns.dragStart(name)
			columns.dragOver(2)
			name.disabled = true
			columns.dragEnd()

			expect(fields(columns.columns)).toEqual(['name', 'age', 'id'])
			expect(move).not.toHaveBeenCalled()
			expect(name.dataset.has('dragging')).toBe(false)
		})

		it('состав показанных сменился посреди жеста — жест прерван', () => {
			const { columns, move } = movable()
			const [name, , id] = columns.columns

			columns.dragStart(name)
			columns.dragOver(2)
			id.visible = false

			expect(columns.dragged).toBeUndefined()
			expect(name.dataset.has('dragging')).toBe(false)
			expect(id.dataset.has('drop')).toBe(false)

			columns.dragEnd()

			expect(move).not.toHaveBeenCalled()
		})

		it('новый жест закрывает незаконченный без перестановки', () => {
			const { columns, move } = movable()
			const [name, age, id] = columns.columns

			columns.dragStart(name)
			columns.dragOver(2)
			columns.dragStart(age)

			expect(name.dataset.has('dragging')).toBe(false)
			expect(id.dataset.has('drop')).toBe(false)
			expect(columns.dragged).toBe(age)
			expect(move).not.toHaveBeenCalled()
		})
	})
})

describe('фасад колонки', () => {
	it('order — место колонки в коллекции; перестановка доходит событием', () => {
		const columns = columnsWith([NAME, AGE, ID])
		const age = columnOf(columns, 'age')
		const facade = new TTableColumnCollectionFacade()
		const order = vi.fn()

		expect(facade.order).toBe(-1)

		facade.setContext(new TItemContext(age, columns.engine.getCore().extensions))
		facade.events.on('change:order', order)

		expect(facade.order).toBe(1)

		columns.engine.extensions.plain.move(age, 0)

		expect(facade.order).toBe(0)
		expect(order).toHaveBeenCalledTimes(1)
	})
})
