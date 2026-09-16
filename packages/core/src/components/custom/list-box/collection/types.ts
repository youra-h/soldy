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
import type { IListBoxItemExtension } from './extensions/list-box/item/types'
import { TListBoxExtension } from './extensions'
import type { IListBox } from '../types'
import type { IListBoxItem, IListBoxItemProps } from '../item/types'
import type { TSelectionItemFacadeEvents } from '../../../base/collection'
import type { TListBoxItemEventsExtension } from './extensions/list-box/item/types'

export type TListBoxCollectionExtensions<TItem extends IListBoxItem = IListBoxItem> = {
	factory: TFactoryExtension<TItem>
	unique: TUniqueExtension<TItem>
	meta: TMetaExtension<TItem>
	order: TOrderExtension<TItem>
	plain: TPlainExtension<TItem>
	batch: TBatchExtension<TItem>
	selection: TSelectionExtension<TItem>
	/** Связь `value` списка с выбором коллекции — в обе стороны. */
	value: TValueSelectionExtension<any, TItem>
	list: TListBoxExtension<IListBox, TItem>
}

export type TListBoxCollection = TCollectionEngine<IListBoxItem, TListBoxCollectionExtensions>

/**
 * Движок, который можно передать конструктору фасада — любого уровня сборки
 * (`createEngine`, `createEngineSelection`, `createEngineListBox`…). Фасад
 * сам дополняет недостающее через `resolveEngine` (см. `create/internal.ts`),
 * поэтому годится любой уровень, включая уровень 1, где ни `TListBoxItem`,
 * ни владельческие расширения ещё не собраны.
 *
 * Оба параметра — `any`, а не «уровень 1» или «частичный набор»: у
 * `TCollectionEngine.events` есть `engine:create`, куда сам движок передаётся
 * аргументом обработчика — `TEvented` инвариантен по карте событий (см.
 * AGENTS.md, «События item-адаптера»), и через этот параметр инвариантность
 * протаскивает оба параметра движка целиком. Любой конкретный тип здесь
 * (в том числе `Partial<TListBoxCollectionExtensions>`) сделал бы совместимым
 * только движок с буквально таким же типом — не более раннего уровня и не
 * `TListBoxCollection`, который собирает `createEngineListBox`. Точность
 * остаётся там, где движок инстанцируется (`TListBoxCollection`,
 * `ListBoxFactory`), а не там, где его только принимают.
 */
export type TListBoxCollectionFacadeEngine = TCollectionEngine<any, any>

/**
 * Owner-level props коллекции: состав + режим выбора.
 *
 * `TCollection` по умолчанию — `TListBoxCollectionFacadeEngine`, а не
 * `TListBoxCollection`: `engine` принимает движок любого уровня сборки, тот
 * же контраст, что и у конструктора фасада (см. `TListBoxCollectionFacadeEngine`
 * выше). Параметр остаётся настраиваемым для мест, которым нужна точность.
 */
export interface IListBoxCollectionProps<
	TItemProps = IListBoxItemProps,
	TItem = IListBoxItem,
	TCollection = TListBoxCollectionFacadeEngine,
>
	extends ICollectionProps<TCollection>,
		IBatchCollectionProps<TItemProps, TItem>,
		ISelectionCollectionProps {}

/** Item-level props элемента: выбранность. */
export interface IListBoxCollectionItemProps extends ISelectionCollectionItemProps {}

/** Опции конструктора фасада коллекции. */
export type TListBoxCollectionFacadeOptions<
	TItem extends IListBoxItem = IListBoxItem,
	TExtensions extends Record<string, IExtension<any>> = TListBoxCollectionExtensions,
> = TCollectionFacadeOptions<TCollectionEngine<TItem, TExtensions>, IListBox> & {
	/** Фабрика движка коллекции — переопределяется наследником. */
	factory?: (owner: IListBox) => TCollectionEngine<TItem, TExtensions>
}

/**
 * Item-адаптеры коллекции: выбор, порядок и делегат списка.
 *
 * Используется фасадом элемента для типизированного доступа к `adapters`.
 */
export type TListBoxAdapters<TItem extends IListBoxItem = IListBoxItem> = {
	selection: ISelectionItemExtension<TItem>
	order: IOrderItemExtension<TItem>
	list: IListBoxItemExtension<TItem>
}

/**
 * События фасада элемента списка: набор базы плюс карта адаптера `list`.
 *
 * У самого `TListBoxCollectionFacade` карты нет — сверх базы он не релеит
 * ничего, и дефолт `TSelectionCollectionFacade` уже точен.
 */
export type TListBoxItemCollectionFacadeEvents = TSelectionItemFacadeEvents &
	TListBoxItemEventsExtension
