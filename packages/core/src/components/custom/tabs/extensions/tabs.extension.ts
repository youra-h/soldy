import type { IExtension, IExtensionContext } from '../../../base/collection/extension'
import { TBaseOwnerItemExtension } from '../../../base/collection/extension'
import type { ITabItem } from '../tab-item/types'
import type { ITabs } from '../types'
import type { TTabsExtensionEvents, ITabsExtensionOptions } from './types'
import { TTabItemExtension, type ITabItemExtension } from './item'
import type { TComponentSize, TComponentVariant, TValuePayload } from '../../../../common'

/**
 * TTabsExtension — расширение коллекции для управления табами.
 *
 * Получает ссылку на инстанс TTabs через options.owner и автоматически
 * пробрасывает свойства (disabled, size, variant) на добавляемые элементы,
 * а также подписывается на изменения владельца для синхронизации.
 *
 * @template TOwner — тип владельца (TTabs или наследник)
 * @template TItem  — тип элемента таба (ITabItem или наследник)
 */
export class TTabsExtension<TOwner extends ITabs = ITabs, TItem extends ITabItem = ITabItem>
	extends TBaseOwnerItemExtension<TItem, ITabItemExtension<TItem>, TTabsExtensionEvents>
	implements IExtension<TItem>
{
	readonly name = 'tabs' as const

	/**
	 * Ссылка на инстанс TTabs, переданная через конструктор.
	 * Используется для проброса свойств на элементы и подписки на события.
	 * @private
	 * @readonly
	 * @type {TOwner}
	 */
	private readonly _owner: TOwner

	constructor(options: ITabsExtensionOptions<TOwner, TItem>) {
		super(TTabItemExtension, options)

		this._owner = options.owner
	}

	/** Глобальный closable с инстанса TTabs. */
	get closable(): boolean {
		return this._owner.closable
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		// При добавлении элемента — пробрасываем текущие свойства владельца
		ctx.engine.events.on('item:added', (item: TItem) => {
			item.disabled = this._owner.disabled
			item.size = this._owner.size
			item.variant = this._owner.variant
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
	}

	closeTab(item: ITabItem): boolean {
		if (!item.closable) return false

		;(this.events as TEvented<TTabsEvents>).emit('item:close', item)
		// this._collection.extensions.plain.remove(item)
		return true
	}
}
