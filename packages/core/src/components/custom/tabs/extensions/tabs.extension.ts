import type { IExtension, IExtensionContext } from '../../../base/collection'
import {
	TBaseOwnerItemExtension,
	TItemContextRegistry,
	TRemoveCommand,
} from '../../../base/collection'
import type { ITabItem } from '../tab-item/types'
import type { ITabs } from '../types'
import type { TTabsExtensionEvents, ITabsExtensionOptions, TTabsExtensions, ITabsExtension } from './types'
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
	implements IExtension<TItem>, ITabsExtension<TItem>
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
	private _itemRegistry!: TItemContextRegistry<TItem, TTabsExtensions<TItem>>

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

		// Реестр для доступа к item-адаптерам (кеширует через WeakMap)
		this._itemRegistry = new TItemContextRegistry(ctx.extensions as TTabsExtensions<TItem>)

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

	/**
	 * Проверяет, есть ли в коллекции хотя бы один элемент, который одновременно:
	 * - не disabled
	 * - visible
	 * - rendered
	 *
	 * @returns true, если есть хотя бы один такой элемент, иначе false
	 */
	hasEnabledTabs(): boolean {
		return this._ctx.engine.some((item) => !item.disabled && item.visible && item.rendered)
	}

	/**
	 * Закрыть таб (удалить элемент из коллекции).
	 * Если элемент не является closable — ничего не делает.
	 * @param item
	 * @returns true, если элемент был удалён, иначе false
	 */
	closeTab(item: ITabItem): boolean {
		const { tabs } = this._itemRegistry.get(item as TItem).adapters

		if (!tabs.closable) return false

		this.events.emit('item:close', item as TItem)

		this._ctx.execute(new TRemoveCommand(item as TItem))

		return true
	}
}
