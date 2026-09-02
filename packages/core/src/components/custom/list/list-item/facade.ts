import { TCollectionItemComponent } from '../../../base/collection'
import type { TItemContext, IExtension } from '../../../base/collection'
import type { TListCollectionExtensions } from '../collection/types'
import type { IListItemExtension } from '../collection/extensions/item/types'
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

		if (!this._context) return

		const adapters = this._adapters

		if (!adapters) return

		this.events.relay(adapters.selection.events, ['change:selected'])
		this.events.relay(adapters.order.events, ['change:order'])

		const list = this._listAdapter()

		if (list) {
			this.events.relay(list.events, ['change:wordWrap'])
		}
	}

	get selected(): boolean {
		return this._adapters?.selection?.selected ?? false
	}

	set selected(value: boolean) {
		if (this._adapters) {
			this._adapters.selection.selected = value
		}
	}

	get order(): number {
		return this._adapters?.order?.order ?? -1
	}

	get wordWrap(): boolean {
		return this._listAdapter()?.wordWrap ?? false
	}

	private get _adapters(): Record<string, any> | undefined {
		return this._context?.adapters as unknown as Record<string, any> | undefined
	}

	/** Адаптер списка (list / listBox) — переопределяется в ListBox. */
	protected _listAdapter(): IListItemExtension<TItem> | undefined {
		return this._adapters?.list as IListItemExtension<TItem> | undefined
	}
}
