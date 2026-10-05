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
	it('не задана — итог undefined: ширину решает тема, границы ни при чём', () => {
		const column = new TTableColumn({ minWidth: 100, maxWidth: 200 })

		expect(column.width).toBeUndefined()
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
