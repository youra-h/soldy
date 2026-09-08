import type { IListItem, TCollectionEngine } from '@soldy/core'
import type { IPluginContext } from '../../../base'
import { TCollectionElements } from '../../collection'
import { TListNavigationPlugin } from '../../list/navigation'
import type { ISelectKeyboardPluginOptions, TSelectKeyboardPluginEvents } from './types'

/** Минимум, который плагину нужен от поля. */
interface ISelectOwner {
	open: boolean
	openable: boolean
	aria: { add(name: string, value: string | null): unknown }
	events: { on(name: string, handler: (...args: any[]) => void): unknown }
}

/** Опция глазами плагина: у неё, в отличие от элемента списка, есть текст. */
interface ISelectOption extends IListItem {
	text: string
}

const OPENS = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '])

/**
 * TSelectKeyboardPlugin — клавиатура поля выбора по паттерну APG Combobox
 * (вариант select-only).
 *
 * Общая механика — подписка на `keydown`, привязка к коллекции, учёт
 * подсветки, циклический сдвиг — в `TListNavigationPlugin`. Здесь только то,
 * чем combobox отличается от самостоятельного списка.
 *
 * Ключевое свойство паттерна: **DOM-фокус никогда не уходит с поля**. Поэтому
 * `keydown` слушается на корне Select, а не на списке, и панель может быть
 * телепортирована куда угодно — на навигацию это не влияет. Подсветку для
 * скринридера передаёт `aria-activedescendant` на поле.
 *
 * Отличия от `TListKeyboardPlugin`: открытие и закрытие панели, `Home`/`End`,
 * `Escape`, `Tab`, набор по буквам, пропуск недоступных опций и прокрутка к
 * подсвеченной опции.
 */
export class TSelectKeyboardPlugin extends TListNavigationPlugin<TSelectKeyboardPluginEvents> {
	private _owner: ISelectOwner | null = null
	private _elements: TCollectionElements | null = null
	private _typeahead = ''
	private _typeaheadAt = 0
	private _typeaheadTimeout = 500

	override install(ctx: IPluginContext, options?: ISelectKeyboardPluginOptions): void {
		super.install(ctx, options)

		this._typeaheadTimeout = options?.typeaheadTimeout ?? this._typeaheadTimeout
		this._owner = ctx.getInstance<ISelectOwner>() ?? null
		this._elements = ctx.get(TCollectionElements) ?? null

		// Закрытая панель подсветку не держит: она про навигацию, а не про выбор
		this._owner?.events.on('close', () => this.clearHighlight())
		this._owner?.events.on('open', () => this._highlightSelected())
	}

	override destroy(): void {
		this._owner = null
		this._elements = null

		super.destroy()
	}

	/**
	 * Недоступные опции пропускаются: подсветить то, что нельзя выбрать,
	 * значит завести пользователя в тупик.
	 */
	protected override items(): IListItem[] {
		return super.items().filter((item) => !item.disabled && item.rendered && item.visible)
	}

	/**
	 * Подсветка появляется на открытии, а не при появлении коллекции: пока
	 * панель закрыта, навигировать нечего. Этим Select отличается от ListBox,
	 * который синхронизирует позицию с выбором сразу.
	 */
	protected override onCollectionBound(_collection: TCollectionEngine<any, any>): void {}

	/** Подсветка для скринридера плюс прокрутка к опции. */
	protected override onHighlightChanged(uid: string | number | null): void {
		const id = uid == null ? null : (this._optionElement(uid)?.id ?? null)

		this._owner?.aria.add('aria-activedescendant', id)

		// `scrollIntoView` есть не везде: его нет в jsdom и он бессмыслен для
		// узла вне документа. Прокрутка — удобство, а не часть контракта.
		if (uid != null) this._optionElement(uid)?.scrollIntoView?.({ block: 'nearest' })
	}

	protected override onKeyDown(e: KeyboardEvent): void {
		const owner = this._owner

		if (!owner) return

		if (owner.open) {
			this._handleOpen(e, owner)

			return
		}

		this._handleClosed(e, owner)
	}

	/**
	 * Закрытая панель. Стрелки и активация открывают; `↑` при этом встаёт на
	 * последнюю опцию — так пользователь попадает в конец списка одним нажатием.
	 */
	private _handleClosed(e: KeyboardEvent, owner: ISelectOwner): void {
		if (!owner.openable) return

		if (OPENS.has(e.key)) {
			e.preventDefault()
			owner.open = true

			if (e.key === 'ArrowUp' || e.key === 'End') {
				this.highlightEdge('last')
			} else if (e.key === 'ArrowDown' || e.key === 'Home') {
				this.highlightEdge('first')
			}

			return
		}

		if (this._isPrintable(e)) {
			e.preventDefault()
			owner.open = true
			this._typeaheadTo(e.key)
		}
	}

	/**
	 * Открытая панель. `Tab` не перехватываем: он должен увести фокус дальше
	 * по форме, панель при этом закрывается.
	 */
	private _handleOpen(e: KeyboardEvent, owner: ISelectOwner): void {
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault()
				this.move(1)

				return

			case 'ArrowUp':
				e.preventDefault()
				this.move(-1)

				return

			case 'Home':
				e.preventDefault()
				this.highlightEdge('first')

				return

			case 'End':
				e.preventDefault()
				this.highlightEdge('last')

				return

			case 'Enter':
			case ' ':
				e.preventDefault()
				this._chooseHighlighted()

				return

			case 'Escape':
				e.preventDefault()
				owner.open = false

				return

			case 'Tab':
				owner.open = false

				return
		}

		if (this._isPrintable(e)) {
			e.preventDefault()
			this._typeaheadTo(e.key)
		}
	}

	/** Печатный символ, а не сочетание с модификатором. */
	private _isPrintable(e: KeyboardEvent): boolean {
		return e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey
	}

	/** При открытии подсветка встаёт на выбранное — иначе на первую опцию. */
	private _highlightSelected(): void {
		const selected = this._collection?.extensions?.selection?.selected?.[0] as
			| IListItem
			| undefined

		if (selected && this.indexOf(selected.uid) !== -1) {
			this.highlight(selected.uid)

			return
		}

		this.highlightEdge('first')
	}

	private _chooseHighlighted(): void {
		if (this._highlightedUid == null) return

		const item = this.itemByUid(this._highlightedUid)

		if (item) this._collection?.extensions?.select?.chooseItem(item)
	}

	/** Ищет опцию, чей текст начинается с накопленного буфера. */
	private _typeaheadTo(char: string): void {
		const now = Date.now()

		this._typeahead =
			now - this._typeaheadAt > this._typeaheadTimeout ? char : this._typeahead + char
		this._typeaheadAt = now

		const needle = this._typeahead.toLowerCase()
		const match = (this.items() as ISelectOption[]).find((item) =>
			item.text.toLowerCase().startsWith(needle),
		)

		if (match) this.highlight(match.uid)
	}

	private _optionElement(uid: string | number): HTMLElement | null {
		return this._elements?.getElementByUid(uid) ?? null
	}
}
