import {
	TValueSelectionExtension,
	TFilterExtension,
	TDrawExtension,
	TPositionInSetExtension,
} from '../../../base/collection'
import { selectionExtensions } from '../../../base/collection/create/internal'
import type { TExtensionSet } from '../../../base/collection/create/internal'
import TSelectItem from '../item/item.class'
import type { ISelectItem } from '../item/types'
import type { ISelect } from '../types'
import { TSelectExtension, TSelectTagsExtension } from './extensions'

/**
 * Детали рабочей коллекции Select — по порядку установки. См. `tabsExtensions`.
 *
 * `activation` нет: у списка выбора нет «активного» элемента отдельно от
 * выбранного. Подсветку при навигации с клавиатуры ведёт `TListItemPlugin`,
 * а не коллекция — она визуальна и живёт только пока панель открыта.
 *
 * `filter` — здесь, а не в `baseExtensions()`: не каждой коллекции нужен отбор,
 * а лишнее расширение — это лишние подписки на каждом Tabs и Accordion. По
 * какому полю сравнивать, ставит `TSelectExtension`: сам `filter` про `text`
 * ничего не знает.
 *
 * `draw` — что список панели рисует из показанных опций: без окна все, а окно
 * ему ставит обёртка `Virtual`, как у ListBox. Сразу за ним `positionInSet`:
 * место опции в наборе (`aria-posinset`) пишется по нарисованному. Оба — за
 * `filter`, по порядку чтения: отбор сужает показанные, рисование берёт из них.
 *
 * `select` пишет `owner.field.placeholder` по составу тегов
 * (`ctx.extensions.tags.hasTags`), поэтому `tags` стоит раньше.
 */
export function selectExtensions(): TExtensionSet<ISelectItem> {
	return {
		...selectionExtensions<ISelectItem>(TSelectItem),
		filter: () => new TFilterExtension<ISelectItem>(),
		draw: () => new TDrawExtension<ISelectItem>(),
		positionInSet: () => new TPositionInSetExtension<ISelectItem>(),
		// Связь `value` ↔ выбор — то же расширение, что у ListBox
		value: () => new TValueSelectionExtension<ISelect, ISelectItem>(),
		tags: () => new TSelectTagsExtension(),
		select: () => new TSelectExtension(),
	}
}
