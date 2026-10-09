import { describe, it, expect, vi } from 'vitest'
import { TTable, TTableCollectionFacade, createEngineTable } from '@soldy-ui/core'
import type {
	ITableRow,
	TSelectionMode,
	TTableBodyEntry,
	TTableCollection,
	TTableRecord,
} from '@soldy-ui/core'

/**
 * Окно — режим таблицы, в котором тело рисует только видимые строки,
 * расширение `virtual` коллекции строк.
 *
 * Окно читает показанные строки (`batch.shown`), а не подменяет их: выбор,
 * сортировка и сетка видят все строки, а что рисовать, расширение отдаёт
 * отдельным выходом (`bodyRows`). Замер видимой полосы и шага строк приходит
 * от плагина окна (`plugins/__tests__/table-virtual.plugin.spec.ts`), здесь
 * его подают руками.
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

/** Таблица над `count` записями в режиме окна и движок её строк. */
function table(count = 200, options: { mode?: TSelectionMode; grid?: boolean } = {}) {
	const owner = new TTable()
	const facade = new TTableCollectionFacade(
		{
			items: records(count).map((data) => ({ data })),
			trackBy: (row) => idOf(row.data),
			columns: [{ field: 'name', text: 'Имя', sortable: true }],
			mode: options.mode ?? 'none',
			grid: options.grid ?? false,
			virtual: true,
		},
		{ owner },
	)
	const engine: TTableCollection = facade.engine
	const rows = engine.extensions.batch.items

	return { owner, facade, engine, rows, virtual: engine.extensions.virtual }
}

/** Видимая полоса тела от `top` до `bottom` пикселей. */
const viewport = (top: number, bottom: number, step = STEP) => ({ top, bottom, step })

/** Тело коротко: строки — номером записи, распорки — `ключ:высота`. */
function body(entries: ReadonlyArray<TTableBodyEntry>): string[] {
	return entries.map((entry) =>
		entry.kind === 'row'
			? String(idOf(entry.row.data))
			: `${entry.key}:${entry.style['--s-table-filler-height']}`,
	)
}

/** Номера записей подряд: `from`…`to` включительно. */
function ids(from: number, to: number): string[] {
	return Array.from({ length: to - from + 1 }, (_, index) => String(from + index))
}

describe('режим', () => {
	it('без режима — все показанные строки, без распорок и номеров', () => {
		const owner = new TTable()
		const facade = new TTableCollectionFacade(
			{ items: records(3).map((data) => ({ data })), columns: [{ field: 'name' }] },
			{ owner },
		)
		const [first] = facade.engine.extensions.batch.items

		expect(facade.virtual).toBe(false)
		expect(body(facade.bodyRows)).toEqual(['1', '2', '3'])
		expect(facade.headRowAria).toEqual({})
		expect(owner.aria.has('aria-rowcount')).toBe(false)
		expect(owner.dataset.get('virtual')).toBe('false')
		expect(first.aria.has('aria-rowindex')).toBe(false)
	})

	it('до замера окно — первые 50 строк, без распорок', () => {
		const { facade } = table(200)

		expect(body(facade.bodyRows)).toEqual(ids(1, 50))
	})

	it('по замеру — видимые строки с запасом в 10, распорки на месте пропущенных', () => {
		const { facade, rows, virtual } = table(200)

		// Видны строки 101–120 (места 100–119): с запасом — 91–130
		virtual.notifyViewport(viewport(4000, 4800))

		expect(body(facade.bodyRows)).toEqual([
			`${-rows[90].uid}:3600px`,
			...ids(91, 130),
			'0:2800px',
		])
	})

	it('у краёв окно не выходит за строки: в начале нет первой распорки, в конце — хвостовой', () => {
		const { facade, virtual } = table(200)

		virtual.notifyViewport(viewport(0, 400))

		expect(body(facade.bodyRows)).toEqual([...ids(1, 20), '0:7200px'])

		virtual.notifyViewport(viewport(7600, 8400))

		expect(body(facade.bodyRows)[0]).toMatch(/:7200px$/)
		expect(body(facade.bodyRows).slice(1)).toEqual(ids(181, 200))
	})

	it('нулевой шаг — не замер: окно прежнее', () => {
		const { facade, virtual } = table(200)

		virtual.notifyViewport(viewport(4000, 4800))

		const before = facade.bodyRows

		virtual.notifyViewport(viewport(0, 400, 0))

		expect(facade.bodyRows).toBe(before)
	})

	it('change:bodyRows — только на смену', () => {
		const { facade, virtual } = table(200)
		const changed = vi.fn()

		facade.events.on('change:bodyRows', changed)

		virtual.notifyViewport(viewport(4000, 4800))
		// Полоса сдвинулась, но края остались в тех же строках — окно то же
		virtual.notifyViewport(viewport(4005, 4795))

		expect(changed).toHaveBeenCalledTimes(1)
	})

	it('выключили режим — все строки, номера и число строк сняты', () => {
		const { owner, facade, rows, virtual } = table(100)

		virtual.notifyViewport(viewport(0, 400))
		facade.virtual = false

		expect(body(facade.bodyRows)).toEqual(ids(1, 100))
		expect(facade.headRowAria).toEqual({})
		expect(owner.aria.has('aria-rowcount')).toBe(false)
		expect(owner.dataset.get('virtual')).toBe('false')
		expect(rows.some((row) => row.aria.has('aria-rowindex'))).toBe(false)
	})
})

describe('доступность', () => {
	it('таблице — число строк с шапкой, шапке — первый номер, нарисованным строкам — свои', () => {
		const { owner, facade, rows, virtual } = table(200)

		virtual.notifyViewport(viewport(4000, 4800))

		expect(owner.aria.get('aria-rowcount')).toBe('201')
		expect(owner.dataset.get('virtual')).toBe('true')
		expect(facade.headRowAria).toEqual({ 'aria-rowindex': '1' })
		expect(rows[90].aria.get('aria-rowindex')).toBe('92')
		expect(rows[129].aria.get('aria-rowindex')).toBe('131')
		expect(rows[89].aria.has('aria-rowindex')).toBe(false)
	})

	it('строка ушла из окна — номер снят', () => {
		const { rows, virtual } = table(200)

		virtual.notifyViewport(viewport(4000, 4800))
		virtual.notifyViewport(viewport(0, 400))

		expect(rows[100].aria.has('aria-rowindex')).toBe(false)
		expect(rows[0].aria.get('aria-rowindex')).toBe('2')
	})

	it('строк нет — нет и числа строк', () => {
		const { owner, facade } = table(0)

		expect(owner.aria.has('aria-rowcount')).toBe(false)
		expect(facade.bodyRows).toEqual([])
	})
})

describe('строки с фокусом', () => {
	it('ячейка сетки в строке вне окна — строка на своём месте между распорками', () => {
		const { facade, engine, rows, virtual } = table(200, { grid: true })
		const [name] = engine.extensions.columns.columns

		virtual.notifyViewport(viewport(0, 400))
		engine.extensions.grid.focusCell(rows[150], name)

		expect(body(facade.bodyRows)).toEqual([
			...ids(1, 20),
			`${-rows[150].uid}:5200px`,
			'151',
			'0:1960px',
		])
		expect(rows[150].aria.get('aria-rowindex')).toBe('152')
	})

	it('Ctrl+End сетки — последняя строка в теле до прокрутки', () => {
		const { facade, engine, virtual } = table(200, { grid: true })

		virtual.notifyViewport(viewport(0, 400))
		engine.extensions.grid.moveFocus(1, 0)
		engine.extensions.grid.moveFocusToEdge('end', 'grid')

		expect(body(facade.bodyRows).slice(-2)).toEqual([
			`${-engine.extensions.batch.shown[199].uid}:7160px`,
			'200',
		])
	})

	it('строка с DOM-фокусом остаётся в теле, пока фокус в ней', () => {
		const { facade, rows, virtual } = table(200)

		virtual.notifyViewport(viewport(0, 400))
		virtual.notifyFocus(rows[5])
		virtual.notifyViewport(viewport(4000, 4800))

		expect(body(facade.bodyRows).slice(0, 3)).toEqual([
			`${-rows[5].uid}:200px`,
			'6',
			`${-rows[90].uid}:3360px`,
		])

		virtual.notifyFocus(undefined)

		expect(body(facade.bodyRows)[0]).toBe(`${-rows[90].uid}:3600px`)
	})
})

describe('выбор и сортировка видят все строки', () => {
	it('«выбрать все» выбирает все показанные, а не только нарисованные', () => {
		const { facade, engine, virtual } = table(200, { mode: 'multiple' })

		virtual.notifyViewport(viewport(0, 400))
		facade.selectShown()

		expect(engine.extensions.selection.selected).toHaveLength(200)
		expect(facade.shownSelection).toBe('all')
	})

	it('сортировка — окно по отсортированным строкам, номера по новому порядку', () => {
		const { facade, virtual } = table(200)
		const rowIds = (entries: ReadonlyArray<TTableBodyEntry>): unknown[] =>
			entries.flatMap((entry) => (entry.kind === 'row' ? [idOf(entry.row.data)] : []))

		virtual.notifyViewport(viewport(0, 400))
		facade.sort = [{ field: 'name', direction: 'desc' }]

		const [top] = rowIds(facade.bodyRows)
		const first = facade.bodyRows.find(
			(entry): entry is { kind: 'row'; key: number; row: ITableRow } => entry.kind === 'row',
		)

		// По убыванию: текст сравнивается с числами внутри, «Строка 200» — первая
		expect(top).toBe(200)
		expect(first?.row.aria.get('aria-rowindex')).toBe('2')
	})
})

it('движок снаружи несёт режим окна с собой', () => {
	const engine = createEngineTable({ items: records(3).map((data) => ({ data })) })

	engine.extensions.virtual.virtual = true

	const facade = new TTableCollectionFacade({}, { engine })

	expect(facade.virtual).toBe(true)
})
