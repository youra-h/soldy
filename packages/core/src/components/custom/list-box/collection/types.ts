import { TCollectionEngine } from '../../../base/collection'
import type {
	ICollectionProps,
	IBatchCollectionProps,
	ISelectionCollectionItemProps,
	ISelectionCollectionProps,
	ISelectionItemExtension,
	IOrderItemExtension,
	TFactoryExtension,
	TOrderExtension,
	TPlainExtension,
	TUniqueExtension,
	TMetaExtension,
	TBatchExtension,
	TDrawEvents,
	TDrawExtension,
	TSelectionCollectionFacadeEvents,
	TSelectionExtension,
	TValueSelectionExtension,
} from '../../../base/collection'
import type { IListBoxItemExtension } from './extensions/list-box/item/types'
import { TListBoxExtension } from './extensions'
import type { TListBoxEngineOptions } from './extensions'
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
	/** Что список рисует из показанных элементов: все или окно с распорками. */
	draw: TDrawExtension<TItem>
	list: TListBoxExtension<IListBox, TItem>
}

export type TListBoxCollection = TCollectionEngine<
	IListBoxItem,
	TListBoxCollectionExtensions,
	TListBoxEngineOptions
>

/**
 * Движок, который можно передать конструктору фасада — любого уровня сборки
 * (`createEngine`, `createEngineSelection`, `createEngineListBox`…). Фасад
 * сам дополняет недостающее через `completeEngine` (см. `create/internal.ts`),
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
 * `listBoxExtensions`), а не там, где его только принимают.
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
	extends
		ICollectionProps<TCollection>,
		IBatchCollectionProps<TItemProps, TItem>,
		ISelectionCollectionProps {}

/** Item-level props элемента: выбранность. */
export interface IListBoxCollectionItemProps extends ISelectionCollectionItemProps {}

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
 */
export type TListBoxItemCollectionFacadeEvents = TSelectionItemFacadeEvents &
	TListBoxItemEventsExtension

/** События фасада списка: база выбора плюс карта рисования (`draw`). */
export type TListBoxCollectionFacadeEvents = TSelectionCollectionFacadeEvents<IListBoxItem> &
	TDrawEvents<IListBoxItem>
