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

/**
 * TAccordionExtension — расширение коллекции для управления элементами accordion.
 *
 * Получает ссылку на инстанс TAccordion через options.owner. `view` секция
 * читает с него, `size` и `variant` расширение пишет ей значениями accordion
 * — их диктует он. `disabled` accordion распространяется на секции, как у
 * `<fieldset>`: выключенный accordion выключает их, включённый — включает.
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
	get view(): TAccordionView | undefined {
		return this._owner.view
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		// При добавлении элемента — пробрасываем текущие свойства владельца
		ctx.driver.events.on('item:added', (e) => this._inheritOwner(e.item as TItem))
		// Патч пишет элементу своё из данных — свойства владельца поверх
		ctx.driver.events.on('item:updated', (e) => this._inheritOwner(e.item as TItem))

		// Догон: расширение приходит в коллекцию, которую могли наполнить
		// раньше — например, собрав её снаружи через `createEngine({ items })`.
		// Тем элементам `item:added` уже не придёт
		ctx.driver.valueOf().forEach((item) => this._inheritOwner(item as TItem))

		// Смена у владельца — всем элементам: `disabled` распространяется на них,
		// как у `<fieldset>`, `size` и `variant` диктует он
		this._owner.events.on('change:disabled', (value: boolean) => {
			ctx.driver.valueOf().forEach((item) => {
				item.disabled = value
			})
		})
		this._owner.events.on('change:size', () =>
			ctx.driver.valueOf().forEach((item) => this._applyStyle(item)),
		)
		this._owner.events.on('change:variant', () =>
			ctx.driver.valueOf().forEach((item) => this._applyStyle(item)),
		)

		// Внешний вид: пробрасываем change:view в item-адаптеры
		// (TAccordionItemExtension резолвит view из owner).
		this.events.relay(this._owner.events, ['change:view'])
	}

	/**
	 * Свойства владельца на элементе: `size` и `variant` — всегда его,
	 * `disabled` — когда владелец выключен.
	 */
	private _inheritOwner(item: TItem): void {
		this._applyStyle(item)

		if (this._owner.disabled) item.disabled = true
	}

	/** `size` и `variant` элемента — всегда владельца. */
	private _applyStyle(item: TItem): void {
		item.size = this._owner.size
		item.variant = this._owner.variant
	}
}
