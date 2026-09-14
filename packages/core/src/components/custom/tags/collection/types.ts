import { TCollectionEngine } from '../../../base/collection'
import type {
	ICollectionProps,
	IBatchCollectionProps,
	ISelectionCollectionItemProps,
	ISelectionCollectionProps,
	TCollectionFacadeOptions,
	IExtension,
	ISelectionItemExtension,
	IOrderItemExtension,
	TFactoryExtension,
	TOrderExtension,
	TPlainExtension,
	TUniqueExtension,
	TMetaExtension,
	TBatchExtension,
	TSelectionExtension,
	TValueSelectionExtension,
} from '../../../base/collection'
import type { ITagsItemExtension } from './extensions/tags/item/types'
import { TTagsExtension } from './extensions'
import type { ITags } from '../types'
import type { ITagsItem, ITagsItemProps } from '../item/types'

export type TTagsCollectionExtensions<TItem extends ITagsItem = ITagsItem> = {
	factory: TFactoryExtension<TItem>
	unique: TUniqueExtension<TItem>
	meta: TMetaExtension<TItem>
	order: TOrderExtension<TItem>
	plain: TPlainExtension<TItem>
	batch: TBatchExtension<TItem>
	selection: TSelectionExtension<TItem>
	/** Связь `value` набора с выбором коллекции — в обе стороны. */
	value: TValueSelectionExtension<any, TItem>
	tags: TTagsExtension<ITags, TItem>
}

export type TTagsCollection = TCollectionEngine<ITagsItem, TTagsCollectionExtensions>

/**
 * Движок, который можно передать конструктору фасада — любого уровня сборки
 * (`createEngine`, `createEngineSelection`, `createEngineTags`…). Фасад сам
 * дополняет недостающее через `resolveEngine` (см. `create/internal.ts`),
 * поэтому годится любой уровень, включая уровень 1, где ни `TTagsItem`, ни
 * владельческие расширения ещё не собраны.
 *
 * Оба параметра — `any`, а не «уровень 1» или «частичный набор»: у
 * `TCollectionEngine.events` есть `engine:create`, куда сам движок передаётся
 * аргументом обработчика — `TEvented` инвариантен по карте событий (см.
 * AGENTS.md, «События item-адаптера»), и через этот параметр инвариантность
 * протаскивает оба параметра движка целиком. Любой конкретный тип здесь
 * (в том числе `Partial<TTagsCollectionExtensions>`) сделал бы совместимым
 * только движок с буквально таким же типом — не более раннего уровня и не
 * `TTagsCollection`, который собирает `createEngineTags`. Точность остаётся
 * там, где движок инстанцируется (`TTagsCollection`, `TagsFactory`), а не
 * там, где его только принимают.
 */
export type TTagsCollectionFacadeEngine = TCollectionEngine<any, any>

/**
 * Owner-level props коллекции: состав + режим выбора (по умолчанию `none`).
 *
 * `TCollection` по умолчанию — `TTagsCollectionFacadeEngine`, а не
 * `TTagsCollection`: `engine` принимает движок любого уровня сборки, тот же
 * контраст, что и у конструктора фасада (см. `TTagsCollectionFacadeEngine`
 * выше). Параметр остаётся настраиваемым для мест, которым нужна точность.
 */
export interface ITagsCollectionProps<
	TItemProps = ITagsItemProps,
	TItem = ITagsItem,
	TCollection = TTagsCollectionFacadeEngine,
>
	extends ICollectionProps<TCollection>,
		IBatchCollectionProps<TItemProps, TItem>,
		ISelectionCollectionProps {}

/** Item-level props элемента: выбранность. */
export interface ITagsCollectionItemProps extends ISelectionCollectionItemProps {}

/** Опции конструктора фасада коллекции. */
export type TTagsCollectionFacadeOptions<
	TItem extends ITagsItem = ITagsItem,
	TExtensions extends Record<string, IExtension<any>> = TTagsCollectionExtensions,
> = TCollectionFacadeOptions<TCollectionEngine<TItem, TExtensions>, ITags> & {
	/** Фабрика движка коллекции — переопределяется наследником. */
	factory?: (owner: ITags) => TCollectionEngine<TItem, TExtensions>
}

/**
 * Item-адаптеры коллекции: выбор, порядок и делегат тегов.
 *
 * Используется фасадом элемента для типизированного доступа к `adapters`.
 */
export type TTagsAdapters<TItem extends ITagsItem = ITagsItem> = {
	selection: ISelectionItemExtension<TItem>
	order: IOrderItemExtension<TItem>
	tags: ITagsItemExtension<TItem>
}
