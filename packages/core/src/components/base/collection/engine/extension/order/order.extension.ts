import type { IExtension, IExtensionContext, IBaseOwnerItemExtensionOptions } from '../types'
import type { TOrderEvents, IOrderExtension } from './types'
import type { IOrderItemExtension } from './item'
import { TOrderItemExtension } from './item'
import { TBaseOwnerItemExtension } from '../base-owner-item-extension.class'

/**
 * TOrderExtension — расширение-наблюдатель за порядком элементов в коллекции.
 *
 * Драйвер не знает о порядке (движок не заводит понятий под конкретное
 * расширение), поэтому факт «последовательность элементов сменилась»
 * расширение выводит само из `item:added`/`item:removed`/`item:moved`: любое
 * из них поднимает внутренний флаг. Обновление свойств элемента этих событий
 * не даёт, поэтому обновление порядок не трогает.
 *
 * Эмит откладывается до ближайшего `change:items`: в батче item-событий на
 * одну операцию может прийти несколько (вставка + удаление, две перестановки
 * и т. п.), а `change:items` драйвер шлёт ровно один раз на команду или на
 * весь `batch`. Флаг сбрасывается сразу после эмита, чтобы не протечь в
 * следующий, не связанный с порядком `change:items`.
 *
 * @template TItem — тип элемента коллекции (пользователь может расширить)
 */
export class TOrderExtension<TItem extends object = any>
	extends TBaseOwnerItemExtension<TItem, IOrderItemExtension<TItem>, TOrderEvents>
	implements IExtension<TItem>, IOrderExtension<TItem>
{
	readonly name = 'order' as const

	private _orderChanged = false

	constructor(options?: IBaseOwnerItemExtensionOptions<TItem, IOrderItemExtension<TItem>>) {
		super(TOrderItemExtension, options)
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		const markChanged = () => {
			this._orderChanged = true
		}

		ctx.driver.events.on('item:added', markChanged)
		ctx.driver.events.on('item:removed', markChanged)
		ctx.driver.events.on('item:moved', markChanged)

		ctx.driver.events.on('change:items', () => {
			if (!this._orderChanged) return

			this._orderChanged = false
			this.events.emit('change:order')
		})
	}

	/**
	 * Возвращает актуальный индекс элемента в коллекции.
	 */
	getItemOrder(item: TItem): number {
		return this._ctx.driver.valueOf().indexOf(item)
	}
}
