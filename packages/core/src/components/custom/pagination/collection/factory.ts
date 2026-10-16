import { TPaginationExtension } from './extensions'
import { activationExtensions } from '../../../base/collection/create/internal'
import type { TExtensionSet } from '../../../base/collection/create/internal'
import TPaginationItem from '../item/item.class'
import type { IPaginationItem } from '../item/types'

/**
 * Детали рабочей коллекции пагинации — по порядку установки. См. `tabsExtensions`.
 *
 * `pagination` — после `activation`: он подписывается на неё в `install`.
 */
export function paginationExtensions(): TExtensionSet<IPaginationItem> {
	return {
		...activationExtensions<IPaginationItem>(TPaginationItem),
		// Страницы окна, связь `value` с текущей страницей и окно с пропусками.
		// Без него в коллекции не было бы ни одной страницы: их кладёт оно
		pagination: () => new TPaginationExtension(),
	}
}
