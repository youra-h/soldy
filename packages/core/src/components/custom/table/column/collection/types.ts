import type {
	TBatchExtension,
	TCollectionEngine,
	TCollectionEngineItemSource,
	TFactoryExtension,
	TMetaExtension,
	TOrderExtension,
	TPlainExtension,
	TUniqueExtension,
} from '../../../../base/collection'
import type { ITableColumn, ITableColumnProps } from '../types'
import type { TTableColumnsVisibilityExtension } from './extensions'

export type TTableColumnsCollectionExtensions = {
	factory: TFactoryExtension<ITableColumn>
	unique: TUniqueExtension<ITableColumn>
	meta: TMetaExtension<ITableColumn>
	order: TOrderExtension<ITableColumn>
	plain: TPlainExtension<ITableColumn>
	batch: TBatchExtension<ITableColumn>
	/** Скрытая колонка не попадает в выборку */
	visibility: TTableColumnsVisibilityExtension
}

/** Коллекция колонок: колонки сверяются по `field`. */
export type TTableColumnsCollection = TCollectionEngine<
	ITableColumn,
	TTableColumnsCollectionExtensions
>

/**
 * Колонка данными — её пропсы. `field` обязателен: по нему колонки
 * сверяются, и повтор теми же данными оставляет те же экземпляры.
 */
export type TTableColumnSource = TCollectionEngineItemSource<ITableColumnProps> & {
	field: string
}
