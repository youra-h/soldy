import type {
	IExtension,
	IExtensionContext,
	IItemExtensionCtor,
} from '../../../../../base/collection'
import { TBaseOwnerItemExtension } from '../../../../../base/collection'
import type { TComponentSize, TComponentVariant, TValuePayload } from '../../../../../../common'
import { LIST_CONTENT_FIT_ATTRIBUTE, LIST_INDICATOR_ATTRIBUTE } from '../../../../list'
import type { TListIndicator } from '../../../../list'
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

	/** Сторона отметки выбранного — со списка. */
	get indicator(): TListIndicator {
		return this._owner.indicator
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		ctx.driver.events.on('item:added', (e) => this._applyOwner(e.item as TItem))

		// Догон: расширение приходит в коллекцию, которую могли наполнить
		// раньше — например, собрав её снаружи через `createEngine({ items })`.
		// Тем элементам `item:added` уже не придёт
		ctx.driver.forEach((item) => this._applyOwner(item as TItem))

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

		this._owner.events.on('change:contentFit', () => {
			ctx.driver.forEach((item) => this._applyContentFit(item as TItem))
		})

		this._owner.events.on('change:indicator', () => {
			ctx.driver.forEach((item) => this._applyIndicator(item as TItem))
		})

		// Внешний вид и сторона отметки доезжают до item-адаптеров
		this.events.relay(this._owner.events, ['change:view', 'change:indicator'])
	}

	/** Свойства владельца, которые элемент получает от него, а не задаёт сам. */
	private _applyOwner(item: TItem): void {
		item.disabled = this._owner.disabled
		item.size = this._owner.size
		item.variant = this._owner.variant

		// Roving tabindex (APG listbox): фокусируем контейнер, элементы — только
		// стрелками (`TListKeyboardPlugin`), не Tab'ом. Без этого Tab перебирал бы
		// элементы по одному — при тысяче опций так невозможно уйти со списка.
		item.aria.add('tabindex', '-1')

		this._applyContentFit(item)
		this._applyIndicator(item)
	}

	/**
	 * `data-indicator` элемента — значение списка целиком.
	 *
	 * Ставит родительское расширение, а не item-адаптер: адаптеры создаются
	 * лениво, а атрибут обязан стоять с первой отрисовки, включая серверную.
	 */
	private _applyIndicator(item: TItem): void {
		item.dataset.add(LIST_INDICATOR_ATTRIBUTE, this._owner.indicator)
	}

	/**
	 * `data-content-fit` элемента: своё значение поверх списочного.
	 *
	 * Разрешение живёт здесь, а не в шаблоне: `:data-content-fit="…"` повторил
	 * бы это правило в каждом из шести адаптеров. `undefined` у элемента
	 * означает «взять у списка» и не то же самое, что `truncate`.
	 */
	private _applyContentFit(item: TItem): void {
		item.dataset.add(LIST_CONTENT_FIT_ATTRIBUTE, item.contentFit ?? this._owner.contentFit)
	}
}
