import { TComponent } from '../../component'
import type { IComponentProps, TComponentEvents } from '../../component'
import { TItemContext } from './../engine'
import type { IExtension, TExtractItemAdapters } from './../engine'

/**
 * Фасад элемента коллекции.
 *
 * Похож на обычный `TComponent`, но внутри держит `TItemContext` (item-адаптеры)
 * и релеит события адаптеров в собственный `events`. Благодаря этому дескриптор
 * item-фасада собирается обычным `defineComponent` — без `defineCollection`.
 *
 * У `TEvents` нет умолчания, и это намеренно: своих релеев у базы нет, а
 * открытый `Record<string, …>` по умолчанию выключал бы сверку `relay` у
 * каждого наследника, который карту не передал. Все три потребителя
 * (`TOrderItemFacade`, `TSelectionItemFacade` через него и
 * `TTabsContentCollectionFacade`) передают свою.
 */
export abstract class TCollectionItemComponent<
	TItem extends object,
	TExtensions extends Record<string, IExtension<TItem>>,
	TEvents extends TComponentEvents,
> extends TComponent<IComponentProps, TEvents> {
	protected _context?: TItemContext<TItem, TExtensions>

	/**
	 * Устанавливает контекст item-адаптеров.
	 * Вызывается из adapter-слоя после того, как коллекция-владелец известна.
	 */
	setContext(context: TItemContext<TItem, TExtensions>): void {
		this._context = context
	}

	get context(): TItemContext<TItem, TExtensions> | undefined {
		return this._context
	}

	get adapters(): TExtractItemAdapters<TExtensions> | undefined {
		return this._context?.adapters
	}
}
