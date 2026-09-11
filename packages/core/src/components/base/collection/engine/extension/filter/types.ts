import type { IExtension } from '../types'

/**
 * Условие отбора. Поле, по которому сравнивают, не зашито в расширение —
 * его знает только компонент (Select фильтрует по `text`, таблица могла бы —
 * по любому своему полю).
 */
export type TFilterPredicate<TItem> = (item: TItem, query: string) => boolean

export type TFilterEvents = {
	/** Сменился текст запроса. */
	'change:query': (query: string) => void
	/** Сменился предикат. */
	'change:predicate': () => void
}

export interface IFilterExtension<TItem extends object = any> extends IExtension<TItem, TFilterEvents> {
	/** Условие отбора. `undefined` — фильтр не сужает состав. */
	predicate: TFilterPredicate<TItem> | undefined

	/** Текст запроса, передаётся предикату вторым аргументом. */
	query: string

	/** Есть предикат — значит проектор может сузить состав. */
	readonly active: boolean
}
