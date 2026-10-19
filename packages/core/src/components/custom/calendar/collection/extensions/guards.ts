import type { TNeighbours } from '../../../../base/collection/engine/extension/neighbours'
import type { ICalendarFocusExtension } from './focus/types'
import type { ICalendarSelectionExtension } from './selection/types'
import type { ICalendarViewExtension } from './view/types'

/**
 * Соседи по коллекции календаря.
 *
 * Расширения календаря опираются друг на друга: выбор ставит фокус на
 * выбранную дату, фокус просит вид показать свой месяц, вид берёт у выбора
 * `aria-multiselectable`. Контекст расширения знает соседей только как
 * `IExtension`, поэтому соседа узнают проверкой его контракта, а не
 * приведением типа. Классы соседей не импортируются: так расширения не
 * замыкают друг на друга циклом модулей.
 *
 * Искать можно в любой коллекции — у чужой охранник отдаёт `undefined`,
 * поэтому тип её элементов не важен, а контракт — календаря.
 */

function isView(ext: object): ext is ICalendarViewExtension {
	return 'reveal' in ext && 'grids' in ext
}

function isSelection(ext: object): ext is ICalendarSelectionExtension {
	return 'chooseDate' in ext && 'multiselectable' in ext
}

function isFocus(ext: object): ext is ICalendarFocusExtension {
	return 'focusDate' in ext && 'focusedDate' in ext
}

/** Расширение вида, если оно есть в коллекции. */
export function viewOf<TItem extends object>(
	neighbours: TNeighbours<TItem> | null | undefined,
): ICalendarViewExtension | undefined {
	const ext = neighbours?.extensions.view

	return ext && isView(ext) ? ext : undefined
}

/**
 * Выбор дат, если он есть в коллекции. Под тем же именем `selection` у других
 * коллекций — стандартный выбор элементов, другой контракт: у них охранник
 * отдаёт `undefined`.
 */
export function selectionOf<TItem extends object>(
	neighbours: TNeighbours<TItem> | null | undefined,
): ICalendarSelectionExtension | undefined {
	const ext = neighbours?.extensions.selection

	return ext && isSelection(ext) ? ext : undefined
}

/** Расширение фокуса, если оно есть в коллекции. */
export function focusOf<TItem extends object>(
	neighbours: TNeighbours<TItem> | null | undefined,
): ICalendarFocusExtension | undefined {
	const ext = neighbours?.extensions.focus

	return ext && isFocus(ext) ? ext : undefined
}
