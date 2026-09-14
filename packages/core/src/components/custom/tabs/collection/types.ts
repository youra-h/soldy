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
 */
export interface ITabsCollectionProps<TItemProps = ITabsItemProps, TItem = ITabsItem>
	extends ICollectionProps<TTabsCollection>, IBatchCollectionProps<TItemProps, TItem> {}

/**
 * Item-level props элемента Tabs.
 * Объединяет activation (active) + потенциальные item-расширения.
 */
export interface ITabsCollectionItemProps extends IActivationCollectionItemProps {}
