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
import { bindDisabledToOwner, notifyOwnerDisabled } from '../../../../../base/control'
import { bindStyleToOwner, notifyOwnerSize, notifyOwnerVariant } from '../../../../../base/stylable'
import type { TComponentSize, TComponentVariant, TValuePayload } from '../../../../../../common'

/**
 * TAccordionExtension — расширение коллекции для управления элементами accordion.
 *
 * Получает ссылку на инстанс TAccordion через options.owner. `view` секция
 * читает с него, `size` и `variant` получает резольвером
 * (`bindStyleToOwner`): их диктует accordion, своё значение секции остаётся в
 * `rawValue` и на вид не влияет. `disabled` не диктуется, а сочетается:
 * секция выключена, если выключена сама или выключен accordion
 * (`bindDisabledToOwner`).
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
		ctx.driver.events.on('item:added', (e) => this._applyOwner(e.item as TItem))

		// Догон: расширение приходит в коллекцию, которую могли наполнить
		// раньше — например, собрав её снаружи через `createEngine({ items })`.
		// Тем элементам `item:added` уже не придёт
		ctx.driver.valueOf().forEach((item) => this._applyOwner(item as TItem))

		// Итог `resolvedDisabled` элементу отдаёт резольвер по итогу владельца — сообщаем
		// тем, у кого он сменился
		this._owner.events.on('change:disabled:resolved', () =>
			notifyOwnerDisabled(ctx.driver.valueOf()),
		)

		// `size` и `variant` секции тоже отдаёт резольвер — сообщаем прежний
		// итог, по нему снимается старый класс
		this._owner.events.on('change:size', (payload: TValuePayload<TComponentSize>) => {
			notifyOwnerSize(ctx.driver.valueOf(), payload.oldValue)
		})

		this._owner.events.on(
			'change:variant',
			(payload: TValuePayload<TComponentVariant | undefined>) => {
				notifyOwnerVariant(ctx.driver.valueOf(), payload.oldValue)
			},
		)

		// Внешний вид: пробрасываем change:view в item-адаптеры
		// (TAccordionItemExtension резолвит view из owner).
		this.events.relay(this._owner.events, ['change:view'])
	}

	/**
	 * Свойства владельца, которые секция получает от него, а не задаёт сама.
	 *
	 * Расширение их не пишет: `size` и `variant` диктует accordion
	 * (`bindStyleToOwner`), `disabled` секция сочетает со своим
	 * (`bindDisabledToOwner`). Итог в обоих случаях отдаёт резольвер.
	 */
	private _applyOwner(item: TItem): void {
		bindDisabledToOwner(item, this._owner)
		bindStyleToOwner(item, this._owner)
	}
}
