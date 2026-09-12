import type {
	IBatchExtension,
	IControl,
	IList,
	ISelect,
	ISelectItem,
	TCollectionEngine,
} from '@soldy/core'
import type { IPluginContext } from '../../../base'
import { TCollectionElements } from '../../collection'
import { TListNavigationPlugin } from '../../list/navigation'
import type { ISelectKeyboardPluginOptions, TSelectKeyboardPluginEvents } from './types'

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
	private _owner: ISelect | null = null
	private _elements: TCollectionElements | null = null
	private _list: IList | null = null
	private _typeahead = ''
	private _typeaheadAt = 0
	private _typeaheadTimeout = 500

	override install(ctx: IPluginContext, options?: ISelectKeyboardPluginOptions): void {
		super.install(ctx, options)

		this._typeaheadTimeout = options?.typeaheadTimeout ?? this._typeaheadTimeout
		this._owner = ctx.getInstance<ISelect>() ?? null
		this._elements = ctx.get(TCollectionElements) ?? null
		this._list = ctx.getInstance<IList>()

		// Закрытая панель подсветку не держит: она про навигацию, а не про выбор
		this._owner?.events.on('close', () => this.clearHighlight())
		this._owner?.events.on('open', () => this._highlightSelected())
	}

	override destroy(): void {
		this._owner = null
		this._elements = null
		this._list = null

		super.destroy()
	}

	/**
	 * Недоступные опции пропускаются: подсветить то, что нельзя выбрать,
	 * значит завести пользователя в тупик.
	 */
	protected override items(): IControl[] {
		return super.items().filter((item) => !item.disabled && item.rendered && item.visible)
	}

	/**
	 * Подсветка появляется на открытии, а не при появлении коллекции: пока
	 * панель закрыта, навигировать нечего. Этим Select отличается от ListBox,
	 * который синхронизирует позицию с выбором сразу.
	 *
	 * От коллекции нужно другое — `change:shown`. Выдача сужается под отбором
	 * (`filter.query`), откуда бы он ни пришёл — из ввода в поле или из кода,
	 * — и подсветка может остаться на опции, которой на экране больше нет.
	 * Тогда `Enter` выбрал бы скрытое, а `aria-activedescendant` указывал бы
	 * в пустоту, поэтому подсветка переезжает на первую из оставшихся.
	 *
	 * Чинит это сам плагин, а не тот, кто поменял отбор: подсветка — его
	 * состояние, и знать о ней отбору незачем.
	 */
	protected override onEngineBound(engine: TCollectionEngine<any, any>): void {
		const batch = engine.extensions.batch as IBatchExtension<IControl>

		batch.events.on('change:shown', () => {
			// Подсветки нет — ставить её на смене выдачи незачем: панель может
			// быть и закрыта
			if (this._highlightedUid == null) return
			if (this.indexOf(this._highlightedUid) !== -1) return

			const first = this.items()[0]

			if (first) {
				this.highlight(first.uid)
			} else {
				this.clearHighlight()
			}
		})
	}

	/** Подсветка для скринридера плюс прокрутка к опции. */
	protected override onHighlightChanged(uid: string | number | null): void {
		const id = uid == null ? null : (this._optionElement(uid)?.id ?? null)

		this._owner?.aria.add('aria-activedescendant', id)

		if (uid != null) this._scrollTo(uid)
	}

	/**
	 * Прокрутка к подсвеченной опции с оглядкой на `scrollBehavior`.
	 *
	 * Свойство читается у инстанса (`IList`) — так же, как его читает
	 * `TListScrollPlugin` у ListBox. Сам плагин прокрутки Select не подключает:
	 * тот ходит за выбором, а здесь прокрутка идёт за подсветкой, и это разные
	 * события. Общим остаётся свойство, а не реализация.
	 *
	 * `scrollIntoView` есть не везде: его нет в jsdom и он бессмыслен для узла
	 * вне документа. Прокрутка — удобство, а не часть контракта.
	 */
	private _scrollTo(uid: string | number): void {
		const behavior = this._list?.scrollBehavior ?? 'smooth'

		if (behavior === 'none') return

		this._optionElement(uid)?.scrollIntoView?.({
			block: 'nearest',
			behavior: behavior === 'instant' ? 'instant' : 'smooth',
		})
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
	 *
	 * В `editable` `Home`/`End`/пробел и печатные символы не перехватываются:
	 * они принадлежат тексту поля, а не навигации по списку.
	 */
	private _handleClosed(e: KeyboardEvent, owner: ISelect): void {
		if (!owner.openable) return

		if (this._opensPanel(e, owner)) {
			e.preventDefault()
			owner.open = true

			if (e.key === 'ArrowUp' || e.key === 'End') {
				this.highlightEdge('last')
			} else if (e.key === 'ArrowDown' || e.key === 'Home') {
				this.highlightEdge('first')
			}

			return
		}

		if (!owner.editable && this._isPrintable(e)) {
			e.preventDefault()
			owner.open = true
			this._typeaheadTo(e.key)
		}
	}

	/**
	 * Какие клавиши открывают закрытую панель. В `editable` `Home`/`End`/
	 * пробел исключены — они двигают курсор и печатают в тексте поля.
	 */
	private _opensPanel(e: KeyboardEvent, owner: ISelect): boolean {
		if (!OPENS.has(e.key)) return false
		if (owner.editable && (e.key === 'Home' || e.key === 'End' || e.key === ' ')) return false

		return true
	}

	/**
	 * Открытая панель. `Tab` не перехватываем: он должен увести фокус дальше
	 * по форме, панель при этом закрывается.
	 *
	 * В `editable` `Home`/`End` не двигают подсветку (они двигают курсор в
	 * тексте), пробел не выбирает подсвеченное (он печатается), а печатные
	 * символы не запускают набор по буквам — всё это принадлежит тексту поля.
	 */
	private _handleOpen(e: KeyboardEvent, owner: ISelect): void {
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
				if (owner.editable) break
				e.preventDefault()
				this.highlightEdge('first')

				return

			case 'End':
				if (owner.editable) break
				e.preventDefault()
				this.highlightEdge('last')

				return

			case 'Enter':
				e.preventDefault()
				this._chooseHighlighted()

				return

			case ' ':
				if (owner.editable) break
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

		if (!owner.editable && this._isPrintable(e)) {
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
		const selected = this._engine?.extensions?.selection?.selected?.[0] as
			| IControl
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

		if (item) this._engine?.extensions?.select?.chooseItem(item)
	}

	/** Ищет опцию, чей текст начинается с накопленного буфера. */
	private _typeaheadTo(char: string): void {
		const now = Date.now()

		this._typeahead =
			now - this._typeaheadAt > this._typeaheadTimeout ? char : this._typeahead + char
		this._typeaheadAt = now

		this.highlightByText(this._typeahead)
	}

	/**
	 * Подсветить первую опцию, чей текст начинается с `needle` — без учёта
	 * регистра. Пустая строка снимает подсветку.
	 *
	 * Один алгоритм на два источника: набор с клавиатуры (`_typeaheadTo`) и
	 * ввод в поле в режиме `search` (`TEditablePlugin`) — оба лишь находят
	 * опцию, подсветка и `aria-activedescendant` остаются здесь, в одной
	 * точке.
	 */
	highlightByText(needle: string): void {
		if (!needle) {
			this.clearHighlight()

			return
		}

		const lower = needle.toLowerCase()
		const match = (this.items() as ISelectItem[]).find((item) =>
			item.text.toLowerCase().startsWith(lower),
		)

		if (match) {
			this.highlight(match.uid)
		} else {
			this.clearHighlight()
		}
	}

	private _optionElement(uid: string | number): HTMLElement | null {
		return this._elements?.getElementByUid(uid) ?? null
	}
}
