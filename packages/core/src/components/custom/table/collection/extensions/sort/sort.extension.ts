import { TBaseExtension } from '../../../../../base/collection'
import type { IExtensionContext, TQueryEvent } from '../../../../../base/collection'
import type { ITableColumn } from '../../../column/types'
import type { ITableRow } from '../../../row/types'
import type { ITable } from '../../../types'
import { columnsOf } from '../guards'
import type { TTableEngineOptions } from '../table'
import { collatorOf, rowComparator } from './compare'
import { normalizeSort, sameSort } from './state'
import { TMultipleSort, TSingleSort } from './strategies'
import type { ITableSortStrategy, TTableSortStrategyCtor } from './strategies'
import type {
	ITableSortExtension,
	TTableColumnSort,
	TTableSortDirection,
	TTableSortEvents,
	TTableSortMode,
} from './types'

/** Стратегия сортировки на режим — её заводит сеттер `sortMode`. */
const STRATEGIES: Readonly<Record<TTableSortMode, TTableSortStrategyCtor>> = {
	single: TSingleSort,
	multiple: TMultipleSort,
}

/** `aria-sort` заголовка по направлению. */
const ARIA_SORT: Readonly<Record<TTableSortDirection, string>> = {
	asc: 'ascending',
	desc: 'descending',
}

/**
 * Сортировка строк таблицы по колонкам.
 *
 * **Сортировка — выборка, а не перестановка хранилища.** Расширение
 * подписано на `items:query:before` рядом с `filter` и упорядочивает то, что
 * показано (`batch.shown`), а состав и его порядок (`batch.items`) остаются
 * порядком данных. Поэтому снятая сортировка возвращает строки в порядок
 * данных, а запись, выбор и сверка `trackBy` сортировки не видят. Сортировка
 * устойчивая: равные строки остаются в порядке данных.
 *
 * **Состояние** — колонки и направления по приоритету (`sort`), его держит
 * расширение. Колонку запись называет полем: состояние можно задать раньше,
 * чем придут колонки, и оно переживает пересоздание их экземпляров. Сравнение
 * по колонке — её своё (`compare`), без него — значения поля записи; поле
 * без колонки сортирует так же, значениями.
 *
 * **Режим — стратегия** (`strategies/`): одна колонка или несколько. Её
 * меняет сеттер `sortMode`, и веток по режиму в методах нет. Смена режима
 * переписывает состояние в форму нового — `single` оставляет колонку с
 * высшим приоритетом.
 *
 * **Строки, упорядоченные снаружи** (`presorted`) — например, сервером:
 * состояние, `change:sort` и наборы колонок те же, а подписки на выборку нет
 * вовсе, и показанное идёт в порядке данных. Режим выражен подпиской, а не
 * проверкой внутри обработчика.
 *
 * **Колонки.** Что строки отсортированы по колонке, расширение пишет в её
 * наборы: `data-sort` (`asc`, `desc`) и `data-sort-priority` (с единицы) —
 * всем отсортированным, для темы, а `aria-sort` — только первой по приоритету:
 * по ARIA 1.2 его ставят одному заголовку за раз. Колонка ушла из коллекции
 * колонок — её сортировка снимается вместе с ней. Скрытая колонка остаётся в
 * коллекции, и её сортировка — тоже: скрыть колонку — решение о виде, а не о
 * порядке строк.
 *
 * Показанное расширение не хранит — порядок считается на каждое чтение, а
 * читателям сообщает, что прежний устарел (`items:query:invalidated`):
 * сменилось состояние, язык таблицы, сравнение или колонка отсортированного
 * поля. Запись, сменённую у строки на месте (`row.data = …`), расширение не
 * слушает, как и `filter`: новые записи приходят составом — сверкой
 * `trackBy`, — и о нём читатели узнают сами (`change:items`).
 *
 * Таблица — опция движка (`owner`): по её языку (`locale`) сравниваются
 * строки текста, а выключенная таблица не сортирует по команде пользователя.
 * Соседа `columns` расширение узнаёт по контракту и ставится после него.
 */
export class TTableSortExtension<TOwner extends ITable = ITable, TRow extends ITableRow = ITableRow>
	extends TBaseExtension<TRow, TTableSortEvents, TTableEngineOptions<TOwner>>
	implements ITableSortExtension<TRow>
{
	readonly name = 'sort' as const

	/** Состояние в форме режима: свои записи, без повторов поля */
	private _sort: TTableColumnSort[] = []
	private _mode: TTableSortMode = 'single'
	private _strategy: ITableSortStrategy = new TSingleSort()
	private _presorted = false

	/** Язык таблицы и сравнение текста по нему — заводится при первой сортировке */
	private _locale: string | undefined = undefined
	private _collator: Intl.Collator | undefined = undefined

	/**
	 * Колонки коллекции колонок — с обработчиком своего сравнения. Ушедшую
	 * колонку расширение больше не слушает: подписка удерживала бы его, пока
	 * жива сама колонка.
	 */
	private readonly _columns = new Map<ITableColumn, () => void>()

	/** Поля колонок на последнюю сверку: по ним видно, какое поле ушло и какое пришло */
	private _fields = new Set<string>()

	private readonly _onColumns = (): void => {
		if (this._syncColumns()) this._invalidate()
	}

	private readonly _onQuery = (e: TQueryEvent<TRow>): void => {
		if (this._sort.length === 0) return

		const columns = columnsOf(this._ctx)?.columns ?? []

		e.items = [...e.items].sort(rowComparator(this._sort, columns, this._textCollator))
	}

	override install(ctx: IExtensionContext<TRow, TTableEngineOptions<TOwner>>): void {
		super.install(ctx)

		this._listen()

		const columns = columnsOf(ctx)

		// Состав колонок: ушедшая колонка снимает свою сортировку, пришедшая
		// получает пометки и, может быть, своё сравнение. Поле показанной
		// колонки сменилось — для сортировки колонка поля ушла, а другая пришла:
		// об этом колонки сообщают `change:cells`
		columns?.engine.extensions.plain.events.on('change:items', this._onColumns)
		columns?.events.on('change:cells', this._onColumns)

		// Таблица — опция движка: приходит и уходит после сборки. Подписка на её
		// язык живёт в области наблюдателя — сменилась таблица, прежняя снята
		ctx.options.watch('owner', (owner, scope) => {
			this._setLocale(owner?.locale)

			if (owner) {
				scope.on(owner.events, 'change:locale', (locale: string) => this._setLocale(locale))
			}
		})

		// Догон: колонки могли прийти, а состояние — записаться до установки
		this._syncColumns()

		if (this._sort.length) this._invalidate()
	}

	get sort(): TTableColumnSort[] {
		return this._sort.map((entry) => ({ ...entry }))
	}

	set sort(value: readonly TTableColumnSort[]) {
		if (this._commit(this._strategy.resolve(normalizeSort(value)))) this._invalidate()
	}

	get sortMode(): TTableSortMode {
		return this._mode
	}

	set sortMode(value: TTableSortMode) {
		if (this._mode === value) return

		this._mode = value
		this._strategy = new STRATEGIES[value]()

		// Состояние — в форму нового режима
		const changed = this._commit(this._strategy.resolve(this._sort))

		this.events.emit('change:sortMode', value)

		if (changed) this._invalidate()
	}

	get presorted(): boolean {
		return this._presorted
	}

	set presorted(value: boolean) {
		if (this._presorted === value) return

		this._presorted = value
		this._listen()
		this.events.emit('change:presorted', value)

		// Показанное встаёт в порядок данных или в отсортированный — если есть
		// по чему сортировать
		if (this._sort.length) this._ctx?.driver.invalidateQuery()
	}

	toggle(field: string): void {
		if (this._ctx?.options.get('owner')?.disabled) return

		const column = columnsOf(this._ctx)?.columns.find((candidate) => candidate.field === field)

		if (!column?.sortable) return

		if (this._commit(this._strategy.toggle(this._sort, field))) this._invalidate()
	}

	/* ------------------------------------------------------------------ */
	/* Внутреннее                                                         */
	/* ------------------------------------------------------------------ */

	/**
	 * Записать состояние, если оно другое: сначала пометки колонок, потом
	 * `change:sort`. Сообщить, что показанное устарело, — дело вызывающего:
	 * одна операция — одно сообщение.
	 */
	private _commit(next: TTableColumnSort[]): boolean {
		if (sameSort(next, this._sort)) return false

		this._sort = next
		this._paint()
		this.events.emit('change:sort', this.sort)

		return true
	}

	/** Показанное устарело — если его упорядочивает таблица. */
	private _invalidate(): void {
		if (!this._presorted) this._ctx?.driver.invalidateQuery()
	}

	/** Подписка на выборку есть, пока строки упорядочивает таблица. */
	private _listen(): void {
		const events = this._ctx?.driver.events

		if (!events) return

		if (this._presorted) events.off('items:query:before', this._onQuery)
		else events.on('items:query:before', this._onQuery)
	}

	/** Сравнение текста по языку таблицы: заводится один раз на язык. */
	private get _textCollator(): Intl.Collator {
		this._collator ??= collatorOf(this._locale)

		return this._collator
	}

	/** Язык таблицы сменился — строки текста сравниваются по-новому. */
	private _setLocale(locale: string | undefined): void {
		if (this._locale === locale) return

		this._locale = locale
		this._collator = undefined

		if (this._sort.length) this._invalidate()
	}

	/** Сортируют ли строки по полю. */
	private _sorts(field: string): boolean {
		return this._sort.some((entry) => entry.field === field)
	}

	/**
	 * Сверить колонки с коллекцией колонок: новые — слушать и пометить, ушедшие —
	 * больше не слушать и снять с них пометки. Поле ушло вместе с колонкой — его
	 * сортировка снимается. Пришло поле, по которому уже сортируют, — у его
	 * колонки может быть своё сравнение.
	 *
	 * Отвечает, устарело ли показанное: сообщить о нём — дело вызывающего.
	 */
	private _syncColumns(): boolean {
		const columns = columnsOf(this._ctx)?.columns ?? []
		const stored = new Set(columns)

		for (const [column, onCompare] of this._columns) {
			if (stored.has(column)) continue

			column.events.off('change:compare', onCompare)
			this._columns.delete(column)
			this._unpaint(column)
		}

		for (const column of columns) {
			if (this._columns.has(column)) continue

			const onCompare = (): void => {
				if (this._sorts(column.field)) this._invalidate()
			}

			this._columns.set(column, onCompare)
			column.events.on('change:compare', onCompare)
		}

		const before = this._fields
		const fields = new Set(columns.map((column) => column.field))

		this._fields = fields

		const pruned = this._commit(
			this._sort.filter(({ field }) => fields.has(field) || !before.has(field)),
		)
		const arrived = this._sort.some(({ field }) => fields.has(field) && !before.has(field))

		// Без смены состояния пометки ждут колонки, которые пришли
		if (!pruned) this._paint()

		return pruned || arrived
	}

	/** Пометки всех колонок по состоянию. Запись того же значения набор не меняет. */
	private _paint(): void {
		for (const column of this._columns.keys()) {
			const priority = this._sort.findIndex((entry) => entry.field === column.field)

			if (priority < 0) {
				this._unpaint(column)
				continue
			}

			const { direction } = this._sort[priority]

			column.dataset.add('sort', direction)
			column.dataset.add('sort-priority', priority + 1)
			column.aria.add('aria-sort', priority === 0 ? ARIA_SORT[direction] : null)
		}
	}

	/** Снять пометки сортировки с колонки. */
	private _unpaint(column: ITableColumn): void {
		column.dataset.add('sort', null)
		column.dataset.add('sort-priority', null)
		column.aria.add('aria-sort', null)
	}
}
