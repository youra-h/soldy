import type { IExtension } from '../../../../../base/collection'
import type { TTableColumnsCollection, TTableColumnSource } from '../../../column/collection/types'
import type { ITableColumn } from '../../../column/types'

export type TTableColumnsEvents = {
	/**
	 * Показанные колонки надо перечитать: сменились состав, порядок или
	 * видимость колонки. Без аргумента — читатель берёт `shownColumns`. Одна
	 * операция — одно событие, сколько бы колонок она ни задела
	 */
	'change:shownColumns': () => void
}

/**
 * Контракт расширения колонок коллекции строк.
 *
 * Колонки — своя коллекция: её движок расширение создаёт и держит, поэтому
 * движок строк, переданный снаружи, переносит и состав колонок, и их порядок
 * и ширины.
 */
export interface ITableColumnsExtension<TRow extends object = any> extends IExtension<
	TRow,
	TTableColumnsEvents
> {
	/** Движок колонок: порядок, состав, жизнь колонок — его стандартные детали */
	readonly engine: TTableColumnsCollection

	/** Колонки — все, и скрытые тоже, в порядке коллекции */
	get columns(): ReadonlyArray<ITableColumn>
	/**
	 * Задать колонки данными. Сверка по `field`: колонка с тем же `field` та же
	 * и обновляется на месте, новая встаёт в конец, пропавшая удаляется
	 */
	set columns(sources: readonly TTableColumnSource[])

	/** Показанные колонки — видимые, в порядке коллекции */
	readonly shownColumns: ReadonlyArray<ITableColumn>
}
