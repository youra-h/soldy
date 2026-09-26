import type { IExtension, IExtensionContext } from '../types'
import { TBaseExtension } from '../base-extension.class'
import type {
	TFactoryEvents,
	IFactoryExtension,
	IFactoryExtensionOptions,
	IFactoryItemOptions,
} from './types'

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
 * const col = new TCollectionEngine<
 *     ITabsItem,
 *     { factory: TFactoryExtension<ITabsItem>; batch: TBatchExtension<ITabsItem> }
 * >({
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

	private readonly _itemCtor?: IFactoryExtensionOptions<TItem>['itemCtor']
	/** Основа `id` элементов из источников — владельца коллекции (`bindIdBase`). */
	private _idBase: string | null = null
	/** Сколько элементов фабрика создала: номер следующего — в их основе. */
	private _created = 0

	constructor(options: IFactoryExtensionOptions<TItem>) {
		super()

		this._itemCtor = options.itemCtor
	}

	/**
	 * Элемент из источника строит фабрика, и `useId` фреймворка до него не
	 * доходит: без основы от владельца его `id` в DOM строились бы от `uid`,
	 * счётчика процесса, и расходились при гидратации. Номер по порядку
	 * создания одинаков на сервере и в браузере: источники те же.
	 */
	bindIdBase(idBase: string): void {
		this._idBase = idBase
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		if (!this._itemCtor) return

		const ctor = this._itemCtor

		ctx.driver.events.on('item:add:before', (e) => {
			if (e.item instanceof ctor) return

			e.item = this._build(ctor, e.item)
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
	private _convertExisting(
		ctx: IExtensionContext<TItem>,
		ctor: IFactoryExtensionOptions<TItem>['itemCtor'],
	): void {
		const raw = ctx.driver.valueOf().filter((item) => !(item instanceof ctor))

		if (raw.length === 0) return

		const batch = ctx.extensions.batch as { update?(items: TItem[]): void } | undefined

		batch?.update?.(ctx.driver.valueOf())
	}

	create(source: Partial<TItem>): TItem {
		const ctor = this._itemCtor

		if (!ctor) {
			throw new Error('TFactoryExtension: ctor is not defined')
		}

		return this._build(ctor, source)
	}

	private _build(
		ctor: IFactoryExtensionOptions<TItem>['itemCtor'],
		source: Partial<TItem>,
	): TItem {
		this._created += 1

		const options: IFactoryItemOptions =
			this._idBase === null ? {} : { idBase: `${this._idBase}-item-${this._created}` }

		return new ctor(source, options)
	}

	isSource(value: unknown): boolean {
		const ctor = this._itemCtor

		if (!ctor) return true

		return !(value instanceof ctor)
	}
}
