import type { IPagination, TPaginationCollection } from '@soldy-ui/core'
import type { IPluginContext } from '../../base'
import { TCollectionElements } from '../collection'

/**
 * Кнопка текущей страницы — страницы с ключом значения пагинации среди
 * страниц коллекции, пока её узел в документе. `null` — страницы значения в
 * коллекции нет (ключ без страницы) или её узла нет в документе.
 *
 * Текущая — по ключу, а не по активации: расширение `pagination` слушает того
 * же владельца и пересобирает окно и активацию, бывает, позже того, кто
 * спрашивает. Кнопка — первая `button` в узле страницы: корень страницы —
 * место в списке (`li`), а кнопкой является строка внутри.
 *
 * Одна на фокус со стрелки, погасшей у края (`TPaginationFocusPlugin`), и
 * узел фокуса пагинации (`currentPageOf`): текущую оба ищут одним правилом.
 */
export function currentButtonOf(
	owner: IPagination,
	engine: TPaginationCollection | null,
	elements: TCollectionElements | null,
): HTMLButtonElement | null {
	const page = engine?.extensions.batch.items.find((item) => item.value === owner.value)
	const element = page ? elements?.getElementByItem(page) : null

	return element?.isConnected ? element.querySelector('button') : null
}

/**
 * Узел фокуса Pagination (`focusTarget` плагина действия) — кнопка текущей
 * страницы: корень пагинации — `nav`, ориентир без своей остановки, а
 * остановки у неё — стрелки и страницы, и место пользователя в ряду —
 * текущая. `null` — текущей страницы нет в коллекции или в документе.
 */
export function currentPageOf(_root: Element, ctx: IPluginContext): Element | null {
	const owner = ctx.getInstance<IPagination>()
	const elements = ctx.get(TCollectionElements) ?? null
	// Движок приходит к плагинам без типа, как `engine:bound` плагину фокуса
	const engine: TPaginationCollection | null = elements?.engine ?? null

	return owner ? currentButtonOf(owner, engine, elements) : null
}
