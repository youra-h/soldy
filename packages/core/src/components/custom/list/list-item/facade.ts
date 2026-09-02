import { TCollectionItemComponent } from '../../../base/collection'
import type { TItemContext, IExtension } from '../../../base/collection'
import type { TListCollectionExtensions, TListAdapters } from '../collection/types'
import type { IListItem } from './types'

/**
 * Фасад элемента list.
 *
 * Держит `TItemContext` (item-адаптеры) и выставляет item-пропсы коллекции
 * (`selected`, `order`, `wordWrap`) как обычные свойства компонента.
 * Базовый фасад — ListBox наследует его.
 */
export class TListItemCollectionFacade<
	TItem extends IListItem = IListItem,
	TExtensions extends Record<string, IExtension<any>> = TListCollectionExtensions,
> extends TCollectionItemComponent<TItem, TExtensions> {
	override setContext(context: TItemContext<TItem, TExtensions>): void {
		super.setContext(context)

		const adapters = this._adapters

		if (!adapters) return

		this.events.relay(adapters.selection.events, ['change:selected'])
		this.events.relay(adapters.order.events, ['change:order'])
		this.events.relay(adapters.list.events, ['change:wordWrap'])
	}

	get selected(): boolean {
		return this._adapters?.selection.selected ?? false
	}

	set selected(value: boolean) {
		if (this._adapters) {
			this._adapters.selection.selected = value
		}
	}

	get order(): number {
		return this._adapters?.order.order ?? -1
	}

	get wordWrap(): boolean {
		return this._adapters?.list.wordWrap ?? false
	}

	private get _adapters(): TListAdapters<TItem> | undefined {
		return this._context?.adapters as unknown as TListAdapters<TItem> | undefined
	}
}
