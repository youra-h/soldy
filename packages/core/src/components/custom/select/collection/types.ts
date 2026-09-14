import {
	TFactoryExtension,
	TCollectionEngine,
	TOrderExtension,
	TPlainExtension,
	TUniqueExtension,
	TMetaExtension,
	TBatchExtension,
	TSelectionExtension,
	TValueSelectionExtension,
	TFilterExtension,
} from '../../../base/collection'
import type {
	ICollectionProps,
	IBatchCollectionProps,
	ISelectionCollectionItemProps,
	ISelectionCollectionProps,
	TCollectionFacadeOptions,
	ISelectionItemExtension,
	IOrderItemExtension,
} from '../../../base/collection'
import { TSelectExtension, TSelectTagsExtension } from './extensions'
import type { ISelectItemExtension } from './extensions/select/item/types'
import type { ISelect } from '../types'
import type { ISelectItem, ISelectItemProps } from '../item/types'

export type TSelectCollectionExtensions<TItem extends ISelectItem = ISelectItem> = {
	factory: TFactoryExtension<TItem>
	unique: TUniqueExtension<TItem>
	meta: TMetaExtension<TItem>
	order: TOrderExtension<TItem>
	plain: TPlainExtension<TItem>
	batch: TBatchExtension<TItem>
	/** Отбор опций по тексту — сужает `shown`, хранилище не трогает. */
	filter: TFilterExtension<TItem>
	selection: TSelectionExtension<TItem>
	/** Связь `value` поля с выбором коллекции — то же расширение, что у List. */
	value: TValueSelectionExtension<any, TItem>
	select: TSelectExtension<ISelect, TItem>
	/** Теги в поле при множественном выборе — `null`, пока режим не `multiple`. */
	tags: TSelectTagsExtension<ISelect, TItem>
}

export type TSelectCollection = TCollectionEngine<ISelectItem, TSelectCollectionExtensions>

/**
 * Движок, который можно передать конструктору фасада — любого уровня сборки
 * (`createEngine`, `createEngineSelection`, `createEngineSelect`…). Фасад сам
 * дополняет недостающее через `resolveEngine` (см. `create/internal.ts`),
 * поэтому годится любой уровень, включая уровень 1, где ни `TSelectItem`, ни
 * владельческие расширения ещё не собраны.
 *
 * Оба параметра — `any`, а не «уровень 1» или «частичный набор»: у
 * `TCollectionEngine.events` есть `engine:create`, куда сам движок передаётся
 * аргументом обработчика — `TEvented` инвариантен по карте событий (см.
 * AGENTS.md, «События item-адаптера»), и через этот параметр инвариантность
 * протаскивает оба параметра движка целиком. Любой конкретный тип здесь
 * (в том числе `Partial<TSelectCollectionExtensions>`) сделал бы совместимым
 * только движок с буквально таким же типом — не более раннего уровня и не
 * `TSelectCollection`, который собирает `createEngineSelect`. Точность
 * остаётся там, где движок инстанцируется (`TSelectCollection`,
 * `SelectFactory`), а не там, где его только принимают.
 */
export type TSelectCollectionFacadeEngine = TCollectionEngine<any, any>

/**
 * Owner-level props коллекции Select.
 *
 * `mode` приходит из selection и служит переключателем множественного выбора:
 * отдельного пропа `multiple` нет намеренно — два имени для одного состояния
 * однажды разошлись бы.
 */
export interface ISelectCollectionProps<TItemProps = ISelectItemProps, TItem = ISelectItem>
	extends
		ICollectionProps<TSelectCollection>,
		IBatchCollectionProps<TItemProps, TItem>,
		ISelectionCollectionProps {}

/** Item-level props опции. */
export interface ISelectCollectionItemProps extends ISelectionCollectionItemProps {}

export type TSelectCollectionFacadeOptions = TCollectionFacadeOptions<
	TSelectCollectionFacadeEngine,
	ISelect<any, any, any>
>

/** Item-адаптеры коллекции Select — типизированный доступ к `context.adapters`. */
export type TSelectAdapters = {
	selection: ISelectionItemExtension<ISelectItem>
	order: IOrderItemExtension<ISelectItem>
	select: ISelectItemExtension<ISelectItem>
}
