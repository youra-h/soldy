import type {
	IExtension,
	IExtensionItems,
	IItemExtension,
	TBaseItemEventsExtension,
} from '../../../../../base/collection'
import type { TAriaAttributes } from '../../../../../../common'
import type { ITableColumn } from '../../../column/types'
import type { ITableRow } from '../../../row/types'

/** Строка сетки: строка таблицы или шапка (`head`). */
export type TTableGridRow = ITableRow | 'head'

/** Колонка сетки: колонка таблицы или колонка выбора (`select`). */
export type TTableGridColumn = ITableColumn | 'select'

/** Ячейка сетки — пересечение её строки и колонки. */
export type TTableGridCell = {
	readonly row: TTableGridRow
	readonly column: TTableGridColumn
}

/** Край, к которому идёт фокус: `start` — первая ячейка, `end` — последняя. */
export type TTableGridEdge = 'start' | 'end'

/** Где искать край: в строке ячейки под фокусом или во всей сетке. */
export type TTableGridEdgeScope = 'row' | 'grid'

export type TTableGridEvents = {
	/** Режим сетки включили или выключили */
	'change:grid': (value: boolean) => void
	/**
	 * Фокус сетки перешёл на другую ячейку. `undefined` — ячеек нет: у таблицы
	 * нет ни колонок, ни колонки выбора
	 */
	'change:focusedCell': (value: TTableGridCell | undefined) => void
	/** Сменился набор ячеек сетки: сетку включили, выключили или выключили таблицу */
	'change:cellAria': (value: TAriaAttributes) => void
}

export type TTableGridItemEvents = TBaseItemEventsExtension & {
	/** Набор ячеек строки сменился — перечитай `cellAria` */
	'change:cellAria': () => void
}

/**
 * Item-адаптер сетки — что ячейки строки получают от сетки.
 *
 * `TEvents` параметризован, чтобы наследник мог добавить своё событие (см.
 * `IItemExtension`).
 */
export interface ITableGridItemExtension<
	TRow extends ITableRow = ITableRow,
	TEvents extends TTableGridItemEvents = TTableGridItemEvents,
> extends IItemExtension<TRow, TEvents> {
	/**
	 * Набор каждой ячейки строки, и ячейки выбора тоже: в сетке ячейка
	 * принимает фокус (`tabindex="-1"`), вне сетки набор пуст
	 */
	readonly cellAria: TAriaAttributes
}

/**
 * Контракт расширения сетки — режим APG Data Grid над коллекцией строк.
 */
export interface ITableGridExtension<
	TRow extends ITableRow = ITableRow,
	// `any` в констрейнте намеренно: карта событий инвариантна, и требовать
	// здесь точный набор значило бы запретить наследнику её расширить
	TItemExt extends ITableGridItemExtension<TRow, any> = ITableGridItemExtension<TRow>,
>
	extends IExtension<TRow, TTableGridEvents>, IExtensionItems<TRow, TItemExt> {
	/** Режим сетки: таблица — `grid`, ячейки ходят стрелками, строку выбирают нажатием */
	grid: boolean
	/**
	 * Ячейка под фокусом сетки — даже пока DOM-фокус вне таблицы: Tab в сетку
	 * возвращает его сюда. `undefined` — ячеек нет
	 */
	readonly focusedCell: TTableGridCell | undefined
	/**
	 * Набор ячеек сетки — у ячеек шапки без своего экземпляра (ячейка колонки
	 * выбора). Ячейки строк берут его у item-адаптера, заголовки колонок — в
	 * своём `aria`
	 */
	readonly cellAria: TAriaAttributes
	/** Строки сетки по порядку: шапка и показанные строки */
	readonly gridRows: ReadonlyArray<TTableGridRow>
	/** Колонки сетки по порядку: колонка выбора, пока выбор включён, и показанные колонки */
	readonly gridColumns: ReadonlyArray<TTableGridColumn>
	/** Поставить фокус сетки на ячейку. Вне сетки и на ячейку не из неё — ничего */
	focusCell(row: TTableGridRow, column: TTableGridColumn): void
	/**
	 * Сдвинуть фокус на `rows` строк и `columns` колонок — к концу сетки
	 * положительным числом. За краем сетки фокус встаёт на край, по кругу не
	 * ходит
	 */
	moveFocus(rows: number, columns: number): void
	/** Фокус — на первую или последнюю ячейку строки или всей сетки */
	moveFocusToEdge(edge: TTableGridEdge, scope: TTableGridEdgeScope): void
	/**
	 * Выбор строки пользователем — нажатием или пробелом, как строку ListBox:
	 * переключить. Вне сетки, без выбора строк и у выключенной строки —
	 * ничего, `false`
	 */
	chooseRow(row: TRow): boolean
}
