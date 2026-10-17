import type {
	TCollectionEngine,
	ICollectionProps,
	IBatchCollectionProps,
	ISelectionCollectionItemProps,
	ISelectionItemExtension,
	IOrderItemExtension,
	TFactoryExtension,
	TOrderExtension,
	TPlainExtension,
	TUniqueExtension,
	TMetaExtension,
	TBatchExtension,
	TSelectionCollectionFacadeEvents,
	TSelectionExtension,
	TSelectionItemFacadeEvents,
} from '../../../base/collection'
import type { IMenuItemExtension, TMenuItemEventsExtension } from './extensions/menu/item/types'
import type { TMenuExtension, TMenuEngineOptions, TMenuExtensionEvents } from './extensions'
import type { IMenu } from '../types'
import type { IMenuItem, IMenuItemProps } from '../item/types'

export type TMenuCollectionExtensions<TItem extends IMenuItem = IMenuItem> = {
	factory: TFactoryExtension<TItem>
	unique: TUniqueExtension<TItem>
	meta: TMetaExtension<TItem>
	order: TOrderExtension<TItem>
	plain: TPlainExtension<TItem>
	batch: TBatchExtension<TItem>
	/** Отметки флажков — выбор в режиме `multiple`. */
	selection: TSelectionExtension<TItem>
	menu: TMenuExtension<IMenu, TItem>
}

export type TMenuCollection = TCollectionEngine<
	IMenuItem,
	TMenuCollectionExtensions,
	TMenuEngineOptions
>

/**
 * Движок, который можно передать конструктору фасада — любого уровня сборки
 * (`createEngine`, `createEngineSelection`, `createEngineMenu`…). Фасад сам
 * дополняет недостающее через `completeEngine`. Оба параметра — `any` по той
 * же причине, что у `TListBoxCollectionFacadeEngine`: движок инвариантен по
 * карте событий через `engine:create`.
 */
export type TMenuCollectionFacadeEngine = TCollectionEngine<any, any>

/**
 * Owner-level props коллекции меню: состав.
 *
 * Режима выбора среди них нет: отметки флажков независимы, и режим у меню
 * всегда `multiple` — его ставит коллекция, а не разметка.
 */
export interface IMenuCollectionProps<
	TItemProps = IMenuItemProps,
	TItem = IMenuItem,
	TCollection = TMenuCollectionFacadeEngine,
>
	extends ICollectionProps<TCollection>, IBatchCollectionProps<TItemProps, TItem> {}

/** Item-level props флажка: отметка — выбор коллекции. */
export interface IMenuCollectionCheckboxItemProps extends ISelectionCollectionItemProps {}

/**
 * Item-адаптеры коллекции: выбор, порядок и делегат меню.
 *
 * Используется фасадом элемента для типизированного доступа к `adapters`.
 */
export type TMenuAdapters<TItem extends IMenuItem = IMenuItem> = {
	selection: ISelectionItemExtension<TItem>
	order: IOrderItemExtension<TItem>
	menu: IMenuItemExtension<TItem>
}

/** События фасада меню: база выбора плюс карта расширения `menu` (`choose`). */
export type TMenuCollectionFacadeEvents = TSelectionCollectionFacadeEvents<IMenuItem> &
	TMenuExtensionEvents

/** События фасада пункта: набор базы плюс карта адаптера `menu`. */
export type TMenuItemCollectionFacadeEvents = TSelectionItemFacadeEvents & TMenuItemEventsExtension
