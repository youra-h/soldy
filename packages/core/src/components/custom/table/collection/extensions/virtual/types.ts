import type { IExtension } from '../../../../../base/collection'
import type { TAriaAttributes } from '../../../../../../common'
import type { ITableRow } from '../../../row/types'

/** Строка тела: её рисует таблица компонентом строки. Ключ — `uid` строки. */
export type TTableBodyRowEntry<TRow extends ITableRow = ITableRow> = {
	readonly kind: 'row'
	readonly key: number
	readonly row: TRow
}

/**
 * Распорка тела — пропущенные окном строки одной полосой высотой в них.
 *
 * Ключ — от строки, перед которой она стоит: её `uid` с минусом, у хвостовой
 * — `0`. С ключами строк (их `uid`, от единицы) он не совпадает. Ключ по
 * счёту распорок не годится: он перешёл бы через строку, закреплённую вне
 * окна, и фреймворк переставил бы её узел вместе с фокусом. Высота —
 * переменной `--s-table-filler-height` в `style`.
 */
export type TTableBodyFillerEntry = {
	readonly kind: 'filler'
	readonly key: number
	readonly style: Readonly<Record<string, string>>
}

/** Что таблица рисует в теле по порядку: строки окна и распорки между ними. */
export type TTableBodyEntry<TRow extends ITableRow = ITableRow> =
	| TTableBodyRowEntry<TRow>
	| TTableBodyFillerEntry

/**
 * Замер окна: видимая полоса тела в пикселях от верха первой строки (`top`,
 * `bottom` — могут выходить за тело) и шаг строк (`step`) — расстояние между
 * верхами соседних строк.
 */
export type TTableViewport = {
	readonly top: number
	readonly bottom: number
	readonly step: number
}

export type TTableVirtualEvents = {
	/** Режим окна включили или выключили */
	'change:virtual': (value: boolean) => void
	/** Сменилось, что тело рисует: строки окна или распорки */
	'change:bodyRows': (value: ReadonlyArray<TTableBodyEntry>) => void
	/** Набор строки шапки сменился: режим окна включили или выключили */
	'change:headRowAria': (value: TAriaAttributes) => void
}

/**
 * Контракт расширения окна — тело таблицы рисует только видимые строки.
 */
export interface ITableVirtualExtension<TRow extends ITableRow = ITableRow> extends IExtension<
	TRow,
	TTableVirtualEvents
> {
	/** Режим окна: тело рисует видимые строки с запасом, остальные — распорками */
	virtual: boolean
	/**
	 * Что рисует тело по порядку. Без режима — все показанные строки. В режиме
	 * — строки окна, строки с фокусом на своих местах и распорки между ними
	 */
	readonly bodyRows: ReadonlyArray<TTableBodyEntry<TRow>>
	/** Набор строки шапки: в режиме окна — её номер среди строк таблицы, без режима пуст */
	readonly headRowAria: TAriaAttributes
	/**
	 * Замер от плагина окна. Нулевой шаг — не замер (таблица скрыта или строк в
	 * документе нет): окно остаётся прежним
	 */
	notifyViewport(viewport: TTableViewport): void
	/**
	 * Строка, в которой DOM-фокус, от плагина окна; `undefined` — фокус ушёл из
	 * тела. Её окно держит на месте, когда она уходит из видимой полосы
	 */
	notifyFocus(row: TRow | undefined): void
}
