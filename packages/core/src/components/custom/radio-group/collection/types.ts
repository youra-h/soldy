import type {
	TCollectionEngine,
	ICollectionProps,
	IBatchCollectionProps,
	IActivationCollectionItemProps,
	TActivationExtension,
	TBatchExtension,
	TFactoryExtension,
	TMetaExtension,
	TOrderExtension,
	TPlainExtension,
	TUniqueExtension,
} from '../../../base/collection'
import type { TRadioGroupExtension } from './extensions'
import type { IRadioGroup } from '../types'
import type { IRadioGroupItem, IRadioGroupItemProps } from '../item/types'

export type TRadioGroupCollectionExtensions<TItem extends IRadioGroupItem = IRadioGroupItem> = {
	factory: TFactoryExtension<TItem>
	unique: TUniqueExtension<TItem>
	meta: TMetaExtension<TItem>
	order: TOrderExtension<TItem>
	plain: TPlainExtension<TItem>
	batch: TBatchExtension<TItem>
	activation: TActivationExtension<TItem>
	/** Свойства группы на радио и связь `value` группы с активным радио. */
	radioGroup: TRadioGroupExtension<IRadioGroup, TItem>
}

export type TRadioGroupCollection = TCollectionEngine<
	IRadioGroupItem,
	TRadioGroupCollectionExtensions
>

/**
 * Движок, который можно передать конструктору фасада — любого уровня сборки
 * (`createEngine`, `createEngineActivation`, `createEngineRadioGroup`). Фасад
 * сам дополняет недостающее через `resolveEngine`, поэтому оба параметра —
 * `any`: движок инвариантен по ним через `engine:create` (см.
 * `TTabsCollectionFacadeEngine`). Точный тип — там, где движок собирается.
 */
export type TRadioGroupCollectionFacadeEngine = TCollectionEngine<any, any>

/**
 * Owner-level props коллекции RadioGroup: готовый движок снаружи и состав
 * (`items`, `trackBy`).
 */
export interface IRadioGroupCollectionProps<
	TItemProps = IRadioGroupItemProps,
	TItem = IRadioGroupItem,
>
	extends
		ICollectionProps<TRadioGroupCollectionFacadeEngine>,
		IBatchCollectionProps<TItemProps, TItem> {}

/** Item-level props радио: отмечено ли оно (активность в коллекции). */
export interface IRadioGroupCollectionItemProps extends IActivationCollectionItemProps {}
