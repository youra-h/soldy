import type { TTableColumnSort } from '../types'

/**
 * Режим сортировки — стратегия расширения сортировки: форма состояния и
 * сортировка пользователя. Её меняет сеттер `sortMode`, и веток по режиму в
 * методах расширения нет.
 *
 * Стратегия без состояния: состояние держит расширение и отдаёт его в каждый
 * вызов. Записи состояния она не меняет — отдаёт новый список.
 */
export interface ITableSortStrategy {
	/** Состояние в форме режима. Записи уже без повторов поля */
	resolve(sort: readonly TTableColumnSort[]): TTableColumnSort[]
	/** Сортировка пользователя: следующее направление колонки `field` */
	toggle(sort: readonly TTableColumnSort[], field: string): TTableColumnSort[]
}

/** Конструктор стратегии: расширение заводит её на режим. */
export type TTableSortStrategyCtor = new () => ITableSortStrategy
