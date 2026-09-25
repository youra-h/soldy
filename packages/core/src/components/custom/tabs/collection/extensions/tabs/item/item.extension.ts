import { TBaseItemExtension } from '../../../../../../base/collection'
import type { ITabsItemExtension, TTabsItemEventsExtension } from './types'
import type { ITabsItem } from '../../../../item/types'
import type { ITabsExtension } from '../types'

/**
 * TTabsItemExtension — stateless-делегат элемента таба.
 *
 * Предоставляет closable: выключенный таб не закрывается, иначе значение
 * элемента (приоритет) или родительского расширения (fallback на TTabs.closable).
 *
 * @template TItem   — тип элемента (ITabsItem или наследник)
 * @template TParent — тип родительского расширения (ITabsExtension или наследник)
 */
export class TTabsItemExtension<
	TItem extends ITabsItem = ITabsItem,
	TParent extends ITabsExtension<TItem> = ITabsExtension<TItem>,
>
	extends TBaseItemExtension<TItem, TParent, TTabsItemEventsExtension>
	implements ITabsItemExtension<TItem>
{
	constructor(item: TItem, parent: TParent) {
		super(item, parent)

		this.events.relay(parent.events, ['change:closable'])
		this.events.relay(item.events, [
			'change:closable',
			// `disabled` входит в итог `closable` — см. геттер
			{ from: 'change:disabled', as: 'change:closable' },
		])
	}

	/**
	 * Может ли таб быть закрыт.
	 *
	 * Выключенный таб не закрывается. Правило выводится здесь, а не пишется в
	 * собственный `closable` элемента, поэтому не зависит от того, как таб
	 * пришёл к «выключен»: со старта, позже или вместе с набором. Итог
	 * `disabled` уже сочетает своё значение таба и владельца
	 * (`bindDisabledToOwner`), и `change:disabled` приходит на смену итога.
	 *
	 * У включённого — явное значение элемента > глобальное значение из
	 * расширения.
	 */
	get closable(): boolean {
		return !this._item.disabled && (this._item.closable ?? this._parent.closable)
	}

	/**
	 * Закрыть таб.
	 * Делегирует в родительское расширение.
	 */
	close(): void {
		if (this.closable) {
			this._parent.closeTab(this._item)
		}
	}
}
