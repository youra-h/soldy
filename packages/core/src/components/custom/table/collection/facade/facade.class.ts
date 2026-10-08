import { TSelectionCollectionFacade } from '../../../../base/collection'
import type { TCollectionEngine, TCollectionFacadeOptions } from '../../../../base/collection'
import { completeEngine } from '../../../../base/collection/create/internal'
import type { TDefaultValues } from '../../../../base/component'
import type { TAriaAttributes } from '../../../../../common'
import type { ICheckBox } from '../../../check-box/types'
import type { TTableColumnSource } from '../../column/collection/types'
import type { ITableColumn } from '../../column/types'
import type { ITableRow } from '../../row/types'
import type { ITable } from '../../types'
import type { TTableColumnSort, TTableShownSelection, TTableSortMode } from '../extensions'
import { tableExtensions } from '../factory'
import type {
	ITableCollectionProps,
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
 * строк выбрано, команды выбора показанных и чекбокс «выбрать все»
 * (`table`), сортировка строк по колонкам (`sort`), режим сетки и набор её
 * ячеек (`grid`). Своего фасад не делает
 * ничего: события расширений он отдаёт наружу `relayAll`, команды остаются у
 * них.
 */
export class TTableCollectionFacade extends TSelectionCollectionFacade<
	ITableRow,
	TTableCollectionExtensions,
	TTableCollectionFacadeEvents
> {
	/**
	 * Умолчания колонок и сортировки: снятый из разметки проп связка
	 * возвращает к ним. Не заданные колонки — колонок нет, не заданная
	 * сортировка — порядок данных.
	 */
	static override defaultValues: typeof TSelectionCollectionFacade.defaultValues &
		TDefaultValues<
			ITableCollectionProps,
			'sortMode' | 'presorted' | 'grid',
			'sort' | 'columns'
		> = {
		...TSelectionCollectionFacade.defaultValues,
		columns: undefined,
		sort: undefined,
		sortMode: 'single',
		presorted: false,
		grid: false,
	}

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
		this.events.relayAll(this.extensions.sort.events)
		this.events.relayAll(this.extensions.grid.events)

		this.applyProps(props)
	}

	/**
	 * Колонки — расширению колонок, сортировка — расширению сортировки, режим и
	 * состав строк — базе. Режим сортировки — до состояния: он решает, сколько
	 * колонок в нём останется. Пустой состав колонок, как и строк, и пустая
	 * сортировка не применяются: движок снаружи свои не теряет.
	 */
	protected override applyProps(props: TTableCollectionFacadeProps): void {
		if (props.columns?.length) this.columns = props.columns
		if (props.sortMode) this.sortMode = props.sortMode
		if (props.presorted) this.presorted = props.presorted
		if (props.sort?.length) this.sort = props.sort
		if (props.grid) this.grid = props.grid

		super.applyProps(props)
	}

	/** Колонки — все, и скрытые тоже, в порядке коллекции колонок */
	get columns(): ReadonlyArray<ITableColumn> {
		return this.extensions.columns.columns
	}

	/** Колонки данными: сверка по `field`. Не заданы — колонок нет */
	set columns(sources: readonly TTableColumnSource[] | undefined) {
		this.extensions.columns.columns = sources ?? []
	}

	/** Показанные колонки — видимые, в порядке коллекции колонок */
	get shownColumns(): ReadonlyArray<ITableColumn> {
		return this.extensions.columns.shownColumns
	}

	/**
	 * Сколько колонок в строке таблицы — показанные и колонка выбора, пока
	 * выбор строк включён. Не меньше одной: на столько колонок встаёт ячейка
	 * пустой таблицы (`colspan`)
	 */
	get columnCount(): number {
		const selection = this.extensions.table.selecting ? 1 : 0

		return Math.max(1, this.shownColumns.length + selection)
	}

	/** Сколько показанных строк выбрано — для чекбокса шапки */
	get shownSelection(): TTableShownSelection {
		return this.extensions.table.shownSelection
	}

	/**
	 * Чекбокс «выбрать все показанные» — экземпляр, который держит таблица:
	 * отметку, «часть» и выключенность пишет она, а запись отметки — просьба
	 * выбрать или снять показанные строки
	 */
	get selectAll(): ICheckBox {
		return this.extensions.table.selectAll
	}

	/** Сортировка — колонки и направления по приоритету; пусто — порядок данных */
	get sort(): TTableColumnSort[] {
		return this.extensions.sort.sort
	}

	/** Не задана — строки в порядке данных. Сверка по содержимому */
	set sort(value: readonly TTableColumnSort[] | undefined) {
		this.extensions.sort.sort = value ?? []
	}

	/** Сколько колонок сортируют строки — одна или несколько */
	get sortMode(): TTableSortMode {
		return this.extensions.sort.sortMode
	}

	set sortMode(value: TTableSortMode) {
		this.extensions.sort.sortMode = value
	}

	/** Строки приходят упорядоченными: таблица их не переставляет */
	get presorted(): boolean {
		return this.extensions.sort.presorted
	}

	set presorted(value: boolean) {
		this.extensions.sort.presorted = value
	}

	/** Режим сетки: одна остановка Tab, стрелки по ячейкам, строку выбирают нажатием */
	get grid(): boolean {
		return this.extensions.grid.grid
	}

	set grid(value: boolean) {
		this.extensions.grid.grid = value
	}

	/**
	 * Набор ячеек сетки, у которых нет своего экземпляра, — в шапке это ячейка
	 * колонки выбора. Вне сетки пуст
	 */
	get cellAria(): TAriaAttributes {
		return this.extensions.grid.cellAria
	}

	/** Выбрать все показанные строки, которые можно выбрать */
	selectShown(): void {
		this.extensions.table.selectShown()
	}

	/** Снять выбор с показанных строк, которые можно выбрать */
	deselectShown(): void {
		this.extensions.table.deselectShown()
	}

	/** Следующее направление колонки — сортировка пользователя кнопкой заголовка */
	toggleSort(field: string): void {
		this.extensions.sort.toggle(field)
	}
}
