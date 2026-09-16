import { TComponent } from '../../component'
import type { IComponentProps } from '../../component'
import type { TAnyEvents } from '../../../../common'
import { TItemContext } from './../engine'
import type { IExtension, TExtractItemAdapters } from './../engine'

/**
 * Фасад элемента коллекции.
 *
 * Похож на обычный `TComponent`, но внутри держит `TItemContext` (item-адаптеры)
 * и релеит события адаптеров в собственный `events`. Благодаря этому дескриптор
 * item-фасада собирается обычным `defineComponent` — без `defineCollection`.
 */
export abstract class TCollectionItemComponent<
	TItem extends object,
	TExtensions extends Record<string, IExtension<TItem>>,
	TEvents extends TAnyEvents,
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
