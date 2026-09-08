import { TBaseOwnerItemExtension } from '../../../../../base/collection'
import type {
	IExtension,
	IExtensionContext,
	ISelectionExtension,
} from '../../../../../base/collection'
import type { TComponentSize, TComponentVariant, TValuePayload } from '../../../../../../common'
import type { ISelect, TSelectValue } from '../../../types'
import type { ISelectItem } from '../../../item/types'
import { TSelectItemExtension, type ISelectItemExtension } from './item'
import type {
	ISelectExtension,
	ISelectExtensionOptions,
	TSelectExtensionEvents,
} from './types'

/**
 * TSelectExtension — всё, что Select знает благодаря коллекции.
 *
 * Три обязанности, и все три требуют одновременно владельца и список,
 * поэтому живут вместе:
 *
 * 1. **`value` и выбор — одно и то же.** Значение отдельно от выбора не
 *    хранится: в одну сторону выбор пишет `value`, в другую `value` выбирает
 *    опции. Флаг `_syncing` разрывает круг.
 * 2. **ARIA-связка.** Формула идентификаторов одна на обе половинки: на
 *    `aria-controls` поля и `id` списка, на `aria-activedescendant` и `id`
 *    опции. Разнеси её, и они однажды разойдутся.
 * 3. **Проброс `disabled`/`size`/`variant`** с поля на опции — как у List.
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
	private _valueText = ''
	private _syncing = false

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
	get valueText(): string {
		return this._valueText
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		// Поле ссылается на список, а список существует всегда — в отличие от
		// панели у Tabs, которой может и не быть
		this._owner.aria.add('aria-controls', this.listId)

		ctx.driver.events.on('item:added', (e) => this._onItemAdded(e.item as TItem))

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

		const selection = this._selection

		if (selection) {
			selection.events.on('change:selection', () => this._onSelectionChanged())

			ctx.driver.events.on('item:added', () => this._syncSelectedAria())
			ctx.driver.events.on('item:removed', () => this._onSelectionChanged())
		}

		// `value`, заданный до появления опций, применяется при их добавлении
		this._owner.events.on('change:value', () => this._applyValueToSelection())

		// Только value → выбор. Обратное направление здесь запускать нельзя:
		// на старте выбор пуст, и он затёр бы `value`, заданный пропом.
		this._applyValueToSelection()
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
		}

		if (this._owner.closeOnSelect) this._owner.open = false

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

		item.aria.add('id', this.optionId(item))

		// Текст опции виден в поле, пока она выбрана
		item.events.on('change:text', () => this._syncValueText())

		// Опция могла приехать позже, чем выставили value
		this._applyValueToSelection()
	}

	/**
	 * Выбор → `value` и текст поля.
	 */
	private _onSelectionChanged(): void {
		this._syncSelectedAria()
		this._syncValueText()

		if (this._syncing) return

		const selection = this._selection

		if (!selection) return

		const selected = selection.selected

		this._syncing = true

		try {
			this._owner.value = selection.multiple
				? selected.map((item) => item.value)
				: (selected[0]?.value ?? undefined)
		} finally {
			this._syncing = false
		}
	}

	/**
	 * `value` → выбор.
	 *
	 * Значения, которым не нашлось опции, молча игнорируются: список мог ещё
	 * не приехать, и повторный проход случится на `item:added`.
	 */
	private _applyValueToSelection(): void {
		if (this._syncing) return

		const selection = this._selection

		if (!selection || !this._ctx) return

		const wanted = this._toKeys(this._owner.value)

		this._syncing = true

		try {
			selection.resetSelection()

			for (const key of wanted) {
				const item = this._ctx.driver.find((candidate) => candidate.value === key)

				if (item) selection.select(item)
			}
		} finally {
			this._syncing = false
		}

		this._syncSelectedAria()
		this._syncValueText()
	}

	private _toKeys(value: TSelectValue): (string | number)[] {
		if (value === undefined || value === '') return []

		return Array.isArray(value) ? value : [value]
	}

	/**
	 * `aria-selected` стоит на **всех** опциях, а не только на выбранных:
	 * скринридер объявляет «2 из 7, не выбрана», и для этого нужен атрибут.
	 */
	private _syncSelectedAria(): void {
		const selection = this._selection

		if (!selection || !this._ctx) return

		this._ctx.driver.forEach((item) => {
			item.aria.add('aria-selected', selection.isSelected(item) ? 'true' : 'false')
		})
	}

	private _syncValueText(): void {
		const selected = this._selection?.selected ?? []
		const text = selected.map((item) => item.text).join(', ')

		if (this._valueText === text) return

		this._valueText = text
		this.events.emit('change:valueText', text)
	}
}
