import type { IExtension, IExtensionContext, IBaseItemExtensionOptions } from '../types'
import type { TOrderEvents, IOrderExtension } from './types'
import type { IOrderItemExtension } from './item'
import { TOrderItemExtension } from './item'
import { TBaseItemExtension } from '../base-item-extension.class'

/**
 * TOrderExtension — расширение-наблюдатель за порядком элементов в коллекции.
 *
 * Не мутирует данные, только слушает события engine и оповещает подписчиков
 * об изменении порядка. Используется для DnD-сортировки и других сценариев,
 * где важен порядок элементов.
 *
 * @template TItem — тип элемента коллекции (пользователь может расширить)
 */
export class TOrderExtension<TItem extends object = any>
	extends TBaseItemExtension<TItem, IOrderItemExtension<TItem>, TOrderEvents>
	implements IExtension<TItem>, IOrderExtension<TItem>
{
	readonly name = 'order'

	constructor(options?: IBaseItemExtensionOptions<TItem, IOrderItemExtension<TItem>>) {
		super(TOrderItemExtension, options)
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

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
