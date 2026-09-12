import type { IExtension } from '../types'

/**
 * Своё правило отбора. Получает элемент и текущий запрос.
 *
 * Нужен, когда совпадения по подстроке мало: диапазон дат, число больше
 * порога, составное условие. Задан — поля не смотрятся вовсе.
 */
export type TFilterPredicate<TItem> = (item: TItem, query: string) => boolean

export type TFilterEvents<TItem> = {
	'change:query': (query: string) => void
	'change:fields': (fields?: (keyof TItem)[]) => void
	'change:predicate': (predicate?: TFilterPredicate<TItem>) => void

	/**
	 * Условия отбора изменились — прежняя выборка устарела.
	 *
	 * Отдельно от трёх событий выше: читателю всё равно, что именно поменялось,
	 * ему нужно перечитать `batch.items`. Без аргументов по той же причине.
	 */
	'change:filter': () => void
}

export interface IFilterExtension<TItem extends object = any> extends IExtension<
	TItem,
	TFilterEvents<TItem>
> {
	/** Строка поиска. Пустая — фильтр не применяется (если нет своего предиката). */
	query: string

	/**
	 * По каким полям искать. Не задано — по всем, что удалось прочитать
	 * у элемента.
	 */
	fields?: (keyof TItem)[]

	/** Своё правило отбора вместо поиска по полям. */
	predicate?: TFilterPredicate<TItem>

	/** Применяется ли отбор прямо сейчас. */
	get active(): boolean

	/** Проходит ли элемент текущий отбор. */
	matches(item: TItem): boolean

	/** Сбросить запрос. Поля и предикат остаются. */
	clear(): void
}
