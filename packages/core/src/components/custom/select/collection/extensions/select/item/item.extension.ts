import { TBaseItemExtension } from '../../../../../../base/collection'
import type { ISelectItem } from '../../../../item/types'
import type { ISelectExtension } from '../types'
import type { ISelectItemExtension, TSelectItemEventsExtension } from './types'
import type { TListIndicator } from '../../../../../list'

/**
 * TSelectItemExtension — stateless-делегат опции.
 *
 * Идентификатор не считает: формула живёт в родительском расширении, чтобы
 * быть в одном месте — на неё ссылаются и `aria-activedescendant` поля, и
 * `id` самой опции. Выбор тоже делегируется: он затрагивает всю коллекцию и
 * состояние поля, а адаптер знает только свой элемент.
 */
export class TSelectItemExtension<
	TItem extends ISelectItem = ISelectItem,
	TParent extends ISelectExtension<TItem> = ISelectExtension<TItem>,
>
	extends TBaseItemExtension<TItem, TParent, TSelectItemEventsExtension>
	implements ISelectItemExtension<TItem>
{
	constructor(item: TItem, parent: TParent) {
		super(item, parent)

		this.events.relay(parent.events, ['change:indicator'])
	}

	get optionId(): string {
		return this._parent.optionId(this._item)
	}

	/** Сторона отметки — целиком с поля: у опции своей нет. */
	get indicator(): TListIndicator {
		return this._parent.indicator
	}

	choose(): void {
		this._parent.chooseItem(this._item)
	}
}
