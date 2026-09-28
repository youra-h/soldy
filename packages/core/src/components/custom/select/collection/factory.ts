import { TValueSelectionExtension, TFilterExtension } from '../../../base/collection'
import { selectionExtensions } from '../../../base/collection/create/internal'
import type { TExtensionSet } from '../../../base/collection/create/internal'
import TSelectItem from '../item/item.class'
import type { ISelectItem } from '../item/types'
import type { ISelect } from '../types'
import { TSelectExtension, TSelectTagsExtension } from './extensions'

/**
 * Расширения коллекции Select — всё, без чего компонент не работает.
 * Пришедший снаружи движок компонент дособирает этим набором.
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
 * Порядок объявления — порядок установки (см. `completeEngine` в
 * `create/internal.ts`): кто ищет соседа в своём `install`, обязан стоять
 * после него. `select` пишет `owner.field.placeholder` по составу тегов
 * (`ctx.extensions.tags.hasTags`), поэтому `tags` идёт первым.
 */
export const SELECT_EXTENSIONS = (): TExtensionSet<ISelectItem, ISelect> => ({
	...selectionExtensions<ISelectItem>(TSelectItem),
	filter: () => new TFilterExtension<ISelectItem>(),
	// Связь `value` ↔ выбор — то же расширение, что у ListBox. Раньше это было
	// написано внутри `TSelectExtension`, пока Select оставался единственным
	// списком со значением
	value: (owner) => new TValueSelectionExtension({ owner }),
	tags: (owner) => new TSelectTagsExtension({ owner }),
	select: (owner) => new TSelectExtension({ owner }),
})
