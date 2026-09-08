import type { IExtension, IExtensionContext } from '../../../../../base/collection'
import type { TAccordionView } from '../../../types'
import { TBaseOwnerItemExtension } from '../../../../../base/collection'
import type { IAccordionItem } from '../../../item/types'
import type { IAccordion } from '../../../types'
import type {
	TAccordionExtensionEvents,
	IAccordionExtensionOptions,
	IAccordionExtension,
} from './types'
import { TAccordionItemExtension, type IAccordionItemExtension } from './item'
import type { TComponentSize, TComponentVariant, TValuePayload } from '../../../../../../common'

/**
 * TAccordionExtension — расширение коллекции для управления элементами accordion.
 *
 * Получает ссылку на инстанс TAccordion через options.owner и автоматически
 * пробрасывает свойства (disabled, size, variant, view) на добавляемые элементы,
 * а также подписывается на изменения владельца для синхронизации.
 *
 * @template TOwner — тип владельца (TAccordion или наследник)
 * @template TItem  — тип элемента (IAccordionItem или наследник)
 */
export class TAccordionExtension<
	TOwner extends IAccordion = IAccordion,
	TItem extends IAccordionItem = IAccordionItem,
>
	extends TBaseOwnerItemExtension<
		TItem,
		IAccordionItemExtension<TItem>,
		TAccordionExtensionEvents
	>
	implements IExtension<TItem>, IAccordionExtension<TItem>
{
	readonly name = 'accordion' as const

	/**
	 * Ссылка на инстанс TAccordion, переданная через конструктор.
	 * Используется для проброса свойств на элементы и подписки на события.
	 * @private
	 * @readonly
	 * @type {TOwner}
	 */
	private readonly _owner: TOwner

	constructor(options: IAccordionExtensionOptions<TOwner, TItem>) {
		super(TAccordionItemExtension, options)

		this._owner = options.owner
	}

	/** Внешний вид с инстанса TAccordion. */
	get view(): TAccordionView {
		return this._owner.view
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		// При добавлении элемента — пробрасываем текущие свойства владельца
		ctx.driver.events.on('item:added', (e) => {
			e.item.disabled = this._owner.disabled
			e.item.size = this._owner.size
			e.item.variant = this._owner.variant
		})

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

		// Внешний вид: пробрасываем change:view в item-адаптеры
		// (TAccordionItemExtension резолвит view из owner).
		this.events.relay(this._owner.events, ['change:view'])
	}
}
