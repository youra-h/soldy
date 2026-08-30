import type { IExtensionContext, IItemExtensionCtor } from '../../../../base/collection'
import type { IListBoxItem } from '../../list-box-item/types'
import type { IListBox } from '../../types'
import { TListExtension } from '../../../list'
import type { IListBoxExtensionOptions, IListBoxExtension } from './types'
import { TListBoxItemExtension, type IListBoxItemExtension } from './item'

/**
 * TListBoxExtension — расширение коллекции для управления элементами ListBox.
 *
 * Наследует TListExtension (disabled, size, variant, wordWrap) и добавляет
 * проброс view на элементы.
 *
 * @template TOwner — тип владельца (TListBox или наследник)
 * @template TItem  — тип элемента (IListBoxItem или наследник)
 */
export class TListBoxExtension<
	TOwner extends IListBox = IListBox,
	TItem extends IListBoxItem = IListBoxItem,
>
	extends TListExtension<TOwner, TItem, IListBoxItemExtension<TItem>>
	implements IListBoxExtension<TItem>
{
	readonly name = 'listBox' as const

	constructor(options: IListBoxExtensionOptions<TOwner, TItem>) {
		super(
			options,
			TListBoxItemExtension as unknown as IItemExtensionCtor<
				TItem,
				any,
				IListBoxItemExtension<TItem>
			>,
		)
	}

	/** Внешний вид с инстанса TListBox. */
	get view(): IListBox['view'] {
		return this._owner.view
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		// Внешний вид: пробрасываем change:view в item-адаптеры.
		this.events.relay(this._owner.events, ['change:view'])
	}
}
