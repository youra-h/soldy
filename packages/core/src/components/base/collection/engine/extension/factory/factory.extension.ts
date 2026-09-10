import type { IExtension, IExtensionContext } from '../types'
import { TBaseExtension } from '../base-extension.class'
import type { TFactoryEvents, IFactoryExtension, IFactoryExtensionOptions } from './types'

/**
 * TFactoryExtension — фабрика элементов коллекции.
 *
 * Принимает конструктор элемента (например, `TTabsItem`) и подписывается на
 * driver-событие `item:add:before`. Если в коллекцию добавляется сырое значение
 * (обычный объект с props, а не инстанс `itemCtor`), оно подменяется на
 * `new itemCtor(source)`.
 *
 * Позволяет прокидывать в коллекцию сырые данные (например, `:items="[...]"`)
 * и получать в driver полноценные объекты элементов.
 *
 * @example
 * ```ts
 * const col = new TCollectionEngine<ITabsItem>({
 *     extensions: {
 *         factory: new TFactoryExtension<ITabsItem>({ itemCtor: TTabsItem }),
 *         batch: new TBatchExtension<ITabsItem>(),
 *     },
 * })
 *
 * col.extensions.batch.update([{ text: 'Tab 1', value: 'tab1' }])
 * // в driver лежат инстансы TTabsItem
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

		ctx.driver.events.on('item:add:before', (e) => {
			if (e.item instanceof ctor) return

			const source = e.item as any
			const item = new ctor(source)

			e.item = item
		})

		this._convertExisting(ctx, ctor)
	}

	/**
	 * Догоняет то, что уже лежит в коллекции.
	 *
	 * Подписки мало: `item:add:before` срабатывает только на добавлении, а
	 * расширение может прийти в уже наполненный движок. Так и происходит, когда
	 * коллекцию собрали снаружи (`createEngine({ items })`) и передали
	 * компоненту — без этого прохода в драйвере остались бы сырые объекты
	 * вместо элементов, и дальше не работало бы ничего.
	 *
	 * Через `batch.update`, а не своей операцией над драйвером: там уже написан
	 * правильный порядок вставки, и повторять его здесь значит завести вторую
	 * реализацию того же.
	 */
	private _convertExisting(ctx: IExtensionContext<TItem>, ctor: new (source: any) => TItem): void {
		const raw = [...ctx.driver].filter((item) => !(item instanceof ctor))

		if (raw.length === 0) return

		const batch = ctx.extensions.batch as { update?(items: TItem[]): void } | undefined

		batch?.update?.([...ctx.driver])
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
