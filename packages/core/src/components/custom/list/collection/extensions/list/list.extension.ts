import type {
	IExtension,
	IExtensionContext,
	IItemExtensionCtor,
} from '../../../../../base/collection'
import { TBaseOwnerItemExtension } from '../../../../../base/collection'
import type { IListItem } from '../../../item/types'
import type { IList } from '../../../types'
import type { TListExtensionEvents, IListExtensionOptions, IListExtension } from './types'
import { TListItemExtension, type IListItemExtension } from './item'
import type { TComponentSize, TComponentVariant, TValuePayload } from '../../../../../../common'

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
	// `any` в констрейнте: карта событий item-адаптера инвариантна, и точный
	// набор здесь запретил бы ListBox добавить свой `change:view`
	TItemExt extends IListItemExtension<TItem, any> = IListItemExtension<TItem>,
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
		ctx.driver.events.on('item:added', (e) => {
			e.item.disabled = this._owner.disabled
			e.item.size = this._owner.size
			e.item.variant = this._owner.variant
			this._syncDataset()
		})

		ctx.driver.events.on('change:items', () => this._syncDataset())
		this._owner.events.on('change:wordWrap', () => this._syncDataset())
		this._syncDataset()

		// При изменении свойств владельца — пробрасываем на все элементы
		this._owner.events.on('change:disabled', (value: boolean) => {
			ctx.driver.forEach((item) => {
				item.disabled = value
			})
		})

		this._owner.events.on('change:size', (payload: TValuePayload<TComponentSize>) => {
			ctx.driver.forEach((item) => {
				item.size = payload.newValue
			})
		})

		this._owner.events.on('change:variant', (payload: TValuePayload<TComponentVariant>) => {
			ctx.driver.forEach((item) => {
				item.variant = payload.newValue
			})
		})

		// Глобальный wordWrap: пробрасываем change:wordWrap в item-адаптеры
		// (TListItemExtension резолвит wordWrap из item ?? owner).
		this.events.relay(this._owner.events, ['change:wordWrap'])
	}

	/**
	 * Отдаёт теме разрешённый перенос текста: значение элемента поверх
	 * значения списка.
	 *
	 * Разрешение живёт здесь, а не в шаблоне: `:data-word-wrap="list_wordWrap"`
	 * повторил бы это правило в каждом из шести адаптеров. И не в
	 * item-расширении, хотя логика та же, — те создаются лениво, только когда
	 * адаптер запросит контекст элемента, а атрибут нужен с первой отрисовки.
	 */
	private _syncDataset(): void {
		this._ctx?.driver.forEach((item) => {
			item.dataset?.add('word-wrap', item.wordWrap ?? this._owner.wordWrap)
		})
	}
}
