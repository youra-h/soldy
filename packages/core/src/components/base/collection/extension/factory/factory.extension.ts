import type { IExtension, IExtensionContext } from '../types'
import { TBaseExtension } from '../base-extension.class'
import type { TFactoryEvents, IFactoryExtension } from './types'

/**
 * TFactoryExtension — фабрика элементов коллекции.
 *
 * Принимает конструктор элемента (например, `TTabItem`) и подписывается на
 * engine-событие `item:add:before`. Если в коллекцию добавляется сырое значение
 * (обычный объект с props, а не инстанс `itemCtor`), оно подменяется на
 * `new itemCtor(source)`.
 *
 * Позволяет прокидывать в коллекцию сырые данные (например, `:items="[...]"`)
 * и получать в engine полноценные объекты элементов.
 *
 * @example
 * ```ts
 * const col = new TCollection<ITabItem>({
 *     extensions: {
 *         factory: new TFactoryExtension<ITabItem>(TTabItem),
 *         batch: new TBatchExtension<ITabItem>(),
 *     },
 * })
 *
 * col.extensions.batch.update([{ text: 'Tab 1', value: 'tab1' }])
 * // в engine лежат инстансы TTabItem
 * ```
 */
export class TFactoryExtension<TItem extends object>
	extends TBaseExtension<TItem, TFactoryEvents>
	implements IExtension<TItem>, IFactoryExtension<TItem>
{
	readonly name = 'factory' as const

	constructor(private readonly itemCtor: new (source: any) => TItem) {
		super()
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		ctx.engine.events.on('item:add:before', (e) => {
			if (!(e.item instanceof this.itemCtor)) {
				e.item = new this.itemCtor(e.item)
			}
		})
	}

	create(source: any): TItem {
		return new this.itemCtor(source)
	}

	isSource(value: unknown): boolean {
		return !(value instanceof this.itemCtor)
	}
}
