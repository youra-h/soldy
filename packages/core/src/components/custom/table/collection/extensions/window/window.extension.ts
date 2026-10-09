import { TBaseExtension, batchOf, drawOf } from '../../../../../base/collection'
import type { IExtensionContext } from '../../../../../base/collection'
import type { TAriaAttributes } from '../../../../../../common'
import type { ITableRow } from '../../../row/types'
import type { ITable } from '../../../types'
import { gridOf } from '../guards'
import type { TTableEngineOptions } from '../table'
import type { ITableWindowExtension, TTableWindowEvents } from './types'

/** Набор строки шапки в окне: она первая среди строк таблицы. */
const HEAD_ROW_ARIA: TAriaAttributes = { 'aria-rowindex': '1' }

/** Причина закрепления строки в окне — в ней ячейка под фокусом сетки. */
const GRID_FOCUS = 'grid'

/**
 * Окно таблицы — что таблица делает, пока её тело рисует окно.
 *
 * Что рисовать, решает рисование коллекции (`draw`): окно ему ставит обёртка
 * `Virtual`, и тело рисует видимые строки с запасом, а на месте остальных —
 * распорки. Своё у таблицы — то, что знает только таблица.
 *
 * **Доступность.** Строк в документе меньше, чем в таблице, поэтому в окне
 * таблица несёт число строк (`aria-rowcount`: показанные и шапка), шапка —
 * свой номер (`headRowAria`), а каждая нарисованная строка — свой
 * (`aria-rowindex`, от двух: первая — шапка), как велит APG для неполной
 * таблицы. Строки, ушедшие из окна, номер теряют. Распорки скрыты от
 * скринридера разметкой. Таблице для темы — `data-virtual`: в окне высота
 * строк одна на все, и тема держит текст ячейки в одну строку.
 *
 * **Строка ячейки сетки остаётся на месте.** Ячейку под фокусом сетки
 * (`focusedCell`) окно рисует на своём месте, между распорками, —
 * закреплением в рисовании: Ctrl+End и PageDown сетки ведут фокус в строку,
 * которой ещё не было в документе, и окно дорисовывает её сразу.
 *
 * Таблица — опция движка (`owner`): приходит и уходит после сборки, и
 * расширение её наблюдает. Соседей — состав, сетку и рисование — узнаёт по
 * контракту и ставится после них.
 */
export class TTableWindowExtension<
	TOwner extends ITable = ITable,
	TRow extends ITableRow = ITableRow,
>
	extends TBaseExtension<TRow, TTableWindowEvents, TTableEngineOptions<TOwner>>
	implements ITableWindowExtension<TRow>
{
	readonly name = 'window' as const

	/** Строки, которым окно написало номер: ушедшим из окна его снимают. */
	private _numbered = new Set<TRow>()

	override install(ctx: IExtensionContext<TRow, TTableEngineOptions<TOwner>>): void {
		super.install(ctx)

		const draw = drawOf(ctx)

		// Окно сменило, что рисует, — номера нарисованным строкам
		draw?.events.on('change:drawn', () => this._number())

		// Окно поставили или сняли — номера, число строк и набор шапки
		draw?.events.on('change:virtual', () => {
			this._number()
			this._applyOwner()
			this.events.emit('change:headRowAria', this.headRowAria)
		})

		// Показанные строки сменились — их число
		batchOf(ctx)?.events.on('change:shown', () => this._applyOwner())

		// Фокус сетки ушёл в другую строку — она должна быть в документе
		gridOf(ctx)?.events.on('change:focusedCell', () => this._pinGridFocus())

		ctx.options.watch('owner', () => this._applyOwner())

		this._number()
		this._pinGridFocus()
	}

	get headRowAria(): TAriaAttributes {
		return this._virtual ? { ...HEAD_ROW_ARIA } : {}
	}

	/* ------------------------------------------------------------------ */
	/* Внутреннее                                                         */
	/* ------------------------------------------------------------------ */

	private get _virtual(): boolean {
		return drawOf(this._ctx)?.virtual ?? false
	}

	/**
	 * Закрепить в окне строку ячейки под фокусом сетки — среди показанных.
	 * Фокус в шапке или нет его — снять.
	 */
	private _pinGridFocus(): void {
		const focused = gridOf(this._ctx)?.focusedCell?.row
		const row =
			focused === undefined || focused === 'head'
				? undefined
				: batchOf(this._ctx)?.shown.find((candidate) => candidate === focused)

		drawOf(this._ctx)?.pin(GRID_FOCUS, row)
	}

	/**
	 * Номер строки среди строк таблицы — нарисованным строкам окна, с двух:
	 * первая — шапка. Ушедшие из окна и все без окна номер теряют.
	 */
	private _number(): void {
		const draw = drawOf(this._ctx)
		const places = new Map<TRow, number>()

		if (draw?.virtual) {
			for (const entry of draw.drawn) {
				if (entry.kind === 'item') places.set(entry.item, entry.place)
			}
		}

		for (const [row, place] of places) row.aria.add('aria-rowindex', String(place + 2))

		for (const row of this._numbered) {
			if (!places.has(row)) row.aria.add('aria-rowindex', null)
		}

		this._numbered = new Set(places.keys())
	}

	/**
	 * Таблице в окне — число строк (показанные и шапка; строк нет — и числа
	 * нет) и `data-virtual` для темы. Без окна — снять.
	 */
	private _applyOwner(): void {
		const owner = this._ctx?.options.get('owner')

		if (!owner) return

		const virtual = this._virtual
		const total = batchOf(this._ctx)?.shown.length ?? 0

		owner.dataset.add('virtual', virtual)
		owner.aria.add('aria-rowcount', virtual && total > 0 ? String(total + 1) : null)
	}
}
