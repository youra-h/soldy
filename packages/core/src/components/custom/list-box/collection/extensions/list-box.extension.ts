import type { IExtension, IExtensionContext } from '../../../../base/collection'
import { TBaseOwnerItemExtension } from '../../../../base/collection'
import type { IListBoxItem } from '../../list-box-item/types'
import type { IListBox } from '../../types'
import type { TListBoxExtensionEvents, IListBoxExtensionOptions, IListBoxExtension } from './types'
import { TListBoxItemExtension, type IListBoxItemExtension } from './item'
import type { TComponentSize, TComponentVariant, TValuePayload } from '../../../../../common'

/**
 * TListBoxExtension — расширение коллекции для управления элементами ListBox.
 *
 * Получает ссылку на инстанс TListBox через options.owner и автоматически
 * пробрасывает свойства (disabled, size, variant, wordWrap, view) на элементы,
 * а также подписывается на изменения владельца для синхронизации.
 *
 * @template TOwner — тип владельца (TListBox или наследник)
 * @template TItem  — тип элемента (IListBoxItem или наследник)
 */
export class TListBoxExtension<
	TOwner extends IListBox = IListBox,
	TItem extends IListBoxItem = IListBoxItem,
>
	extends TBaseOwnerItemExtension<TItem, IListBoxItemExtension<TItem>, TListBoxExtensionEvents>
	implements IExtension<TItem>, IListBoxExtension<TItem>
{
	readonly name = 'listBox' as const

	/**
	 * Ссылка на инстанс TListBox, переданная через конструктор.
	 * Используется для проброса свойств на элементы и подписки на события.
	 * @private
	 * @readonly
	 * @type {TOwner}
	 */
	private readonly _owner: TOwner

	constructor(options: IListBoxExtensionOptions<TOwner, TItem>) {
		super(TListBoxItemExtension, options)

		this._owner = options.owner
	}

	/** Глобальный wordWrap с инстанса TListBox (наследуется от TList). */
	get wordWrap(): boolean {
		return this._owner.wordWrap
	}

	/** Внешний вид с инстанса TListBox. */
	get view(): IListBox['view'] {
		return this._owner.view
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		// При добавлении элемента — пробрасываем текущие свойства владельца
		ctx.engine.events.on('item:added', (e) => {
			e.item.disabled = this._owner.disabled
			e.item.size = this._owner.size
			e.item.variant = this._owner.variant
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

		// Глобальные wordWrap/view: пробрасываем в item-адаптеры.
		this.events.relay(this._owner.events, ['change:wordWrap', 'change:view'])
	}
}
