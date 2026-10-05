import type {
	IBatchCollectionProps,
	ICollectionProps,
	ISelectionCollectionItemProps,
	ISelectionCollectionProps,
	TBatchExtension,
	TCollectionEngine,
	TFactoryExtension,
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
	TTableColumnsEvents,
	TTableColumnsExtension,
	TTableColumnsItemEvents,
	TTableEngineOptions,
	TTableExtension,
	TTableExtensionEvents,
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
	/** Что строки получают от таблицы и выбор показанных строк */
	table: TTableExtension
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
 * выбора и колонки данными.
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
}

/**
 * Входные пропсы фасада коллекции строк: состав, ключ сверки и режим выбора —
 * базе, колонки — расширению колонок.
 */
export type TTableCollectionFacadeProps = TSelectionFacadeProps<ITableRow> &
	Pick<ITableCollectionProps, 'columns'>

/** Пропсы строки от коллекции: выбранность. */
export interface ITableCollectionItemProps extends ISelectionCollectionItemProps {}

/** События фасада коллекции строк: база выбора плюс карты `columns` и `table`. */
export type TTableCollectionFacadeEvents = TSelectionCollectionFacadeEvents<ITableRow> &
	TTableColumnsEvents &
	TTableExtensionEvents

/** События фасада строки: порядок и выбор из базы плюс ячейки. */
export type TTableRowCollectionFacadeEvents = TSelectionItemFacadeEvents & TTableColumnsItemEvents
