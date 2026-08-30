import type { IExtension, IExtensionContext } from '../../../../base/collection'
import { TBaseOwnerItemExtension } from '../../../../base/collection'
import type { ICollapseItem } from '../../collapse-item/types'
import type { ICollapse } from '../../types'
import type {
	TCollapseExtensionEvents,
	ICollapseExtensionOptions,
	ICollapseExtension,
} from './types'
import { TCollapseItemExtension, type ICollapseItemExtension } from './item'
import type { TComponentSize, TComponentVariant, TValuePayload } from '../../../../../common'

/**
 * TCollapseExtension — расширение коллекции для управления элементами collapse.
 *
 * Получает ссылку на инстанс TCollapse через options.owner и автоматически
 * пробрасывает свойства (disabled, size, variant, view) на добавляемые элементы,
 * а также подписывается на изменения владельца для синхронизации.
 *
 * @template TOwner — тип владельца (TCollapse или наследник)
 * @template TItem  — тип элемента (ICollapseItem или наследник)
 */
export class TCollapseExtension<
	TOwner extends ICollapse = ICollapse,
	TItem extends ICollapseItem = ICollapseItem,
>
	extends TBaseOwnerItemExtension<TItem, ICollapseItemExtension<TItem>, TCollapseExtensionEvents>
	implements IExtension<TItem>, ICollapseExtension<TItem>
{
	readonly name = 'collapse' as const

	/**
	 * Ссылка на инстанс TCollapse, переданная через конструктор.
	 * Используется для проброса свойств на элементы и подписки на события.
	 * @private
	 * @readonly
	 * @type {TOwner}
	 */
	private readonly _owner: TOwner

	constructor(options: ICollapseExtensionOptions<TOwner, TItem>) {
		super(TCollapseItemExtension, options)

		this._owner = options.owner
	}

	/** Внешний вид с инстанса TCollapse. */
	get view(): ICollapse['view'] {
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

		// Внешний вид: пробрасываем change:view в item-адаптеры
		// (TCollapseItemExtension резолвит view из owner).
		this.events.relay(this._owner.events, ['change:view'])
	}
}
