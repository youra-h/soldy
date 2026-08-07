import type { IExtension, IExtensionContext } from '../types'
import type { TOrderEvents, IOrderExtension } from './types'
import { TEvented } from '@soldy/core'
import type { IItemExtensionCtor } from '../types'
import { TOrderItemExtension, type IOrderItemExtension } from './item'

/**
 * TOrderExtension — расширение-наблюдатель за порядком элементов в коллекции.
 *
 * Не мутирует данные, только слушает события engine и оповещает подписчиков
 * об изменении порядка. Используется для DnD-сортировки и других сценариев,
 * где важен порядок элементов.
 *
 * @template TItem — тип элемента коллекции (пользователь может расширить)
 */
export class TOrderExtension<TItem extends object = any> implements IExtension<TItem>, IOrderExtension<TItem> {
	readonly name = 'order'
	readonly events = new TEvented<TOrderEvents>()

	private _ctx!: IExtensionContext<TItem>
	private readonly _itemCtor?: IItemExtensionCtor<TItem, TOrderExtension<TItem>, IOrderItemExtension<TItem>>

	constructor(options?: { itemCtor?: IItemExtensionCtor<TItem, TOrderExtension<TItem>, IOrderItemExtension<TItem>> }) {
		this._itemCtor = options?.itemCtor
	}

	/** Создаёт stateless-делегат для конкретного элемента */
	createItem(owner: TItem): IOrderItemExtension<TItem> {
		const Ctor = this._itemCtor ?? TOrderItemExtension

		return new Ctor(owner, this)
	}

	install(ctx: IExtensionContext<TItem>): void {
		this._ctx = ctx

		ctx.engine.events.on('change:items', () => {
			this.events.emit('change:order')
		})

		ctx.engine.events.on('item:moved', () => {
			this.events.emit('change:order')
		})
	}

	/**
	 * Возвращает актуальный индекс элемента в коллекции.
	 */
	getItemOrder(item: TItem): number {
		return this._ctx.engine.indexOf(item)
	}
}
