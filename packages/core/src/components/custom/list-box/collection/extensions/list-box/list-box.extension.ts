import type {
	IExtension,
	IExtensionContext,
	IItemExtensionCtor,
} from '../../../../../base/collection'
import { TBaseOwnerItemExtension } from '../../../../../base/collection'
import type { TComponentSize, TComponentVariant, TValuePayload } from '../../../../../../common'
import type { IListBoxItem } from '../../../item/types'
import type { IListBox, TListBoxView } from '../../../types'
import type { TListBoxExtensionEvents, IListBoxExtensionOptions, IListBoxExtension } from './types'
import { TListBoxItemExtension, type IListBoxItemExtension } from './item'

/**
 * TListBoxExtension — то, что элемент списка знает благодаря коллекции.
 *
 * Пробрасывает на элементы свойства владельца: `disabled`, `size`, `variant`,
 * `view`.
 *
 * `wordWrap` сюда не входит, хотя раньше входил: он переехал в
 * `TListLayoutPlugin` вместе с остальной раскладкой. Плагин ставит элементам
 * `data-word-wrap` сам — он получает их бандлы и успевает до первой отрисовки,
 * потому что `install` выполняется в `setup`, а не после монтирования.
 *
 * Раньше между ним и базой стоял `TListExtension` — ровно тот же код минус
 * `view`. Слой исчез вместе с компонентом `TList`: наследник у него был один.
 */
export class TListBoxExtension<
		TOwner extends IListBox = IListBox,
		TItem extends IListBoxItem = IListBoxItem,
		// `any` в констрейнте: карта событий item-адаптера инвариантна, и точный
		// набор здесь запретил бы наследнику её расширить
		TItemExt extends IListBoxItemExtension<TItem, any> = IListBoxItemExtension<TItem>,
	>
	extends TBaseOwnerItemExtension<TItem, TItemExt, TListBoxExtensionEvents>
	implements IExtension<TItem>, IListBoxExtension<TItem, TItemExt>
{
	readonly name: string = 'list'

	protected readonly _owner: TOwner

	constructor(
		options: IListBoxExtensionOptions<TOwner, TItem, TItemExt>,
		itemCtor: IItemExtensionCtor<
			TItem,
			any,
			TItemExt
		> = TListBoxItemExtension as unknown as IItemExtensionCtor<TItem, any, TItemExt>,
	) {
		super(itemCtor, options)

		this._owner = options.owner
	}

	/** Внешний вид со списка. */
	get view(): TListBoxView {
		return this._owner.view
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		ctx.driver.events.on('item:added', (e) => {
			e.item.disabled = this._owner.disabled
			e.item.size = this._owner.size
			e.item.variant = this._owner.variant
		})

		this._owner.events.on('change:disabled', (value: boolean) => {
			ctx.driver.forEach((item) => {
				item.disabled = value
			})
		})

		this._owner.events.on('change:size', (payload: TValuePayload<TComponentSize>) => {
			ctx.driver.forEach((item) => {
				item.size = payload.newValue
			})
		})

		this._owner.events.on('change:variant', (payload: TValuePayload<TComponentVariant>) => {
			ctx.driver.forEach((item) => {
				item.variant = payload.newValue
			})
		})

		// Внешний вид доезжает до item-адаптеров
		this.events.relay(this._owner.events, ['change:view'])
	}
}
