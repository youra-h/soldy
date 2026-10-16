import type { IExtension } from '../../../../../base/collection'
import type { IPaginationItem } from '../../../item/types'
import type { IPagination } from '../../../types'

/** Страница окна — элемент коллекции. Ключ — `uid` страницы. */
export type TPaginationItemCell = {
	readonly kind: 'item'
	readonly key: number
	readonly item: IPaginationItem
}

/**
 * Пропуск — место пропущенных страниц, разметка владельца: на нём ничего не
 * нажимают, и экземпляра у него нет.
 *
 * Ключ — от страницы, перед которой он стоит: её `uid` с минусом, как у
 * распорки рисования коллекции. С ключами страниц (их `uid`, от единицы) он
 * не совпадает, а за пропуском страница есть всегда — последняя видна
 * всегда.
 */
export type TPaginationEllipsisCell = {
	readonly kind: 'ellipsis'
	readonly key: number
}

/** Место окна пагинации по порядку: страница или пропуск. */
export type TPaginationCell = TPaginationItemCell | TPaginationEllipsisCell

export type TPaginationExtensionEvents = {
	/** Сменилось окно: страницы или пропуски между ними */
	'change:cells': (cells: ReadonlyArray<TPaginationCell>) => void
}

/** Контракт расширения пагинации. */
export interface IPaginationExtension extends IExtension<
	IPaginationItem,
	TPaginationExtensionEvents
> {
	/**
	 * Окно по порядку: первая страница, середина вокруг текущей, последняя и
	 * пропуски на месте пропущенных. Пагинации нет — окна тоже
	 */
	readonly cells: ReadonlyArray<TPaginationCell>
}

/** Опции движка пагинации: пагинация приходит и уходит после сборки. */
export type TPaginationEngineOptions = {
	owner: IPagination
}
