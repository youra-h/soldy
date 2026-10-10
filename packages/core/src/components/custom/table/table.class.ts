import { TControl } from '../../base/control'
import type { TDefaultValues } from '../../base/component'
import { DEFAULT_LOCALE } from '../../../common'
import type {
	ITable,
	ITableProps,
	TTableColumnFit,
	TTableEvents,
	TTableReorderPreview,
} from './types'
import type { TTableResizePreview } from './column/types'

/**
 * Таблица — владелец коллекции строк, как ListBox — владелец опций. Корень —
 * `table`.
 *
 * Строки, колонки, ячейки, выбор и сортировка строк — коллекция и её
 * расширения (`collection/`): строки — элементы над записями приложения,
 * колонки — своя коллекция в расширении `columns`, ячейки — проекция строки на
 * показанные колонки, порядок строк — выборка расширения `sort`. `disabled`,
 * `size` и `variant` — от контрола, строкам их раздаёт расширение `table`.
 *
 * Своё у таблицы — язык (`locale`): по нему сортировка сравнивает строки.
 * Хранится как задан; невалидный тег сортировка читает как `en-US`, а не
 * падает. С setup его пишет плагин языка — тег локали поддерева. Имя чекбокса
 * «выбрать все» — строка локали, и отдаёт её разметке плагин имён таблицы
 * (`TTableNamesPlugin`): ядро имён не строит.
 *
 * И закреплённая шапка (`stickyHead`) — свойство вида таблицы, а не
 * коллекции: строки и колонки от него не меняются. Ядро отдаёт его теме
 * `data-sticky-head`, а как закрепить шапку, решает тема.
 *
 * И то, как колонки без своей ширины делят место (`columnFit`): по нему
 * ширины колонок раскладывает расширение колонок коллекции строк, а теме
 * значение не уходит — она получает готовые ширины колонок и признак
 * «колонки шире места» (`data-overflow`).
 *
 * И то, что идёт за жестом перестановки колонки (`reorderPreview`): ничего,
 * кроме взятого заголовка, шапка или колонка целиком. Модель от него не меняется — колонка встаёт на место одной
 * перестановкой, когда её отпустили. Значение читает расширение колонок, как
 * `columnFit`, а не тема: в `column` оно ставит корню признак
 * `data-reorder-preview` на время жеста, и по нему тема ведёт тело за
 * заголовками. На покое и в `head` признака нет, и таблица не платит за
 * правила тела: тема держит их под ним.
 *
 * И то, что идёт за протяжкой ручки ширины (`resizePreview`): сама колонка
 * или призрак новой границы до отпускания. Значение расширение колонок
 * отдаёт колонкам, а теме уходит только признак отложенного жеста на
 * заголовке.
 */
export class TTable extends TControl<ITableProps, TTableEvents> implements ITable {
	static override baseClass = 's-table'

	static defaultValues: typeof TControl.defaultValues &
		TDefaultValues<
			ITableProps,
			'locale' | 'stickyHead' | 'columnFit' | 'reorderPreview' | 'resizePreview'
		> = {
		...TControl.defaultValues,
		tag: 'table',
		locale: DEFAULT_LOCALE,
		stickyHead: false,
		// Таблица во всю ширину места, как без раскладки ядра
		columnFit: 'auto',
		// Шапка: тело тысяч строк на каждую смену места не перерисовывается
		reorderPreview: 'head',
		// Колонка за указателем, как до отложенного жеста
		resizePreview: 'live',
	}

	protected _locale: string
	protected _stickyHead!: boolean
	protected _columnFit: TTableColumnFit
	protected _reorderPreview: TTableReorderPreview
	protected _resizePreview: TTableResizePreview

	constructor(props: Partial<ITableProps> = {}) {
		super(props)

		const ctor = new.target as typeof TTable

		this._locale = props.locale ?? ctor.defaultValues.locale
		this._columnFit = props.columnFit ?? ctor.defaultValues.columnFit
		this._reorderPreview = props.reorderPreview ?? ctor.defaultValues.reorderPreview
		this._resizePreview = props.resizePreview ?? ctor.defaultValues.resizePreview
		this._applyStickyHead(props.stickyHead ?? ctor.defaultValues.stickyHead)
	}

	get locale(): string {
		return this._locale
	}

	set locale(value: string) {
		if (this._locale === value) return

		this._locale = value
		this.events.emit('change:locale', value)
	}

	/**
	 * Шапка закреплена у верхнего края прокрутки — контейнера или страницы, — и
	 * строки уходят под неё. Без него шапка уезжает вместе со строками.
	 */
	get stickyHead(): boolean {
		return this._stickyHead
	}

	set stickyHead(value: boolean) {
		if (this._stickyHead === value) return

		this._applyStickyHead(value)
		this.events.emit('change:stickyHead', value)
	}

	/**
	 * Как колонки без своей ширины делят место: `none` — стоят в ширине по
	 * умолчанию, `auto` — растут до `maxWidth` во всю ширину места, `contain` —
	 * ровно заполняют место, сжимаясь до `minWidth`. Колонки шире места даже
	 * так — таблица прокручивается.
	 */
	get columnFit(): TTableColumnFit {
		return this._columnFit
	}

	set columnFit(value: TTableColumnFit) {
		if (this._columnFit === value) return

		this._columnFit = value
		this.events.emit('change:columnFit', value)
	}

	/**
	 * Что идёт за жестом перестановки колонки: `none` — только взятый
	 * заголовок, соседи стоят, и колонка встаёт на отпускании; `head` — шапка,
	 * а тело стоит до отпускания; `column` — шапка и ячейки нарисованных строк.
	 * Колонка во всех встаёт на место одной перестановкой. Значение
	 * расширение колонок читает, когда колонку берут: смена посреди жеста
	 * действует со следующего.
	 */
	get reorderPreview(): TTableReorderPreview {
		return this._reorderPreview
	}

	set reorderPreview(value: TTableReorderPreview) {
		if (this._reorderPreview === value) return

		this._reorderPreview = value
		this.events.emit('change:reorderPreview', value)
	}

	/**
	 * Что идёт за протяжкой ручки ширины: `live` — сама колонка, `deferred` —
	 * призрак новой границы, а ширина пишется на отпускании. Значение
	 * расширение колонок отдаёт показанным колонкам, а колонка читает его на
	 * нажатии: смена посреди жеста действует со следующего.
	 */
	get resizePreview(): TTableResizePreview {
		return this._resizePreview
	}

	set resizePreview(value: TTableResizePreview) {
		if (this._resizePreview === value) return

		this._resizePreview = value
		this.events.emit('change:resizePreview', value)
	}

	override getProps(): ITableProps {
		return {
			...super.getProps(),
			locale: this._locale,
			stickyHead: this._stickyHead,
			columnFit: this._columnFit,
			reorderPreview: this._reorderPreview,
			resizePreview: this._resizePreview,
		}
	}

	protected _applyStickyHead(value: boolean): void {
		this._stickyHead = value

		// Тема по нему закрепляет шапку
		this._dataset.add('sticky-head', value)
	}
}
