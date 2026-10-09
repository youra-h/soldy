import { TBaseExtension } from '../../../../../base/collection'
import type { IExtensionContext } from '../../../../../base/collection'
import type { TAriaAttributes } from '../../../../../../common'
import type { ITableRow } from '../../../row/types'
import type { ITable } from '../../../types'
import { batchOf, gridOf } from '../guards'
import type { TTableEngineOptions } from '../table'
import type {
	ITableVirtualExtension,
	TTableBodyEntry,
	TTableViewport,
	TTableVirtualEvents,
} from './types'

/** Сколько строк окно рисует до первого замера: серверная разметка и первый кадр. */
const INITIAL_ROWS = 50

/** Запас строк за каждым краем видимой полосы: прокрутка не успевает до пустоты. */
const OVERSCAN = 10

/** Набор строки шапки в режиме окна: она первая среди строк таблицы. */
const HEAD_ROW_ARIA: TAriaAttributes = { 'aria-rowindex': '1' }

/** Ключ хвостовой распорки: за ней строк нет, а `uid` строк — от единицы. */
const TAIL_FILLER = 0

/**
 * Окно — режим таблицы, в котором тело рисует только видимые строки.
 *
 * Тысячи строк в документе — это тысячи компонентов и сотни тысяч узлов:
 * память, первый рендер и раскладка браузера после каждой сортировки. В
 * режиме окна (`virtual`) тело рисует строки видимой полосы с запасом
 * (`OVERSCAN`), а пропущенные заменяет распорками высотой в них — полоса
 * прокрутки и место строк остаются как у полной таблицы.
 *
 * **Окно читает показанные строки, а не подменяет их.** `batch.shown` — все
 * показанные строки, и выбор, «выбрать все», счёт выбора, сортировка и
 * строки сетки видят их все. Что рисовать, расширение отдаёт отдельным
 * выходом (`bodyRows`): строки окна и распорки по порядку. Без режима это все
 * показанные строки, и разметка одна на оба режима.
 *
 * **Высота строк — одна на все.** Шаг строк и видимую полосу мерит плагин
 * окна на корне таблицы и сообщает их (`notifyViewport`); где лежит строка,
 * расширение считает от шага. Строка выше шага сдвинет следующие — тема в
 * режиме окна держит текст ячейки в одну строку, а плагин предупреждает о
 * высокой строке. До первого замера окно — первые строки (`INITIAL_ROWS`):
 * так рисуют сервер и первый кадр.
 *
 * **Строка с фокусом остаётся на месте.** Ячейка под фокусом сетки
 * (`focusedCell`) и строка с DOM-фокусом (`notifyFocus`, от плагина) вне
 * окна рисуются на своих местах, между распорками: прокрутка колесом не
 * уносит узел с фокусом, а Ctrl+End и PageDown сетки ведут фокус в строку,
 * которой ещё не было в документе, — окно дорисует её сразу.
 *
 * **Доступность.** Строк в документе меньше, чем в таблице, поэтому в режиме
 * окна таблица несёт число строк (`aria-rowcount`: показанные и шапка), шапка
 * — свой номер (`headRowAria`), а каждая нарисованная строка — свой
 * (`aria-rowindex`, от двух: первая — шапка), как велит APG для неполной
 * таблицы. Строки, ушедшие из окна, номер теряют. Распорки скрыты от
 * скринридера разметкой. Таблице для темы — `data-virtual`.
 *
 * Таблица — опция движка (`owner`): приходит и уходит после сборки, и
 * расширение её наблюдает. Соседей — состав и сетку — узнаёт по контракту и
 * ставится после них.
 */
export class TTableVirtualExtension<
	TOwner extends ITable = ITable,
	TRow extends ITableRow = ITableRow,
>
	extends TBaseExtension<TRow, TTableVirtualEvents, TTableEngineOptions<TOwner>>
	implements ITableVirtualExtension<TRow>
{
	readonly name = 'virtual' as const

	private _virtual = false

	private _viewport: TTableViewport | null = null

	/** Строка с DOM-фокусом — от плагина окна. */
	private _focused: TRow | undefined = undefined

	private _bodyRows: ReadonlyArray<TTableBodyEntry<TRow>> = []

	/** Строки, которым окно написало номер: ушедшим из окна его снимают. */
	private _numbered = new Set<TRow>()

	override install(ctx: IExtensionContext<TRow, TTableEngineOptions<TOwner>>): void {
		super.install(ctx)

		// Показанные строки сменились — состав, отбор или сортировка
		batchOf(ctx)?.events.on('change:shown', () => {
			this._applyOwner()
			this._update()
		})

		// Фокус сетки ушёл в другую строку — она должна быть в документе
		gridOf(ctx)?.events.on('change:focusedCell', () => {
			if (this._virtual) this._update()
		})

		ctx.options.watch('owner', () => this._applyOwner())

		this._update()
	}

	get virtual(): boolean {
		return this._virtual
	}

	set virtual(value: boolean) {
		if (this._virtual === value) return

		this._virtual = value
		this._applyOwner()
		this._update()
		this.events.emit('change:virtual', value)
		this.events.emit('change:headRowAria', this.headRowAria)
	}

	get bodyRows(): ReadonlyArray<TTableBodyEntry<TRow>> {
		return this._bodyRows
	}

	get headRowAria(): TAriaAttributes {
		return this._virtual ? { ...HEAD_ROW_ARIA } : {}
	}

	notifyViewport(viewport: TTableViewport): void {
		if (!(viewport.step > 0)) return

		this._viewport = viewport

		if (this._virtual) this._update()
	}

	notifyFocus(row: TRow | undefined): void {
		if (this._focused === row) return

		this._focused = row

		if (this._virtual) this._update()
	}

	/* ------------------------------------------------------------------ */
	/* Внутреннее                                                         */
	/* ------------------------------------------------------------------ */

	private get _shown(): ReadonlyArray<TRow> {
		return batchOf(this._ctx)?.shown ?? []
	}

	/** Тело заново: что рисовать и номера нарисованных строк. Событие — только на смену. */
	private _update(): void {
		const shown = this._shown
		const places = new Map<TRow, number>()
		const next = this._virtual ? this._window(shown, places) : shown.map(rowEntry)

		this._number(places)

		if (sameBody(this._bodyRows, next)) return

		this._bodyRows = next
		this.events.emit('change:bodyRows', next)
	}

	/**
	 * Строки окна по порядку и распорки между ними. До замера — первые строки
	 * без распорок: высоты пропущенного ещё не знает никто.
	 */
	private _window(
		shown: ReadonlyArray<TRow>,
		places: Map<TRow, number>,
	): TTableBodyEntry<TRow>[] {
		const viewport = this._viewport
		const total = shown.length

		if (!viewport) {
			const first = shown.slice(0, INITIAL_ROWS)

			first.forEach((row, place) => places.set(row, place))

			return first.map(rowEntry)
		}

		const { step } = viewport
		const start = clamp(Math.floor(viewport.top / step) - OVERSCAN, total)
		const end = clamp(Math.ceil(viewport.bottom / step) + OVERSCAN, total)
		const drawn = new Set<number>()

		for (let place = start; place < end; place++) drawn.add(place)

		for (const row of this._pinned) {
			const place = shown.findIndex((candidate) => candidate === row)

			if (place !== -1) drawn.add(place)
		}

		const entries: TTableBodyEntry<TRow>[] = []
		let last = -1

		for (const place of [...drawn].sort((a, b) => a - b)) {
			const row = shown[place]

			if (place > last + 1) entries.push(filler(-row.uid, place - last - 1, step))

			entries.push(rowEntry(row))
			places.set(row, place)
			last = place
		}

		if (total > last + 1) entries.push(filler(TAIL_FILLER, total - last - 1, step))

		return entries
	}

	/** Строки, которые окно рисует на своих местах вне видимой полосы. */
	private get _pinned(): ITableRow[] {
		const pinned: ITableRow[] = []
		const row = gridOf(this._ctx)?.focusedCell?.row

		if (row !== undefined && row !== 'head') pinned.push(row)
		if (this._focused) pinned.push(this._focused)

		return pinned
	}

	/**
	 * Номер строки среди строк таблицы — нарисованным строкам окна (`places`:
	 * строка → место среди показанных), с двух: первая — шапка. Ушедшие из
	 * окна и все без режима номер теряют.
	 */
	private _number(places: ReadonlyMap<TRow, number>): void {
		for (const [row, place] of places) row.aria.add('aria-rowindex', String(place + 2))

		for (const row of this._numbered) {
			if (!places.has(row)) row.aria.add('aria-rowindex', null)
		}

		this._numbered = new Set(places.keys())
	}

	/**
	 * Таблице в режиме окна — число строк (показанные и шапка; строк нет — и
	 * числа нет) и `data-virtual` для темы. Без режима — снять.
	 */
	private _applyOwner(): void {
		const owner = this._ctx?.options.get('owner')

		if (!owner) return

		const total = this._shown.length

		owner.dataset.add('virtual', this._virtual)
		owner.aria.add('aria-rowcount', this._virtual && total > 0 ? String(total + 1) : null)
	}
}

function rowEntry<TRow extends ITableRow>(row: TRow): TTableBodyEntry<TRow> {
	return { kind: 'row', key: row.uid, row }
}

function filler<TRow extends ITableRow>(
	key: number,
	rows: number,
	step: number,
): TTableBodyEntry<TRow> {
	return {
		kind: 'filler',
		key,
		style: { '--s-table-filler-height': `${rows * step}px` },
	}
}

/** Место в отрезке `[0, length]`. */
function clamp(value: number, length: number): number {
	return Math.min(Math.max(value, 0), length)
}

/** То же тело: те же строки и распорки той же высоты тем же порядком. */
function sameBody<TRow extends ITableRow>(
	a: ReadonlyArray<TTableBodyEntry<TRow>>,
	b: ReadonlyArray<TTableBodyEntry<TRow>>,
): boolean {
	return (
		a.length === b.length &&
		a.every((entry, index) => {
			const other = b[index]

			if (entry.kind === 'row') return other.kind === 'row' && other.row === entry.row

			return (
				other.kind === 'filler' &&
				other.key === entry.key &&
				other.style['--s-table-filler-height'] === entry.style['--s-table-filler-height']
			)
		})
	)
}
