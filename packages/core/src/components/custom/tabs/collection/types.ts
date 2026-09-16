import {
	TActivationExtension,
	TBatchExtension,
	TCollectionEngine,
	TOrderExtension,
	TPlainExtension,
	TFactoryExtension,
	TUniqueExtension,
	TMetaExtension,
} from '../../../base/collection'
import type {
	ICollectionProps,
	IBatchCollectionProps,
	IActivationCollectionItemProps,
} from '../../../base/collection'
import { TTabsExtension, TTabsContentExtension } from './extensions'
import type { ITabs } from '../types'
import type { ITabsItem } from '../item/types'
import type { ITabsItemProps } from '../item/types'
import type {
	TActivationEvents,
	TActivationItemEventsExtension,
	TBatchCollectionFacadeEvents,
	TOrderItemFacadeEvents,
} from '../../../base/collection'
import type { TTabsExtensionEvents, TTabsItemEventsExtension } from './extensions'
import type { TComponentEvents } from '../../../base/component'

export type TTabsCollectionExtensions<TItem extends ITabsItem = ITabsItem> = {
	factory: TFactoryExtension<TItem>
	unique: TUniqueExtension<TItem>
	meta: TMetaExtension<TItem>
	order: TOrderExtension<TItem>
	plain: TPlainExtension<TItem>
	batch: TBatchExtension<TItem>
	activation: TActivationExtension<TItem>
	tabs: TTabsExtension<ITabs, TItem>
	content: TTabsContentExtension<TItem>
}

export type TTabsCollection = TCollectionEngine<ITabsItem, TTabsCollectionExtensions>

/**
 * Движок, который можно передать конструктору фасада — любого уровня сборки
 * (`createEngine`, `createEngineActivation`, `createEngineTabs`…). Фасад сам
 * дополняет недостающее через `resolveEngine` (см. `create/internal.ts`),
 * поэтому годится любой уровень, включая уровень 1, где ни `TTabsItem`, ни
 * владельческие расширения ещё не собраны.
 *
 * Оба параметра — `any`, а не «уровень 1» или «частичный набор»: у
 * `TCollectionEngine.events` есть `engine:create`, куда сам движок передаётся
 * аргументом обработчика — `TEvented` инвариантен по карте событий (см.
 * AGENTS.md, «События item-адаптера»), и через этот параметр инвариантность
 * протаскивает оба параметра движка целиком. Любой конкретный тип здесь
 * (в том числе `Partial<TTabsCollectionExtensions>`) сделал бы совместимым
 * только движок с буквально таким же типом — не более раннего уровня и не
 * `TTabsCollection`, который собирает `createEngineTabs`. Точность остаётся
 * там, где движок инстанцируется (`TTabsCollection`, `TabsFactory`), а не
 * там, где его только принимают.
 */
export type TTabsCollectionFacadeEngine = TCollectionEngine<any, any>

/**
 * Owner-level props коллекции Tabs.
 * Объединяет pass-through engine + batch (items, trackBy).
 *
 * `engine` принимает движок любого уровня сборки, а не только `TTabsCollection`
 * — тот же контраст, что и у конструктора фасада (см. `TTabsCollectionFacadeEngine`
 * выше): компонент доустанавливает недостающее сам через `resolveEngine`.
 */
export interface ITabsCollectionProps<TItemProps = ITabsItemProps, TItem = ITabsItem>
	extends
		ICollectionProps<TTabsCollectionFacadeEngine>,
		IBatchCollectionProps<TItemProps, TItem> {}

/**
 * Item-level props элемента Tabs.
 * Объединяет activation (active) + потенциальные item-расширения.
 */
export interface ITabsCollectionItemProps extends IActivationCollectionItemProps {}

/** События фасада коллекции табов: набор `batch`-базы плюс активация и закрытие. */
export type TTabsCollectionFacadeEvents = TBatchCollectionFacadeEvents<ITabsItem> &
	TActivationEvents<ITabsItem> &
	TTabsExtensionEvents

/** События фасада элемента таба: порядок из базы плюс активность и закрытие. */
export type TTabsItemCollectionFacadeEvents = TOrderItemFacadeEvents &
	TActivationItemEventsExtension &
	TTabsItemEventsExtension

/**
 * События фасада панели таба.
 *
 * База у панели — `TCollectionItemComponent`, и порядка у неё нет: панель не
 * член коллекции, она держит контекст **связанного** таба. Поэтому в карте
 * только то, что даёт адаптер активации, — поверх `TComponentEvents`:
 * констрейнт `TEvents` у базы — закрытая корневая карта.
 */
export type TTabsContentCollectionFacadeEvents = TComponentEvents & TActivationItemEventsExtension
