import {
	TFactoryExtension,
	TCollectionEngine,
	TOrderExtension,
	TPlainExtension,
	TUniqueExtension,
	TMetaExtension,
	TBatchExtension,
	TSelectionExtension,
} from '../../../base/collection'
import type {
	ICollectionProps,
	IBatchCollectionProps,
	ISelectionCollectionItemProps,
	ISelectionCollectionProps,
} from '../../../base/collection'
import { TAccordionExtension, TAccordionContentExtension } from './extensions'
import type { IAccordion } from '../types'
import type { IAccordionItem } from '../item/types'
import type { IAccordionItemProps } from '../item/types'
import type {
	TSelectionCollectionFacadeEvents,
	TSelectionItemFacadeEvents,
} from '../../../base/collection'
import type { TAccordionExtensionEvents, TAccordionItemEventsExtension } from './extensions'

export type TAccordionCollectionExtensions<TItem extends IAccordionItem = IAccordionItem> = {
	factory: TFactoryExtension<TItem>
	unique: TUniqueExtension<TItem>
	meta: TMetaExtension<TItem>
	order: TOrderExtension<TItem>
	plain: TPlainExtension<TItem>
	batch: TBatchExtension<TItem>
	selection: TSelectionExtension<TItem>
	accordion: TAccordionExtension<IAccordion, TItem>
	content: TAccordionContentExtension<TItem>
}

export type TAccordionCollection = TCollectionEngine<IAccordionItem, TAccordionCollectionExtensions>

/**
 * Движок, который можно передать конструктору фасада — любого уровня сборки
 * (`createEngine`, `createEngineSelection`, `createEngineAccordion`…). Фасад
 * дособирает базовый набор и подключает к движку своего владельца (см.
 * `TCollectionComponent`), поэтому годится любой уровень, включая уровень 1,
 * где ни `TAccordionItem`, ни владельческие расширения ещё не собраны.
 *
 * Оба параметра — `any`, а не «уровень 1» или «частичный набор»: у
 * `TCollectionEngine.events` есть `engine:create`, куда сам движок передаётся
 * аргументом обработчика — `TEvented` инвариантен по карте событий (см.
 * AGENTS.md, «События item-адаптера»), и через этот параметр инвариантность
 * протаскивает оба параметра движка целиком. Любой конкретный тип здесь
 * (в том числе `Partial<TAccordionCollectionExtensions>`) сделал бы
 * совместимым только движок с буквально таким же типом — не более раннего
 * уровня и не `TAccordionCollection`, который собирает `createEngineAccordion`.
 * Точность остаётся там, где движок собирается (`TAccordionCollection`, `createEngineAccordion`), а не там, где его только принимают.
 */
export type TAccordionCollectionFacadeEngine = TCollectionEngine<any, any>

/**
 * Owner-level props коллекции Accordion.
 * Объединяет pass-through engine + batch (items, trackBy) + selection (mode).
 *
 * `engine` принимает движок любого уровня сборки, а не только
 * `TAccordionCollection` — тот же контраст, что и у конструктора фасада (см.
 * `TAccordionCollectionFacadeEngine` выше): компонент дособирает и подключает недостающее сам.
 */
export interface IAccordionCollectionProps<TItemProps = IAccordionItemProps, TItem = IAccordionItem>
	extends
		ICollectionProps<TAccordionCollectionFacadeEngine>,
		IBatchCollectionProps<TItemProps, TItem>,
		ISelectionCollectionProps {}

/**
 * Item-level props элемента Accordion.
 * Объединяет selection (selected) + потенциальные item-расширения.
 */
export interface IAccordionCollectionItemProps extends ISelectionCollectionItemProps {}

/** События фасада коллекции Accordion: набор `selection`-базы плюс карта расширения. */
export type TAccordionCollectionFacadeEvents = TSelectionCollectionFacadeEvents<IAccordionItem> &
	TAccordionExtensionEvents

/** События фасада элемента Accordion: набор базы плюс карта его адаптера. */
export type TAccordionItemCollectionFacadeEvents = TSelectionItemFacadeEvents &
	TAccordionItemEventsExtension
