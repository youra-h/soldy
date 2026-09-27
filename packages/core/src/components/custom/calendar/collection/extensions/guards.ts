import type { IExtension, IExtensionContext } from '../../../../base/collection'
import type { ICalendarItem } from '../../item/types'
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
 */

type TExtensions = IExtensionContext<ICalendarItem>['extensions']

function isView(ext: IExtension<ICalendarItem>): ext is ICalendarViewExtension {
	return 'reveal' in ext && 'grids' in ext
}

function isSelection(ext: IExtension<ICalendarItem>): ext is ICalendarSelectionExtension {
	return 'chooseDate' in ext && 'multiselectable' in ext
}

function isFocus(ext: IExtension<ICalendarItem>): ext is ICalendarFocusExtension {
	return 'focusDate' in ext && 'focusedDate' in ext
}

/** Расширение вида, если оно есть в коллекции. */
export function viewOf(ctx: { extensions: TExtensions } | undefined) {
	const ext = ctx?.extensions.view

	return ext && isView(ext) ? ext : undefined
}

/** Расширение выбора, если оно есть в коллекции. */
export function selectionOf(ctx: { extensions: TExtensions } | undefined) {
	const ext = ctx?.extensions.selection

	return ext && isSelection(ext) ? ext : undefined
}

/** Расширение фокуса, если оно есть в коллекции. */
export function focusOf(ctx: { extensions: TExtensions } | undefined) {
	const ext = ctx?.extensions.focus

	return ext && isFocus(ext) ? ext : undefined
}
