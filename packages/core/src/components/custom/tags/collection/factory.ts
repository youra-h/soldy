import { TTagsExtension, TTagsOverflowExtension } from './extensions'
import { TValueSelectionExtension } from './../../../base'
import { TSelectionExtension } from './../../../base/collection'
import { selectionExtensions } from './../../../base/collection/create/internal'
import type { TExtensionSet } from './../../../base/collection/create/internal'
import TTagsItem from './../item/item.class'
import type { ITagsItem } from './../item/types'
import type { ITags } from './../types'

/**
 * Детали рабочей коллекции Tags — по порядку установки. См. `tabsExtensions`.
 *
 * `selection.mode` по умолчанию `'none'`, а не `'single'` из
 * `TSelectionExtension`: набору тегов выделение не требуется, оно включается
 * явным `mode`, когда нужно (например, множественный выбор Select,
 * отображённый тегами). Дефолт самого `TSelectionExtension` не трогаем —
 * переопределение только здесь.
 */
export function tagsExtensions(): TExtensionSet<ITagsItem> {
	return {
		...selectionExtensions<ITagsItem>(TTagsItem),
		selection: () => {
			const selection = new TSelectionExtension<ITagsItem>()

			selection.mode = 'none'

			return selection
		},

		// Связь `value` ↔ выбор. Без неё проп `value` у Tags был бы объявлен, но мёртв
		value: () => new TValueSelectionExtension<ITags, ITagsItem>(),
		// Деление на ряд и панель: режим держит владелец, состав — коллекция.
		// До `tags`: остановку Tab тот считает по тегам ряда и слушает деление
		overflow: () => new TTagsOverflowExtension(),
		tags: () => new TTagsExtension(),
	}
}
