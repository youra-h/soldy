import { TBaseItemExtension } from '../../../../../../base/collection'
import type { IListBoxItemExtension, TListBoxItemEventsExtension } from './types'
import type { IListBoxItem } from '../../../../item/types'
import type { IListBoxExtension } from '../types'
import type { TListBoxView } from '../../../../types'

/**
 * TListBoxItemExtension — stateless-делегат элемента ListBox.
 *
 * Отдаёт `view` владельца. Раньше между ним и базой стоял `TListItemExtension`,
 * резолвивший `wordWrap` как «значение элемента поверх значения списка»; теперь
 * списочным `wordWrap` владеет `TListLayoutPlugin`, и он же разрешает пару,
 * записывая элементу `data-word-wrap`.
 *
 * @template TItem   — тип элемента (IListBoxItem или наследник)
 * @template TParent — тип родительского расширения (IListBoxExtension или наследник)
 */
export class TListBoxItemExtension<
	TItem extends IListBoxItem = IListBoxItem,
	TParent extends IListBoxExtension<TItem, any> = IListBoxExtension<TItem>,
	TEvents extends TListBoxItemEventsExtension = TListBoxItemEventsExtension,
>
	extends TBaseItemExtension<TItem, TParent, TEvents>
	implements IListBoxItemExtension<TItem, TEvents>
{
	constructor(item: TItem, parent: TParent) {
		super(item, parent)

		this.events.relay(parent.events, ['change:view'])
	}

	/** Внешний вид элемента — берётся у владельца целиком. */
	get view(): TListBoxView {
		return this._parent.view
	}
}
