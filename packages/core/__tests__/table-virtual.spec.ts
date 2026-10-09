import { describe, it, expect, vi } from 'vitest'
import { TTable, TTableCollectionFacade, TWindowStrategy, createEngineTable } from '@soldy-ui/core'
import type {
	ITableRow,
	TDrawnEntry,
	TSelectionMode,
	TTableCollection,
	TTableRecord,
} from '@soldy-ui/core'

/**
 * Окно таблицы: тело рисует только видимые строки. Что рисовать, решает
 * рисование коллекции строк (`draw`) со стратегией окна — её ставит обёртка
 * `Virtual`, здесь её ставят руками. Своё у таблицы — расширение `window`:
 * число и номера строк по APG, набор шапки и строка ячейки сетки в окне.
 *
 * Окно читает показанные строки (`batch.shown`), а не подменяет их: выбор,
 * сортировка и сетка видят все строки, а что рисовать, отдаётся отдельным
 * выходом (`drawn`). Замер видимой полосы и шага строк приходит от плагина
 * окна (`plugins/__tests__/virtual.plugin.spec.ts`), здесь его подают руками.
 */

const STEP = 40

/** Записи с ключом `id` от единицы. */
function records(count: number): TTableRecord[] {
	return Array.from({ length: count }, (_, index) => ({
		id: index + 1,
		name: `Строка ${index + 1}`,
	}))
}

/** Ключ записи — её `id`. */
function idOf(data: TTableRecord | undefined): unknown {
	return data && 'id' in data ? data.id : undefined
}

/** Таблица над `count` записями в окне и движок её строк. */
function table(count = 200, options: { mode?: TSelectionMode; grid?: boolean } = {}) {
	const owner = new TTable()
	const facade = new TTableCollectionFacade(
		{
			items: records(count).map((data) => ({ data })),
			trackBy: (row) => idOf(row.data),
			columns: [{ field: 'name', text: 'Имя', sortable: true }],
			mode: options.mode ?? 'none',
			grid: options.grid ?? false,
		},
		{ owner },
	)
	const engine: TTableCollection = facade.engine
	const rows = engine.extensions.batch.items
	const draw = engine.extensions.draw

	draw.useStrategy(new TWindowStrategy())

	return { owner, facade, engine, rows, draw }
}

/** Видимая полоса тела от `top` до `bottom` пикселей. */
const viewport = (top: number, bottom: number, step = STEP) => ({ top, bottom, step })

/** Тело коротко: строки — номером записи, распорки — `ключ:высота`. */
function body(entries: ReadonlyArray<TDrawnEntry<ITableRow>>): string[] {
	return entries.map((entry) =>
		entry.kind === 'item'
			? String(idOf(entry.item.data))
			: `${entry.key}:${entry.style['--s-filler-height']}`,
	)
}

/** Номера записей подряд: `from`…`to` включительно. */
function ids(from: number, to: number): string[] {
	return Array.from({ length: to - from + 1 }, (_, index) => String(from + index))
}

describe('окно', () => {
	it('без окна — все показанные строки, без распорок и номеров', () => {
		const owner = new TTable()
		const facade = new TTableCollectionFacade(
			{ items: records(3).map((data) => ({ data })), columns: [{ field: 'name' }] },
			{ owner },
		)
		const [first] = facade.engine.extensions.batch.items

		expect(facade.engine.extensions.draw.virtual).toBe(false)
		expect(body(facade.drawn)).toEqual(['1', '2', '3'])
		expect(facade.headRowAria).toEqual({})
		expect(owner.aria.has('aria-rowcount')).toBe(false)
		expect(owner.dataset.get('virtual')).toBe('false')
		expect(first.aria.has('aria-rowindex')).toBe(false)
	})

	it('до замера окно — первые 50 строк, без распорок', () => {
		const { facade } = table(200)

		expect(body(facade.drawn)).toEqual(ids(1, 50))
	})

	it('по замеру — видимые строки с запасом в 10, распорки на месте пропущенных', () => {
		const { facade, rows, draw } = table(200)

		// Видны строки 101–120 (места 100–119): с запасом — 91–130
		draw.notifyViewport(viewport(4000, 4800))

		expect(body(facade.drawn)).toEqual([`${-rows[90].uid}:3600px`, ...ids(91, 130), '0:2800px'])
	})

	it('у краёв окно не выходит за строки: в начале нет первой распорки, в конце — хвостовой', () => {
		const { facade, draw } = table(200)

		draw.notifyViewport(viewport(0, 400))

		expect(body(facade.drawn)).toEqual([...ids(1, 20), '0:7200px'])

		draw.notifyViewport(viewport(7600, 8400))

		expect(body(facade.drawn)[0]).toMatch(/:7200px$/)
		expect(body(facade.drawn).slice(1)).toEqual(ids(181, 200))
	})

	it('нулевой шаг — не замер: окно прежнее', () => {
		const { facade, draw } = table(200)

		draw.notifyViewport(viewport(4000, 4800))

		const before = facade.drawn

		draw.notifyViewport(viewport(0, 400, 0))

		expect(facade.drawn).toBe(before)
	})

	it('change:drawn — только на смену', () => {
		const { facade, draw } = table(200)
		const changed = vi.fn()

		facade.events.on('change:drawn', changed)

		draw.notifyViewport(viewport(4000, 4800))
		// Полоса сдвинулась, но края остались в тех же строках — окно то же
		draw.notifyViewport(viewport(4005, 4795))

		expect(changed).toHaveBeenCalledTimes(1)
	})

	it('окно сняли — все строки, номера и число строк сняты', () => {
		const { owner, facade, rows, draw } = table(100)

		draw.notifyViewport(viewport(0, 400))
		draw.useStrategy(null)

		expect(body(facade.drawn)).toEqual(ids(1, 100))
		expect(facade.headRowAria).toEqual({})
		expect(owner.aria.has('aria-rowcount')).toBe(false)
		expect(owner.dataset.get('virtual')).toBe('false')
		expect(rows.some((row) => row.aria.has('aria-rowindex'))).toBe(false)
	})
})

describe('доступность', () => {
	it('таблице — число строк с шапкой, шапке — первый номер, нарисованным строкам — свои', () => {
		const { owner, facade, rows, draw } = table(200)

		draw.notifyViewport(viewport(4000, 4800))

		expect(owner.aria.get('aria-rowcount')).toBe('201')
		expect(owner.dataset.get('virtual')).toBe('true')
		expect(facade.headRowAria).toEqual({ 'aria-rowindex': '1' })
		expect(rows[90].aria.get('aria-rowindex')).toBe('92')
		expect(rows[129].aria.get('aria-rowindex')).toBe('131')
		expect(rows[89].aria.has('aria-rowindex')).toBe(false)
	})

	it('номера — и тогда, когда окно рисует все строки', () => {
		const { owner, rows } = table(3)

		expect(owner.aria.get('aria-rowcount')).toBe('4')
		expect(rows.map((row) => row.aria.get('aria-rowindex'))).toEqual(['2', '3', '4'])
	})

	it('строка ушла из окна — номер снят', () => {
		const { rows, draw } = table(200)

		draw.notifyViewport(viewport(4000, 4800))
		draw.notifyViewport(viewport(0, 400))

		expect(rows[100].aria.has('aria-rowindex')).toBe(false)
		expect(rows[0].aria.get('aria-rowindex')).toBe('2')
	})

	it('строк нет — нет и числа строк', () => {
		const { owner, facade } = table(0)

		expect(owner.aria.has('aria-rowcount')).toBe(false)
		expect(facade.drawn).toEqual([])
	})
})

describe('строки с фокусом', () => {
	it('ячейка сетки в строке вне окна — строка на своём месте между распорками', () => {
		const { facade, engine, rows, draw } = table(200, { grid: true })
		const [name] = engine.extensions.columns.columns

		draw.notifyViewport(viewport(0, 400))
		engine.extensions.grid.focusCell(rows[150], name)

		expect(body(facade.drawn)).toEqual([
			...ids(1, 20),
			`${-rows[150].uid}:5200px`,
			'151',
			'0:1960px',
		])
		expect(rows[150].aria.get('aria-rowindex')).toBe('152')
	})

	it('Ctrl+End сетки — последняя строка в теле до прокрутки', () => {
		const { facade, engine, draw } = table(200, { grid: true })

		draw.notifyViewport(viewport(0, 400))
		engine.extensions.grid.moveFocus(1, 0)
		engine.extensions.grid.moveFocusToEdge('end', 'grid')

		expect(body(facade.drawn).slice(-2)).toEqual([
			`${-engine.extensions.batch.shown[199].uid}:7160px`,
			'200',
		])
	})

	it('строка с DOM-фокусом остаётся в теле, пока фокус в ней', () => {
		const { facade, rows, draw } = table(200)

		draw.notifyViewport(viewport(0, 400))
		draw.pin('focus', rows[5])
		draw.notifyViewport(viewport(4000, 4800))

		expect(body(facade.drawn).slice(0, 3)).toEqual([
			`${-rows[5].uid}:200px`,
			'6',
			`${-rows[90].uid}:3360px`,
		])

		draw.pin('focus', undefined)

		expect(body(facade.drawn)[0]).toBe(`${-rows[90].uid}:3600px`)
	})
})

describe('выбор и сортировка видят все строки', () => {
	it('«выбрать все» выбирает все показанные, а не только нарисованные', () => {
		const { facade, engine, draw } = table(200, { mode: 'multiple' })

		draw.notifyViewport(viewport(0, 400))
		facade.selectShown()

		expect(engine.extensions.selection.selected).toHaveLength(200)
		expect(facade.shownSelection).toBe('all')
	})

	it('сортировка — окно по отсортированным строкам, номера по новому порядку', () => {
		const { facade, draw } = table(200)
		const rowIds = (entries: ReadonlyArray<TDrawnEntry<ITableRow>>): unknown[] =>
			entries.flatMap((entry) => (entry.kind === 'item' ? [idOf(entry.item.data)] : []))

		draw.notifyViewport(viewport(0, 400))
		facade.sort = [{ field: 'name', direction: 'desc' }]

		const [top] = rowIds(facade.drawn)
		const [first] = facade.drawn

		// По убыванию: текст сравнивается с числами внутри, «Строка 200» — первая
		expect(top).toBe(200)
		expect(first.kind === 'item' ? first.item.aria.get('aria-rowindex') : null).toBe('2')
	})
})

it('движок снаружи несёт окно с собой', () => {
	const engine = createEngineTable({ items: records(80).map((data) => ({ data })) })

	engine.extensions.draw.useStrategy(new TWindowStrategy())

	const facade = new TTableCollectionFacade({}, { engine })

	expect(facade.engine.extensions.draw.virtual).toBe(true)
	expect(facade.drawn).toHaveLength(50)
})
