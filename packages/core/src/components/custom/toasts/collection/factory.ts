import { TToastsExtension } from './extensions'
import { baseExtensions } from './../../../base/collection/create/internal'
import type { TExtensionSet } from './../../../base/collection/create/internal'
import TToastsItem from './../item/item.class'
import type { IToastsItem } from './../item/types'

/**
 * Детали рабочей коллекции Toasts — по порядку установки. См. `tabsExtensions`.
 *
 * Выбора и активации у тостов нет: коллекция стоит на базовом наборе, сверх
 * него — очередь (`toasts`).
 */
export function toastsExtensions(): TExtensionSet<IToastsItem> {
	return {
		...baseExtensions<IToastsItem>(TToastsItem),
		toasts: () => new TToastsExtension(),
	}
}
