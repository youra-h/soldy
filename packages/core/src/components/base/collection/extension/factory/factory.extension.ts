import type { IExtension, IExtensionContext } from '../types'
import { TBaseExtension } from '../base-extension.class'
import type { TFactoryEvents, IFactoryExtension, IFactoryExtensionOptions } from './types'

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
 *         factory: new TFactoryExtension<ITabItem>({ itemCtor: TTabItem }),
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

	private readonly _itemCtor?: new (source: any) => TItem

	constructor(options: IFactoryExtensionOptions<TItem>) {
		super()

		this._itemCtor = options.itemCtor
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		if (!this._itemCtor) return

		const ctor = this._itemCtor

		ctx.engine.events.on('item:add:before', (e) => {
			if (!(e.item instanceof ctor)) {
				e.item = new ctor(e.item)
			}
		})
	}

	create(source: any): TItem {
		const ctor = this._itemCtor

		if (!ctor) {
			throw new Error('TFactoryExtension: ctor is not defined')
		}

		return new ctor(source)
	}

	isSource(value: unknown): boolean {
		const ctor = this._itemCtor

		if (!ctor) return true

		return !(value instanceof ctor)
	}
}
