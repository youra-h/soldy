import type {
	IBatchCollectionProps,
	ICollectionProps,
	ISelectionCollectionItemProps,
	ISelectionCollectionProps,
	TBatchExtension,
	TCollectionEngine,
	TDrawEvents,
	TDrawExtension,
	TFactoryExtension,
	TMemoryExtension,
	TMetaExtension,
	TOrderExtension,
	TPlainExtension,
	TSelectionCollectionFacadeEvents,
	TSelectionExtension,
	TSelectionFacadeProps,
	TSelectionItemFacadeEvents,
	TUniqueExtension,
} from '../../../base/collection'
import type { TTableColumnSource } from '../column/collection/types'
import type { ITableRow, ITableRowProps } from '../row/types'
import type {
	TTableColumnSort,
	TTableColumnsEvents,
	TTableColumnsExtension,
	TTableColumnsItemEvents,
	TTableEngineOptions,
	TTableExtension,
	TTableExtensionEvents,
	TTableGridEvents,
	TTableGridExtension,
	TTableGridItemEvents,
	TTableItemEvents,
	TTableSortEvents,
	TTableSortExtension,
	TTableSortMode,
	TTableWindowEvents,
	TTableWindowExtension,
} from './extensions'

export type TTableCollectionExtensions = {
	factory: TFactoryExtension<ITableRow>
	unique: TUniqueExtension<ITableRow>
	meta: TMetaExtension<ITableRow>
	order: TOrderExtension<ITableRow>
	plain: TPlainExtension<ITableRow>
	batch: TBatchExtension<ITableRow>
	selection: TSelectionExtension<ITableRow>
	/** Колонки: их коллекция, показанные колонки и ячейки строк */
	columns: TTableColumnsExtension
	/** Что строки получают от таблицы, выбор показанных строк и чекбоксы колонки выбора */
	table: TTableExtension
	/** Порядок показанных строк по колонкам */
	sort: TTableSortExtension
	/** Режим сетки: ячейка под фокусом, выбор строки нажатием, наборы сетки */
	grid: TTableGridExtension
	/** Что тело рисует из показанных строк: все или окно с распорками */
	draw: TDrawExtension<ITableRow>
	/** Окно таблицы: число и номера строк, набор шапки, строка ячейки сетки в окне */
	window: TTableWindowExtension
	/** Память выборки: показанные строки — один раз до записи или смены условий */
	memory: TMemoryExtension<ITableRow>
}

/** Коллекция строк таблицы. */
export type TTableCollection = TCollectionEngine<
	ITableRow,
	TTableCollectionExtensions,
	TTableEngineOptions
>

/**
 * Движок, который принимает фасад: любого уровня сборки, недостающее фасад
 * дополнит сам (`completeEngine`). Оба параметра — `any`: движок инвариантен
 * по набору расширений через `engine:create` (см. ListBox).
 */
export type TTableCollectionFacadeEngine = TCollectionEngine<any, any>

/**
 * Пропсы коллекции строк: движок снаружи, состав и ключ сверки строк, режим
 * выбора, колонки данными и сортировка.
 *
 * `TCollection` по умолчанию — `TTableCollectionFacadeEngine`: `engine`
 * принимает движок любого уровня сборки, как у остальных коллекций.
 */
export interface ITableCollectionProps<
	TRowProps = ITableRowProps,
	TRow = ITableRow,
	TCollection = TTableCollectionFacadeEngine,
>
	extends
		ICollectionProps<TCollection>,
		IBatchCollectionProps<TRowProps, TRow>,
		ISelectionCollectionProps {
	/**
	 * Колонки данными. Сверка по `field`: колонка с тем же `field` та же и
	 * обновляется на месте, новая встаёт в конец, пропавшая удаляется
	 */
	columns?: TTableColumnSource[]
	/**
	 * Сортировка — колонки и направления по приоритету. Не задана — строки в
	 * порядке данных. Сверка по содержимому: тот же список, собранный заново, —
	 * не смена
	 */
	sort?: TTableColumnSort[]
	/** Сколько колонок сортируют строки: одна или несколько */
	sortMode?: TTableSortMode
	/**
	 * Строки приходят упорядоченными — например, их сортирует сервер: таблица
	 * держит сортировку и сообщает о её смене, но строки не переставляет
	 */
	presorted?: boolean
	/**
	 * Режим сетки (APG Data Grid): одна остановка Tab, стрелки по ячейкам,
	 * строку выбирают нажатием и пробелом. Без него — простая таблица
	 */
	grid?: boolean
}

/**
 * Входные пропсы фасада коллекции строк: состав, ключ сверки и режим выбора —
 * базе, колонки — расширению колонок, сортировка — расширению сортировки.
 */
export type TTableCollectionFacadeProps = TSelectionFacadeProps<ITableRow> &
	Pick<ITableCollectionProps, 'columns' | 'sort' | 'sortMode' | 'presorted' | 'grid'>

/** Пропсы строки от коллекции: выбранность. */
export interface ITableCollectionItemProps extends ISelectionCollectionItemProps {}

/**
 * События фасада коллекции строк: база выбора плюс карты `columns`, `table`,
 * `sort`, `grid`, `draw` и `window`.
 */
export type TTableCollectionFacadeEvents = TSelectionCollectionFacadeEvents<ITableRow> &
	TTableColumnsEvents &
	TTableExtensionEvents &
	TTableSortEvents &
	TTableGridEvents &
	TDrawEvents<ITableRow> &
	TTableWindowEvents

/** События фасада строки: порядок и выбор из базы плюс ячейки, включённый выбор строк и набор ячеек сетки. */
export type TTableRowCollectionFacadeEvents = TSelectionItemFacadeEvents &
	TTableColumnsItemEvents &
	TTableItemEvents &
	TTableGridItemEvents
