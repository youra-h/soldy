import type { IExtension, IExtensionContext, IItemExtensionCtor } from '../../../../base/collection'
import { TBaseOwnerItemExtension } from '../../../../base/collection'
import type { IListItem } from '../../list-item/types'
import type { IList } from '../../types'
import type { TListExtensionEvents, IListExtensionOptions, IListExtension } from './types'
import { TListItemExtension, type IListItemExtension } from './item'
import type { TComponentSize, TComponentVariant, TValuePayload } from '../../../../../common'

/**
 * TListExtension — расширение коллекции для управления элементами списка.
 *
 * Получает ссылку на инстанс TList через options.owner и автоматически
 * пробрасывает свойства (disabled, size, variant, wordWrap) на добавляемые элементы,
 * а также подписывается на изменения владельца для синхронизации.
 *
 * @template TOwner   — тип владельца (TList или наследник)
 * @template TItem    — тип элемента (IListItem или наследник)
 * @template TItemExt — тип item-адаптера (переопределяется в наследниках)
 */
export class TListExtension<
	TOwner extends IList<any, any, any> = IList<any, any, any>,
	TItem extends IListItem = IListItem,
	TItemExt extends IListItemExtension<TItem> = IListItemExtension<TItem>,
>
	extends TBaseOwnerItemExtension<TItem, TItemExt, TListExtensionEvents>
	implements IExtension<TItem>, IListExtension<TItem, TItemExt>
{
	readonly name: string = 'list'

	/**
	 * Ссылка на инстанс TList, переданная через конструктор.
	 * Используется для проброса свойств на элементы и подписки на события.
	 * @protected
	 * @readonly
	 * @type {TOwner}
	 */
	protected readonly _owner: TOwner

	constructor(
		options: IListExtensionOptions<TOwner, TItem, TItemExt>,
		itemCtor: IItemExtensionCtor<
			TItem,
			any,
			TItemExt
		> = TListItemExtension as unknown as IItemExtensionCtor<TItem, any, TItemExt>,
	) {
		super(itemCtor, options)

		this._owner = options.owner
	}

	/** Глобальный wordWrap с инстанса TList. */
	get wordWrap(): boolean {
		return this._owner.wordWrap
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		// При добавлении элемента — пробрасываем текущие свойства владельца
		ctx.engine.events.on('item:added', (e) => {
			e.item.disabled = this._owner.disabled
			e.item.size = this._owner.size
			e.item.variant = this._owner.variant
		})

		// При изменении свойств владельца — пробрасываем на все элементы
		this._owner.events.on('change:disabled', (value: boolean) => {
			ctx.engine.forEach((item) => {
				item.disabled = value
			})
		})

		this._owner.events.on('change:size', (payload: TValuePayload<TComponentSize>) => {
			ctx.engine.forEach((item) => {
				item.size = payload.newValue
			})
		})

		this._owner.events.on('change:variant', (payload: TValuePayload<TComponentVariant>) => {
			ctx.engine.forEach((item) => {
				item.variant = payload.newValue
			})
		})

		// Глобальный wordWrap: пробрасываем change:wordWrap в item-адаптеры
		// (TListItemExtension резолвит wordWrap из item ?? owner).
		this.events.relay(this._owner.events, ['change:wordWrap'])
	}
}
