import type {
	IItemExtension,
	IItemExtensionCtor,
	IExtensionItems,
	IBaseOwnerItemExtensionOptions,
} from './types'
import { TBaseExtension } from './base-extension.class'

/**
 * Абстрактное расширение с поддержкой item-адаптеров.
 * Устраняет повторяющийся код: `_itemCtor`, `createItem()`.
 *
 * @template TItem    — тип элемента коллекции
 * @template TItemExt — конкретный тип item-адаптера
 * @template TEvents  — тип событий расширения
 */
export abstract class TBaseOwnerItemExtension<
	TItem extends object,
	TItemExt extends IItemExtension<TItem>,
	TEvents extends Record<string, (...args: any) => any>,
>
	extends TBaseExtension<TItem, TEvents>
	implements IExtensionItems<TItem, TItemExt>
{
	private readonly _itemCtor?: IItemExtensionCtor<TItem, any, TItemExt>

	constructor(
		private readonly _defaultItemCtor: IItemExtensionCtor<TItem, any, TItemExt>,
		options?: IBaseOwnerItemExtensionOptions<TItem, TItemExt>,
	) {
		super()

		this._itemCtor = options?.itemCtor
	}

	/** @inheritdoc */
	createItem(owner: TItem): TItemExt {
		const Ctor = this._itemCtor ?? this._defaultItemCtor

		return new Ctor(owner, this)
	}
}
