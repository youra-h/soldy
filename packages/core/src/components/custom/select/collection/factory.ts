import { TValueSelectionExtension, TFilterExtension } from '../../../base/collection'
import { selectionExtensions, assembleEngine } from '../../../base/collection/create/internal'
import type { TBaseExtensionSet, TOwnerExtensionSet } from '../../../base/collection/create/internal'
import TSelectItem from '../item/item.class'
import type { ISelectItem } from '../item/types'
import type { ISelect } from '../types'
import { TSelectExtension, TSelectTagsExtension } from './extensions'
import type { TSelectCollection } from './types'

/**
 * Состав коллекции Select — объявлением, а не функцией сборки.
 *
 * Разделён надвое, потому что владелец есть не всегда: коллекцию можно собрать
 * снаружи (`createEngine`) и передать компоненту, а инстанс `TSelect` появится
 * только там.
 *
 * `activation` нет: у списка выбора нет «активного» элемента отдельно от
 * выбранного. Подсветку при навигации с клавиатуры ведёт `TListItemPlugin`,
 * а не коллекция — она визуальна и живёт только пока панель открыта.
 *
 * `filter` — здесь, а не в `baseExtensions()`: не каждой коллекции нужен отбор,
 * а лишнее расширение — это лишние подписки на каждом Tabs и Accordion. По
 * какому полю сравнивать, ставит `TSelectExtension`: сам `filter` про `text`
 * ничего не знает.
 */
export const SELECT_EXTENSIONS = (): TBaseExtensionSet<ISelectItem> => ({
	...selectionExtensions<ISelectItem>(TSelectItem),
	filter: () => new TFilterExtension<ISelectItem>(),
})

/**
 * То, чему нужен инстанс компонента.
 *
 * Порядок объявления — порядок установки (см. `attachEngine` в
 * `create/internal.ts`): кто ищет соседа в своём `install`, обязан стоять
 * после него. `select` пишет `owner.field.placeholder` по составу тегов
 * (`ctx.extensions.tags.hasTags`), поэтому `tags` идёт первым.
 */
export const SELECT_OWNER_EXTENSIONS: TOwnerExtensionSet<ISelectItem, ISelect> = {
	// Связь `value` ↔ выбор — то же расширение, что у ListBox. Раньше это было
	// написано внутри `TSelectExtension`, пока Select оставался единственным
	// списком со значением
	value: (owner) => new TValueSelectionExtension({ owner }),
	tags: (owner) => new TSelectTagsExtension({ owner }),
	select: (owner) => new TSelectExtension({ owner }),
}

/**
 * Полная коллекция Select. Внутренняя: наружу ведёт `createEngineSelect`,
 * который требует владельца явно.
 */
export const SelectFactory = (owner: ISelect): TSelectCollection => {
	const engine = assembleEngine<ISelectItem>(SELECT_EXTENSIONS())

	for (const build of Object.values(SELECT_OWNER_EXTENSIONS)) engine.use(build(owner))

	return engine as TSelectCollection
}
