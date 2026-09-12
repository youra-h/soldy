import { TBaseOwnerItemExtension } from '../../../../../base/collection'
import type {
	IExtension,
	IExtensionContext,
	ISelectionExtension,
} from '../../../../../base/collection'
import type { TComponentSize, TComponentVariant, TValuePayload } from '../../../../../../common'
import { LIST_CONTENT_FIT_ATTRIBUTE, LIST_INDICATOR_ATTRIBUTE } from '../../../../list'
import type { TListIndicator } from '../../../../list'
import type { ISelect } from '../../../types'
import type { ISelectItem } from '../../../item/types'
import { TSelectItemExtension, type ISelectItemExtension } from './item'
import type { ISelectExtension, ISelectExtensionOptions, TSelectExtensionEvents } from './types'

/**
 * TSelectExtension — всё, что Select знает благодаря коллекции.
 *
 * Две обязанности, и обе требуют одновременно владельца и список, поэтому
 * живут вместе:
 *
 * 1. **ARIA-связка.** Формула идентификаторов одна на обе половинки: на
 *    `aria-controls` поля и `id` списка, на `aria-activedescendant` и `id`
 *    опции. Разнеси её, и они однажды разойдутся.
 * 2. **Проброс `disabled`/`size`/`variant`** с поля на опции — как у ListBox.
 *
 * Синхронизации `value` ↔ выбор здесь больше нет: она переехала в
 * `TValueSelectionExtension` движка. Написана она была тут, пока Select был
 * единственным списком со значением; теперь `value` есть и у `TListBox`, и
 * оставить копию значило бы завести две реализации одной мысли.
 *
 * Текст поля (`text`) при этом остаётся здесь — он не про синхронизацию, а
 * про то, что показывать вместо `placeholder`.
 */
export class TSelectExtension<
	TOwner extends ISelect = ISelect,
	TItem extends ISelectItem = ISelectItem,
>
	extends TBaseOwnerItemExtension<TItem, ISelectItemExtension<TItem>, TSelectExtensionEvents>
	implements IExtension<TItem>, ISelectExtension<TItem>
{
	readonly name = 'select' as const

	private readonly _owner: TOwner
	private _text = ''

	constructor(options: ISelectExtensionOptions<TOwner, TItem>) {
		super(TSelectItemExtension as any, options)

		this._owner = options.owner
	}

	/** Инстанс поля — item-адаптеру нужен его `closeOnSelect`. */
	get owner(): TOwner {
		return this._owner
	}

	/**
	 * `id` списка и опций строятся от `uid`: он уникален в рамках сессии,
	 * поэтому два Select на странице не столкнутся, даже если значения совпали.
	 */
	get listId(): string {
		return `s-select-list-${this._owner.uid}`
	}

	optionId(item: TItem): string {
		return `s-select-option-${item.uid}`
	}

	/** Текст выбранного — то, что показывает поле вместо `placeholder`. */
	get text(): string {
		return this._text
	}

	/** Сторона отметки выбранного — с поля. Своей у опции нет. */
	get indicator(): TListIndicator {
		return this._owner.indicator
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		// Поле ссылается на список, а список существует всегда — в отличие от
		// панели у Tabs, которой может и не быть
		this._owner.aria.add('aria-controls', this.listId)

		// Отбор по тексту опции — знание Select, а не `filter`: общее расширение
		// умеет сравнивать с любыми полями, а какое из них показывается
		// пользователю, знает только компонент.
		const filter = ctx.extensions.filter as { fields?: (keyof TItem)[] } | undefined

		if (filter) filter.fields = ['text' as keyof TItem]

		ctx.driver.events.on('item:added', (e) => this._onItemAdded(e.item as TItem))

		// Догон: расширение приходит в коллекцию, которую могли наполнить
		// раньше — например, собрав её снаружи через `createEngine({ items })`.
		// Тем опциям `item:added` уже не придёт
		ctx.driver.valueOf().forEach((item) => this._onItemAdded(item as TItem))

		this._owner.events.on('change:disabled', (value: boolean) => {
			ctx.driver.valueOf().forEach((item) => {
				item.disabled = value
			})
		})

		this._owner.events.on('change:size', (payload: TValuePayload<TComponentSize>) => {
			ctx.driver.valueOf().forEach((item) => {
				item.size = payload.newValue
			})
		})

		this._owner.events.on('change:variant', (payload: TValuePayload<TComponentVariant>) => {
			ctx.driver.valueOf().forEach((item) => {
				item.variant = payload.newValue
			})
		})

		this._owner.events.on('change:contentFit', () => {
			ctx.driver.valueOf().forEach((item) => this._applyContentFit(item as TItem))
		})

		this._owner.events.on('change:indicator', () => {
			ctx.driver.valueOf().forEach((item) => this._applyIndicator(item as TItem))
		})

		// Сторона отметки доезжает до item-адаптеров
		this.events.relay(this._owner.events, ['change:indicator'])

		const selection = this._selection

		if (selection) {
			selection.events.on('change:selection', () => this._onSelectionChanged())

			ctx.driver.events.on('item:added', () => this._syncSelectedAria())
			ctx.driver.events.on('item:removed', () => this._onSelectionChanged())
		}
	}

	/**
	 * Выбрать опцию.
	 *
	 * В `single` выбор заменяет прежний, в `multiple` — переключает: нажатие
	 * на уже выбранную опцию снимает выбор.
	 *
	 * Disabled-опция не выбирается: она видна и объявляется скринридером как
	 * недоступная, но нажатие по ней ничего не делает.
	 */
	chooseItem(item: TItem): boolean {
		const selection = this._selection

		if (!selection || item.disabled) return false

		if (selection.multiple) {
			selection.toggle(item)
		} else {
			selection.select(item)

			// В multiple список не закрывается от выбора — иначе выбрать
			// несколько опций подряд было бы невозможно. Закрывает клик по
			// полю (toggleOpen на корне) или клик мимо (TDismissPlugin)
			if (this._owner.closeOnSelect) this._owner.open = false
		}

		return true
	}

	/** Снять выбор целиком — кнопка очистки поля. */
	clear(): void {
		this._selection?.resetSelection()
	}

	private get _selection(): ISelectionExtension<TItem> | undefined {
		return this._ctx?.extensions.selection as ISelectionExtension<TItem> | undefined
	}

	private _onItemAdded(item: TItem): void {
		item.disabled = this._owner.disabled
		item.size = this._owner.size
		item.variant = this._owner.variant

		this._applyContentFit(item)
		this._applyIndicator(item)

		item.aria.add('id', this.optionId(item))

		// Текст опции виден в поле, пока она выбрана
		item.events.on('change:text', () => this._syncText())
	}

	/**
	 * `data-content-fit` опции.
	 *
	 * Здесь, а не в шаблоне: иначе правило пришлось бы повторить в каждом из
	 * шести адаптеров. Своего значения у опции нет — в отличие от элемента
	 * ListBox, она берёт значение поля целиком.
	 */
	private _applyContentFit(item: TItem): void {
		item.dataset.add(LIST_CONTENT_FIT_ATTRIBUTE, this._owner.contentFit)
	}

	/**
	 * `data-indicator` опции — значение поля целиком.
	 *
	 * Ставит родительское расширение, а не item-адаптер: адаптеры создаются
	 * лениво, а атрибут обязан стоять с первой отрисовки, включая серверную.
	 */
	private _applyIndicator(item: TItem): void {
		item.dataset.add(LIST_INDICATOR_ATTRIBUTE, this._owner.indicator)
	}

	/**
	 * Выбор изменился — обновляем то, что зависит от него: разметку для
	 * скринридера и текст поля. Само `value` пишет `TValueSelectionExtension`.
	 */
	private _onSelectionChanged(): void {
		this._syncSelectedAria()
		this._syncText()
	}

	/**
	 * `aria-selected` стоит на **всех** опциях, а не только на выбранных:
	 * скринридер объявляет «2 из 7, не выбрана», и для этого нужен атрибут.
	 */
	private _syncSelectedAria(): void {
		const selection = this._selection

		if (!selection || !this._ctx) return

		this._ctx.driver.valueOf().forEach((item) => {
			item.aria.add('aria-selected', selection.isSelected(item) ? 'true' : 'false')
		})
	}

	private _syncText(): void {
		const selected = this._selection?.selected ?? []
		const text = selected.map((item) => item.text).join(', ')

		if (this._text === text) return

		this._text = text
		this.events.emit('change:text', text)
	}
}
