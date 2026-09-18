import { TOrderItemFacade } from '../../order/item'
import type { TItemContext } from '../../../engine'
import type {
	IActivationCollectionItemProps,
	IExtension,
	TActivationExtension,
	TOrderExtension,
} from '../../../engine'
import type { TActivationItemFacadeEvents } from '../../types'

/**
 * Фасад элемента, который можно сделать активным: `active` плюс порядок из
 * базы.
 *
 * Подключают таб и радио. Выбор (`TSelectionItemFacade`) рядом, а не ниже:
 * расширения разные, и общий у них только порядок.
 */
export abstract class TActivationItemFacade<
	TItem extends object,
	TExtensions extends {
		order: TOrderExtension<any>
		activation: TActivationExtension<any>
	} & Record<string, IExtension<any>>,
	TEvents extends TActivationItemFacadeEvents = TActivationItemFacadeEvents,
> extends TOrderItemFacade<TItem, TExtensions, TEvents> {
	/**
	 * Вне коллекции элемент не активен — то же, что отдаёт геттер без
	 * контекста. Умолчание уходит адаптеру через декларацию пропа `active`.
	 */
	static defaultValues: IActivationCollectionItemProps = {
		...TOrderItemFacade.defaultValues,
		active: false,
	}

	override setContext(context: TItemContext<TItem, TExtensions>): void {
		super.setContext(context)

		if (!this._context) return

		this.events.relayAll(this._context.adapters.activation.events)
	}

	get active(): boolean {
		return this._context?.adapters.activation.active ?? false
	}

	set active(value: boolean) {
		if (!this._context) return

		this._context.adapters.activation.active = value
	}
}
