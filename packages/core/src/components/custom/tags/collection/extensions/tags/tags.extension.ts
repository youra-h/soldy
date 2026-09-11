import type {
	IExtension,
	IExtensionContext,
	ISelectionExtension,
} from '../../../../../base/collection'
import {
	TBaseOwnerItemExtension,
	TItemContextRegistry,
	TRemoveCommand,
} from '../../../../../base/collection'
import type { ITagsItem } from '../../../item/types'
import type { ITags, TTagsView } from '../../../types'
import type {
	TTagsExtensionEvents,
	ITagsExtensionOptions,
	TTagsExtensions,
	ITagsExtension,
} from './types'
import { TTagsItemExtension, type ITagsItemExtension } from './item'
import type { TComponentSize, TComponentVariant, TValuePayload } from '../../../../../../common'

/**
 * TTagsExtension — то, что тег знает благодаря коллекции.
 *
 * Четыре обязанности:
 *
 * 1. **Проброс** `disabled`/`size`/`variant` с владельца на теги — как у
 *    `TListBoxExtension`/`TTabsExtension`.
 * 2. **Закрытие** — `closeTag`, копия `closeTab` у Tabs: закрывает только
 *    `closable` тег и эмитит `item:close` перед удалением.
 * 3. **Роль набора**, когда у коллекции включён выбор. Tags — не список
 *    (`role="list"`/`"listitem"`), а `listbox`/`option` с `aria-selected`,
 *    как только `selection.mode` перестаёт быть `none`. Пишет это
 *    расширение, а не элемент и не `TSelectionExtension`: тот общий для всех
 *    коллекций, а конкретная пара ролей — знание Tags.
 * 4. **Вид** — `view` берётся у владельца целиком (как `view` у
 *    `TListBoxExtension`) и доезжает до item-адаптера событием: элемент
 *    своего вида не имеет, его `Button` рисуется видом набора.
 */
export class TTagsExtension<TOwner extends ITags = ITags, TItem extends ITagsItem = ITagsItem>
	extends TBaseOwnerItemExtension<TItem, ITagsItemExtension<TItem>, TTagsExtensionEvents>
	implements IExtension<TItem>, ITagsExtension<TItem>
{
	readonly name = 'tags' as const

	private readonly _owner: TOwner
	private _itemRegistry!: TItemContextRegistry<TItem, TTagsExtensions<TItem>>

	constructor(options: ITagsExtensionOptions<TOwner, TItem>) {
		super(TTagsItemExtension, options)

		this._owner = options.owner
	}

	/** Глобальный closable с инстанса TTags. */
	get closable(): boolean {
		return this._owner.closable
	}

	/** Внешний вид со набора. */
	get view(): TTagsView {
		return this._owner.view
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		this._itemRegistry = new TItemContextRegistry({
			extensions: ctx.extensions as TTagsExtensions<TItem>,
			driver: ctx.driver,
		})

		ctx.driver.events.on('item:added', (e) => this._applyOwner(e.item as TItem))

		// Догон: расширение приходит в коллекцию, которую могли наполнить
		// раньше — например, собрав её снаружи через `createEngine({ items })`.
		// Тем элементам `item:added` уже не придёт
		ctx.driver.forEach((item) => this._applyOwner(item))

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

		// Глобальный closable: пробрасываем change:closable в item-адаптеры
		// (TTagsItemExtension резолвит closable из item ?? owner). change:view —
		// вид доезжает до Button каждого тега тем же путём, что у ListBox.
		this.events.relay(this._owner.events, ['change:closable', 'change:view'])

		const selection = ctx.extensions.selection as ISelectionExtension<TItem> | undefined

		if (selection) {
			selection.events.on('change:mode', () => this._applyMode())
			selection.events.on('change:selection', () => this._syncSelectedAria())

			ctx.driver.events.on('item:added', () => this._applyMode())
			ctx.driver.events.on('item:removed', () => this._applyMode())

			this._applyMode()
		}
	}

	/** Свойства владельца, которые тег получает от него, а не задаёт сам. */
	private _applyOwner(item: TItem): void {
		item.disabled = this._owner.disabled
		item.size = this._owner.size
		item.variant = this._owner.variant
	}

	private get _selection(): ISelectionExtension<TItem> | undefined {
		return this._ctx.extensions.selection as ISelectionExtension<TItem> | undefined
	}

	/**
	 * Роль набора и его тегов зависит от режима выбора: `list`/`listitem`,
	 * пока `mode === 'none'`, иначе `listbox`/`option` — как APG listbox.
	 */
	private _applyMode(): void {
		const selection = this._selection

		if (!selection) return

		this._owner.aria.add('role', selection.mode === 'none' ? 'list' : 'listbox')

		this._ctx.driver.forEach((item) => this._applyItemRole(item, selection))
	}

	private _applyItemRole(item: TItem, selection: ISelectionExtension<TItem>): void {
		if (selection.mode === 'none') {
			item.aria.add('role', 'listitem')
			item.aria.add('aria-selected', null)

			return
		}

		item.aria.add('role', 'option')
		item.aria.add('aria-selected', selection.isSelected(item) ? 'true' : 'false')
	}

	/**
	 * `aria-selected` стоит на **всех** тегах, а не только на выбранных:
	 * скринридер объявляет «2 из 7, не выбран», и для этого нужен атрибут на
	 * каждом. Не трогает роль — только режимы, где выбор уже включён.
	 */
	private _syncSelectedAria(): void {
		const selection = this._selection

		if (!selection || selection.mode === 'none') return

		this._ctx.driver.forEach((item) => {
			item.aria.add('aria-selected', selection.isSelected(item) ? 'true' : 'false')
		})
	}

	/**
	 * Закрыть тег (удалить элемент из коллекции).
	 * Если элемент не является closable — ничего не делает.
	 */
	closeTag(item: ITagsItem): boolean {
		const { tags } = this._itemRegistry.get(item as TItem).adapters

		if (!tags.closable) return false

		this.events.emit('item:close', item as TItem)

		this._ctx.execute(new TRemoveCommand(item as TItem))

		return true
	}
}
