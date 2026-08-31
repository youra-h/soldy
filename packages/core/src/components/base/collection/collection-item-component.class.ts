import { TComponent } from '../component'
import type { IComponentProps, TComponentEvents } from '../component'
import { TItemContext } from './context'
import type { IExtension } from './extension'

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
	TEvents extends TComponentEvents = TComponentEvents & Record<string, (...args: any[]) => any>,
> extends TComponent<IComponentProps, TEvents> {
	protected _context?: TItemContext<TItem, TExtensions>

	/**
	 * Устанавливает контекст item-адаптеров.
	 * Вызывается из adapter-слоя после того, как коллекция-владелец известна.
	 */
	setContext(context: TItemContext<TItem, TExtensions>): void {
		this._context = context
		this._relayAdapters()
	}

	/**
	 * Пробросить события item-адаптеров в собственный `events`.
	 * Переопределяется в конкретном item-фасаде.
	 */
	protected abstract _relayAdapters(): void

	// Возвращаем `any`, чтобы не просачивать не-портируемые типы (TExtractItemAdapters)
	// в inferred-тип setup() Vue-компонента (vue-tsc требует переносимые именованные типы).
	get context(): any {
		return this._context
	}

	get adapters(): any {
		return this._context?.adapters
	}
}
