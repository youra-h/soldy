import { TSelectionCollectionFacade } from '../../../../base/collection'
import type { TCollectionEngine, TCollectionFacadeOptions } from '../../../../base/collection'
import { completeEngine } from '../../../../base/collection/create/internal'
import type { TTableColumnSource } from '../../column/collection/types'
import type { ITableColumn } from '../../column/types'
import type { ITableRow } from '../../row/types'
import type { ITable } from '../../types'
import type { TTableShownSelection } from '../extensions'
import { tableExtensions } from '../factory'
import type {
	TTableCollectionExtensions,
	TTableCollectionFacadeEngine,
	TTableCollectionFacadeEvents,
	TTableCollectionFacadeProps,
} from '../types'

/**
 * Фасад коллекции строк таблицы.
 *
 * Состав и выбор строк — из базы с выбором; остальное — проекция расширений
 * коллекции: колонки и показанные колонки (`columns`), сколько показанных
 * строк выбрано и команды выбора показанных (`table`). Своего фасад не делает
 * ничего: события расширений он отдаёт наружу `relayAll`, команды остаются у
 * них.
 */
export class TTableCollectionFacade extends TSelectionCollectionFacade<
	ITableRow,
	TTableCollectionExtensions,
	TTableCollectionFacadeEvents
> {
	constructor(
		props: TTableCollectionFacadeProps = {},
		options: TCollectionFacadeOptions<TTableCollectionFacadeEngine, ITable> = {},
	) {
		// Движок мог прийти снаружи собранным на любом уровне — `completeEngine`
		// доставит в него то, чего не хватает таблице. Именно здесь, а не в теле:
		// базы трогают расширения в своих конструкторах
		super(
			{},
			{
				engine: completeEngine(options.engine, tableExtensions()) as TCollectionEngine<
					ITableRow,
					TTableCollectionExtensions
				>,
				owner: options.owner,
			},
		)

		if (!options.engine) this.bindOwner()

		this.events.relayAll(this.extensions.columns.events)
		this.events.relayAll(this.extensions.table.events)

		this.applyProps(props)
	}

	/**
	 * Колонки — расширению колонок, режим и состав строк — базе. Пустой состав
	 * колонок, как и строк, не применяется: движок снаружи свои не теряет.
	 */
	protected override applyProps(props: TTableCollectionFacadeProps): void {
		if (props.columns?.length) this.columns = props.columns

		super.applyProps(props)
	}

	/** Колонки — все, и скрытые тоже, в порядке коллекции колонок */
	get columns(): ReadonlyArray<ITableColumn> {
		return this.extensions.columns.columns
	}

	/** Колонки данными: сверка по `field` */
	set columns(sources: readonly TTableColumnSource[]) {
		this.extensions.columns.columns = sources
	}

	/** Показанные колонки — видимые, в порядке коллекции колонок */
	get shownColumns(): ReadonlyArray<ITableColumn> {
		return this.extensions.columns.shownColumns
	}

	/** Сколько показанных строк выбрано — для чекбокса шапки */
	get shownSelection(): TTableShownSelection {
		return this.extensions.table.shownSelection
	}

	/** Выбрать все показанные строки, которые можно выбрать */
	selectShown(): void {
		this.extensions.table.selectShown()
	}

	/** Снять выбор с показанных строк, которые можно выбрать */
	deselectShown(): void {
		this.extensions.table.deselectShown()
	}
}
