import type { IExtension } from '../../../../../base/collection'
import type { ITableRow } from '../../../row/types'

/** Направление сортировки: `asc` — по возрастанию, `desc` — по убыванию. */
export type TTableSortDirection = 'asc' | 'desc'

/**
 * Сортировка по колонке — её поле и направление. Состояние сортировки —
 * список таких записей по приоритету: первая решает порядок, следующая —
 * порядок равных по первой, и так далее.
 *
 * Колонку запись называет полем (`field`) — ключом колонки в коллекции
 * колонок: состояние переживает пересоздание экземпляров колонок, и его можно
 * задать раньше, чем колонки придут.
 */
export type TTableColumnSort = {
	readonly field: string
	readonly direction: TTableSortDirection
}

/**
 * Сколько колонок сортируют строки: `single` — одна, сортировка по другой
 * колонке её заменяет; `multiple` — несколько, новая встаёт последней по
 * приоритету.
 */
export type TTableSortMode = 'single' | 'multiple'

export type TTableSortEvents = {
	/** Сменилось состояние сортировки — колонки, направления или приоритет */
	'change:sort': (value: TTableColumnSort[]) => void
	/** change:sortMode */
	'change:sortMode': (value: TTableSortMode) => void
	/** change:presorted */
	'change:presorted': (value: boolean) => void
}

/**
 * Контракт расширения сортировки коллекции строк.
 *
 * Сортировка — выборка, а не перестановка хранилища: порядок данных
 * (`batch.items`) остаётся как есть, по-другому упорядочено показанное
 * (`batch.shown`).
 */
export interface ITableSortExtension<TRow extends ITableRow = ITableRow> extends IExtension<
	TRow,
	TTableSortEvents
> {
	/** Состояние сортировки — колонки и направления по приоритету. Пусто — порядок данных */
	get sort(): TTableColumnSort[]
	/**
	 * Записать состояние. Сверка — по содержимому: тот же список, собранный
	 * заново, — не смена. Повтор поля — по первой записи, в `single` — только
	 * первая колонка
	 */
	set sort(value: readonly TTableColumnSort[])

	/** Сколько колонок сортируют строки — одна или несколько */
	sortMode: TTableSortMode

	/**
	 * Строки приходят упорядоченными — например, их сортирует сервер.
	 * Состояние, его события и наборы колонок те же, но показанное таблица не
	 * переставляет
	 */
	presorted: boolean

	/**
	 * Следующее направление колонки — сортировка пользователя: по возрастанию,
	 * по убыванию, снята. Сортирует только колонку, которая есть и
	 * сортируется (`sortable`), и не у выключенной таблицы
	 */
	toggle(field: string): void
}
