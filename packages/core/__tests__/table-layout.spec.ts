import { describe, it, expect, vi } from 'vitest'
import { TTable, createEngineTable } from '@soldy-ui/core'
import type {
	ITableColumn,
	TTableCollection,
	TTableColumnFit,
	TTableColumnSource,
} from '@soldy-ui/core'
import { layoutColumns } from '../src/components/custom/table/collection/extensions/columns/layout'

/**
 * Раскладка колонок таблицы — ширины гибких колонок, колонок без своей
 * ширины, по месту таблицы и её `columnFit`.
 *
 * Сначала — сама раскладка, чистой функцией: режимы, общий уровень, границы,
 * сумма ровно в место и «шире места». Потом — расширение колонок, которое её
 * держит: что будит пересчёт, что оно пишет колонкам и таблице и чего не
 * делает без таблицы. Место в документе мерит плагин
 * (`plugins/__tests__/table-layout.plugin.spec.ts`), настоящую раскладку —
 * браузер (`playground/vue/browser/table.spec.ts`).
 */

/** Колонка для раскладки: своя ширина и границы. */
const column = (width?: number, minWidth?: number, maxWidth?: number) => ({
	width,
	minWidth,
	maxWidth,
})

/** Гибкая колонка с границами. */
const flexible = (minWidth?: number, maxWidth?: number) => column(undefined, minWidth, maxWidth)

/** Сумма ширин раскладки. */
const sum = (widths: ReadonlyArray<number | undefined>): number =>
	widths.reduce<number>((acc, width) => acc + (width ?? 0), 0)

describe('раскладка: none', () => {
	it('гибкие — в ширине по умолчанию, и места она не ждёт', () => {
		const { widths, overflow } = layoutColumns(undefined, 'none', [flexible(), flexible()])

		expect(widths).toEqual([160, 160])
		expect(overflow).toBeUndefined()
	})

	it('ширина по умолчанию — в границах колонки', () => {
		const { widths } = layoutColumns(undefined, 'none', [
			flexible(200),
			flexible(undefined, 100),
			flexible(120, 360),
		])

		expect(widths).toEqual([200, 100, 160])
	})

	it('колонка со своей шириной — без ширины раскладки', () => {
		const { widths } = layoutColumns(1000, 'none', [column(120), flexible()])

		expect(widths).toEqual([undefined, 160])
	})

	it('шире места — по сумме со своими ширинами', () => {
		const columns = [column(120), flexible(), flexible()]

		expect(layoutColumns(439, 'none', columns).overflow).toBe(true)
		expect(layoutColumns(440, 'none', columns).overflow).toBe(false)
		expect(layoutColumns(1000, 'none', columns).widths).toEqual([undefined, 160, 160])
	})
})

describe('раскладка: auto', () => {
	it('места нет — ширин нет: колонки раскладывает тема', () => {
		expect(layoutColumns(undefined, 'auto', [column(120), flexible()])).toEqual({
			widths: [undefined, undefined],
			overflow: undefined,
		})
	})

	it('гибкие делят место, оставшееся от своих ширин, поровну', () => {
		const { widths, overflow } = layoutColumns(600, 'auto', [
			column(120),
			flexible(),
			flexible(),
		])

		expect(widths).toEqual([undefined, 240, 240])
		expect(overflow).toBe(false)
	})

	it('сумма — ровно место в целых px: остаток — по пикселю первым', () => {
		const { widths } = layoutColumns(602, 'auto', [flexible(), flexible(), flexible()])

		expect(widths).toEqual([201, 201, 200])
		expect(sum(widths)).toBe(602)
	})

	it('дробное место — вниз до целого', () => {
		const { widths, overflow } = layoutColumns(600.8, 'auto', [flexible(), flexible()])

		expect(widths).toEqual([300, 300])
		expect(overflow).toBe(false)
	})

	it('общий уровень: колонка у maxWidth стоит, остальные растут вровень', () => {
		const { widths } = layoutColumns(1000, 'auto', [
			flexible(undefined, 200),
			flexible(),
			flexible(),
		])

		expect(widths).toEqual([200, 400, 400])
	})

	it('колонка с границами 120–360 в широком месте — у своей границы, а не шире', () => {
		const { widths, overflow } = layoutColumns(480, 'auto', [flexible(120, 360)])

		expect(widths).toEqual([360])
		// Все гибкие упёрлись в maxWidth — таблица уже места
		expect(overflow).toBe(false)
	})

	it('гибкие не уже ширины по умолчанию: места мало — шире места', () => {
		const { widths, overflow } = layoutColumns(300, 'auto', [
			flexible(),
			flexible(),
			flexible(),
		])

		expect(widths).toEqual([160, 160, 160])
		expect(overflow).toBe(true)
	})

	it('minWidth выше ширины по умолчанию — колонка не уже его', () => {
		const { widths } = layoutColumns(500, 'auto', [flexible(300), flexible()])

		expect(widths).toEqual([300, 200])
	})

	it('minWidth больше maxWidth — побеждает minWidth', () => {
		const { widths } = layoutColumns(1000, 'auto', [flexible(300, 200), flexible()])

		expect(widths).toEqual([300, 700])
	})

	it('гибких нет — шире места по своим ширинам', () => {
		expect(layoutColumns(300, 'auto', [column(120), column(150)])).toEqual({
			widths: [undefined, undefined],
			overflow: false,
		})
		expect(layoutColumns(260, 'auto', [column(120), column(150)]).overflow).toBe(true)
	})

	it('своя ширина — в своих границах', () => {
		const { widths } = layoutColumns(600, 'auto', [column(500, undefined, 200), flexible()])

		expect(widths).toEqual([undefined, 400])
	})

	it('дробная своя ширина — гибким целые px, и сумма не шире места', () => {
		const { widths, overflow } = layoutColumns(300, 'auto', [column(100.5), flexible()])

		expect(widths).toEqual([undefined, 199])
		expect(overflow).toBe(false)
	})

	it('колонок нет — и места хватает', () => {
		expect(layoutColumns(300, 'auto', [])).toEqual({ widths: [], overflow: false })
	})
})

describe('раскладка: contain', () => {
	it('ровно заполняют место — и шире ширины по умолчанию, и уже её', () => {
		expect(layoutColumns(1000, 'contain', [flexible(), flexible()]).widths).toEqual([500, 500])
		expect(
			layoutColumns(250, 'contain', [flexible(100), flexible(100), flexible()]).widths,
		).toEqual([100, 100, 50])
	})

	it('сжимаются до minWidth, а без него — до нижнего предела ручки; дальше — шире места', () => {
		const { widths, overflow } = layoutColumns(80, 'contain', [flexible(), flexible()])

		expect(widths).toEqual([48, 48])
		expect(overflow).toBe(true)

		expect(layoutColumns(150, 'contain', [flexible(100), flexible(100)])).toEqual({
			widths: [100, 100],
			overflow: true,
		})
	})

	it('предел ручки не переходит maxWidth колонки', () => {
		expect(layoutColumns(10, 'contain', [flexible(undefined, 30)]).widths).toEqual([30])
	})

	it('растут до maxWidth; упёрлись все — уже места', () => {
		const { widths, overflow } = layoutColumns(1000, 'contain', [
			flexible(undefined, 200),
			flexible(undefined, 300),
		])

		expect(widths).toEqual([200, 300])
		expect(overflow).toBe(false)
	})

	it('место неизвестно — ширин нет', () => {
		expect(layoutColumns(undefined, 'contain', [flexible()]).widths).toEqual([undefined])
	})
})

/* ---------------------------------------------------------------------- */
/* Расширение колонок                                                     */
/* ---------------------------------------------------------------------- */

const NAME: TTableColumnSource = { field: 'name', text: 'Имя', minWidth: 120, maxWidth: 360 }
const CITY: TTableColumnSource = { field: 'city', text: 'Город' }
const AGE: TTableColumnSource = { field: 'age', text: 'Возраст', width: 120 }

/** Таблица с движком строк и колонками. */
function tableWith(
	sources: readonly TTableColumnSource[] = [NAME, CITY, AGE],
	columnFit: TTableColumnFit = 'auto',
): { owner: TTable; engine: TTableCollection } {
	const owner = new TTable({ columnFit })
	const engine = createEngineTable({ owner })

	engine.extensions.columns.columns = sources

	return { owner, engine }
}

/** Колонка по полю; нет такой — тест падает здесь. */
function columnOf(engine: TTableCollection, field: string): ITableColumn {
	const found = engine.extensions.columns.columns.find((each) => each.field === field)

	if (!found) throw new Error(`колонки ${field} нет`)

	return found
}

/** Итоги ширин показанных колонок. */
const widthsOf = (engine: TTableCollection) =>
	engine.extensions.columns.shownColumns.map((each) => each.width)

describe('расширение: раскладка', () => {
	it('до места гибкие без ширины, признака у таблицы нет', () => {
		const { owner, engine } = tableWith()

		expect(widthsOf(engine)).toEqual([undefined, undefined, 120])
		expect(owner.dataset.has('overflow')).toBe(false)
	})

	it('место пришло — гибким ширины раскладки, таблице data-overflow', () => {
		const { owner, engine } = tableWith()

		engine.extensions.columns.notifySpace(720)

		// Остаток от возраста — гибким вровень
		expect(widthsOf(engine)).toEqual([300, 300, 120])

		engine.extensions.columns.notifySpace(1000)

		// Имя упёрлось в свою границу, город берёт остальное
		expect(widthsOf(engine)).toEqual([360, 520, 120])
		expect(columnOf(engine, 'name').layoutWidth).toBe(360)
		expect(columnOf(engine, 'age').layoutWidth).toBeUndefined()
		expect(owner.dataset.get('overflow')).toBe('false')
	})

	it('data-overflow — в трёх состояниях: нет места, колонки в месте, шире места', () => {
		const { owner, engine } = tableWith()
		const { columns } = engine.extensions

		expect(owner.dataset.get('overflow')).toBeUndefined()

		columns.notifySpace(720)

		expect(owner.dataset.get('overflow')).toBe('false')

		columns.notifySpace(300)

		expect(owner.dataset.get('overflow')).toBe('true')
		expect(widthsOf(engine)).toEqual([160, 160, 120])

		columns.notifySpace(0)

		expect(owner.dataset.has('overflow')).toBe(false)
		expect(widthsOf(engine)).toEqual([undefined, undefined, 120])
	})

	it('дробное место — вниз до целого; то же место — без пересчёта', () => {
		const { engine } = tableWith([CITY])
		const city = columnOf(engine, 'city')
		const width = vi.fn()

		city.events.on('change:width', width)
		engine.extensions.columns.notifySpace(400.7)
		engine.extensions.columns.notifySpace(400.2)

		expect(city.width).toBe(400)
		expect(width.mock.calls).toEqual([[400]])
	})

	it('своя запись пересчёта не будит: на смену места — одно change:width у колонки', () => {
		const { engine } = tableWith()
		const city = columnOf(engine, 'city')
		const name = columnOf(engine, 'name')
		const cityWidth = vi.fn()
		const nameWidth = vi.fn()

		city.events.on('change:width', cityWidth)
		name.events.on('change:width', nameWidth)

		engine.extensions.columns.notifySpace(1000)

		expect(cityWidth.mock.calls).toEqual([[520]])
		expect(nameWidth.mock.calls).toEqual([[360]])
	})

	describe('пересчёт', () => {
		it('columnFit таблицы', () => {
			const { owner, engine } = tableWith()

			engine.extensions.columns.notifySpace(400)
			owner.columnFit = 'none'

			expect(widthsOf(engine)).toEqual([160, 160, 120])
			expect(owner.dataset.get('overflow')).toBe('true')

			owner.columnFit = 'contain'

			// Сжались ниже ширины по умолчанию ровно в место
			expect(widthsOf(engine)).toEqual([140, 140, 120])
			expect(owner.dataset.get('overflow')).toBe('false')
		})

		it('своя ширина показанной колонки: задали — остальные делят остаток, сняли — снова гибкая', () => {
			const { engine } = tableWith([NAME, CITY])
			const city = columnOf(engine, 'city')

			engine.extensions.columns.notifySpace(600)

			expect(widthsOf(engine)).toEqual([300, 300])

			city.width = 400

			expect(widthsOf(engine)).toEqual([200, 400])

			city.width = undefined

			expect(widthsOf(engine)).toEqual([300, 300])
		})

		it('границы показанной колонки', () => {
			const { engine } = tableWith([NAME, CITY])
			const name = columnOf(engine, 'name')

			engine.extensions.columns.notifySpace(800)

			expect(widthsOf(engine)).toEqual([360, 440])

			name.maxWidth = 200

			expect(widthsOf(engine)).toEqual([200, 600])

			name.maxWidth = undefined
			name.minWidth = 500

			expect(widthsOf(engine)).toEqual([500, 300])
		})

		it('показанные колонки: скрытая в раскладке не стоит и ширины раскладки не держит', () => {
			const { owner, engine } = tableWith([NAME, CITY])
			const name = columnOf(engine, 'name')

			engine.extensions.columns.notifySpace(400)

			expect(widthsOf(engine)).toEqual([200, 200])

			name.hide()

			expect(widthsOf(engine)).toEqual([400])
			expect(name.layoutWidth).toBeUndefined()
			expect(name.width).toBeUndefined()

			name.show()

			expect(widthsOf(engine)).toEqual([200, 200])
			expect(owner.dataset.get('overflow')).toBe('false')
		})

		it('состав: колонку добавили и удалили', () => {
			const { engine } = tableWith([CITY])
			const { columns } = engine.extensions

			columns.notifySpace(600)
			columns.columns = [CITY, { field: 'id', text: '№' }]

			expect(widthsOf(engine)).toEqual([300, 300])

			columns.columns = [CITY]

			expect(widthsOf(engine)).toEqual([600])
		})

		it('запись состава — один пересчёт в её конце', () => {
			const { engine } = tableWith([NAME, CITY])
			const city = columnOf(engine, 'city')
			const width = vi.fn()

			engine.extensions.columns.notifySpace(800)
			city.events.on('change:width', width)

			// Запись сменила и свою ширину имени, и его границу
			engine.extensions.columns.columns = [{ ...NAME, width: 300, minWidth: 100 }, CITY]

			expect(widthsOf(engine)).toEqual([300, 500])
			expect(width.mock.calls).toEqual([[500]])
		})

		it('раскладка — раньше события показанных колонок', () => {
			const { engine } = tableWith([NAME, CITY])
			const seen: Array<Array<number | undefined>> = []

			engine.extensions.columns.notifySpace(400)
			engine.extensions.columns.events.on('change:shownColumns', () =>
				seen.push(widthsOf(engine)),
			)
			columnOf(engine, 'name').hide()

			expect(seen).toEqual([[400]])
		})
	})

	describe('таблица', () => {
		it('движок без таблицы — раскладки нет, и место ничего не меняет', () => {
			const engine = createEngineTable()

			engine.extensions.columns.columns = [NAME, CITY]
			engine.extensions.columns.notifySpace(600)

			expect(widthsOf(engine)).toEqual([undefined, undefined])
		})

		it('таблица пришла позже — раскладка по её месту и режиму; ушла — раскладки нет', () => {
			const engine = createEngineTable()
			const owner = new TTable({ columnFit: 'none' })

			engine.extensions.columns.columns = [NAME, CITY]
			engine.extensions.columns.notifySpace(600)
			engine.options.set({ owner })

			expect(widthsOf(engine)).toEqual([160, 160])
			expect(owner.dataset.get('overflow')).toBe('false')

			engine.options.set({ owner: undefined })

			expect(widthsOf(engine)).toEqual([undefined, undefined])
			expect(owner.dataset.has('overflow')).toBe(false)
		})

		it('движок перешёл к другой таблице — признак уходит с прежней', () => {
			const { owner, engine } = tableWith([CITY])
			const next = new TTable({ columnFit: 'none' })

			engine.extensions.columns.notifySpace(100)

			expect(owner.dataset.get('overflow')).toBe('true')

			engine.options.set({ owner: next })

			expect(owner.dataset.has('overflow')).toBe(false)
			expect(next.dataset.get('overflow')).toBe('true')
			expect(widthsOf(engine)).toEqual([160])
		})

		it('columnFit по умолчанию — auto; в пропсах таблицы — свой', () => {
			expect(new TTable().columnFit).toBe('auto')
			expect(new TTable({ columnFit: 'contain' }).getProps()).toMatchObject({
				columnFit: 'contain',
			})
		})

		it('change:columnFit — только на смену', () => {
			const owner = new TTable()
			const changed = vi.fn()

			owner.events.on('change:columnFit', changed)

			owner.columnFit = 'auto'
			owner.columnFit = 'none'
			owner.columnFit = 'none'

			expect(changed.mock.calls).toEqual([['none']])
		})

		it('режим теме не уходит: в наборе таблицы его нет', () => {
			const owner = new TTable({ columnFit: 'contain' })

			expect(Object.keys(owner.dataset.toObject())).not.toContain('data-column-fit')
			expect(owner.classes.valueOf().join(' ')).not.toContain('contain')
		})
	})
})
