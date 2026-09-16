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
import type { TListEdge } from '../../list/navigation'
import { TEditableKeyboardStrategy, TSelectOnlyKeyboardStrategy } from './strategies'
import type { ISelectKeyboardHost, ISelectKeyboardStrategy } from './strategies'
import type { ISelectKeyboardPluginOptions, TSelectKeyboardPluginEvents } from './types'

/**
 * TSelectKeyboardPlugin — клавиатура поля выбора по паттерну APG Combobox.
 *
 * Общая механика — подписка на `keydown`, привязка к коллекции, учёт
 * подсветки, циклический сдвиг — в `TListNavigationPlugin`. Что делают
 * конкретные клавиши, решает выбранная стратегия (`strategies/`):
 * `TSelectOnlyKeyboardStrategy` и `TEditableKeyboardStrategy` — обе поверх
 * общей части `TSelectKeyboardStrategy`. Плагин сам не проверяет
 * `owner.editable` нигде — режим выражен подпиской на `change:editable`,
 * которая переключает стратегию, а не веткой внутри обработчика.
 *
 * Ключевое свойство паттерна: **DOM-фокус никогда не уходит с поля**. Поэтому
 * `keydown` слушается на корне Select, а не на списке, и панель может быть
 * телепортирована куда угодно — на навигацию это не влияет. Подсветку для
 * скринридера передаёт `aria-activedescendant` на поле.
 */
export class TSelectKeyboardPlugin
	extends TListNavigationPlugin<TSelectKeyboardPluginEvents>
	implements ISelectKeyboardHost
{
	private _owner: ISelect | null = null
	private _elements: TCollectionElements | null = null
	private _list: IList | null = null
	private _strategy: ISelectKeyboardStrategy = new TSelectOnlyKeyboardStrategy()
	private _typeahead = ''
	private _typeaheadAt = 0
	private _typeaheadTimeout = 500

	override install(ctx: IPluginContext, options?: ISelectKeyboardPluginOptions): void {
		super.install(ctx, options)

		this._typeaheadTimeout = options?.typeaheadTimeout ?? this._typeaheadTimeout
		this._owner = ctx.getInstance<ISelect>() ?? null
		this._elements = ctx.get(TCollectionElements) ?? null
		this._list = ctx.getInstance<IList>()

		this._syncStrategy()
		this._owner?.events.on('change:editable', () => this._syncStrategy())

		// Закрытая панель подсветку не держит: она про навигацию, а не про выбор
		this._owner?.events.on('close', () => this.clearHighlight())
	}

	override destroy(): void {
		this._owner = null
		this._elements = null
		this._list = null

		super.destroy()
	}

	/** Стратегия по режиму `editable` — выбор класса, а не проверка внутри. */
	private _syncStrategy(): void {
		this._strategy = this._owner?.editable
			? new TEditableKeyboardStrategy()
			: new TSelectOnlyKeyboardStrategy()
	}

	/**
	 * Недоступные опции пропускаются: подсветить то, что нельзя выбрать,
	 * значит завести пользователя в тупик.
	 */
	protected override items(): IControl[] {
		return super.items().filter((item) => !item.disabled && item.rendered && item.visible)
	}

	/**
	 * Подсветка сама по открытию не появляется — только по клавиатуре (см.
	 * `highlightSelected`, вызываемый из стратегий). Но раз подсветка может
	 * быть выставлена, а выдача — сузиться под отбором (`filter.query`),
	 * откуда бы он ни пришёл — из ввода в поле или из кода, — нужно следить,
	 * чтобы она не осталась на опции, которой на экране больше нет. Тогда
	 * `Enter` выбрал бы скрытое, а `aria-activedescendant` указывал бы в
	 * пустоту, поэтому подсветка переезжает на первую из оставшихся.
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

	/**
	 * Подсветка для скринридера плюс прокрутка к опции.
	 *
	 * `id` опции — из её набора `aria`, а не с DOM-узла: узел, который знает
	 * плагин, — корень элемента, а `id` вместе со всей ARIA опции стоит на её
	 * строке. В набор его пишет `TSelectExtension`, и ссылка берёт ровно то,
	 * что окажется в разметке.
	 */
	protected override onHighlightChanged(uid: string | number | null): void {
		const id = uid == null ? null : (this.itemByUid(uid)?.aria.get('id') ?? null)

		this._owner?.field.aria.add('aria-activedescendant', id)

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
			this._strategy.handleOpen(e, owner, this)
		} else {
			this._strategy.handleClosed(e, owner, this)
		}
	}

	/* ---------------------------------------------------------------- */
	/* ISelectKeyboardHost — публичный контракт для стратегий              */
	/* ---------------------------------------------------------------- */

	navigate(step: number): void {
		this.move(step)
	}

	jumpTo(edge: TListEdge): void {
		this.highlightEdge(edge)
	}

	chooseHighlighted(): void {
		if (this._highlightedUid == null) return

		const item = this.itemByUid(this._highlightedUid)

		if (item) this._engine?.extensions?.select?.chooseItem(item)
	}

	typeaheadTo(char: string): void {
		const now = Date.now()

		this._typeahead =
			now - this._typeaheadAt > this._typeaheadTimeout ? char : this._typeahead + char
		this._typeaheadAt = now

		this.highlightByText(this._typeahead)
	}

	emitClosedEscape(): void {
		this.events.emit('escape')
	}

	/**
	 * Подсветка встаёт на выбранную опцию — иначе на первую.
	 *
	 * Публичный метод: стратегии зовут его из закрытия и навигации, а
	 * `TEditablePlugin` — при первом открытии панели набором фильтра
	 * (`editableMode: 'filter'`), где своей клавиатурной подсказки нет. Клик и
	 * любое другое открытие без явного участника подсветку не ставят.
	 */
	highlightSelected(): void {
		const selected = this._engine?.extensions?.selection?.selected?.[0] as IControl | undefined

		if (selected && this.indexOf(selected.uid) !== -1) {
			this.highlight(selected.uid)

			return
		}

		this.highlightEdge('first')
	}

	/**
	 * Подсветить первую опцию, чей текст совпал с `needle` — без учёта
	 * регистра. Пустая строка снимает подсветку.
	 *
	 * Один метод на два источника, у каждого свой способ сравнения:
	 *
	 * - `startsWith` (по умолчанию) — набор с клавиатуры (`typeaheadTo`), как
	 *   того требует WAI-ARIA для закрытого списка;
	 * - `includes` — ввод в поле в режиме `search` (`TEditablePlugin`): там
	 *   ищут подстроку в любом месте текста, как в режиме `filter`.
	 *
	 * Подсветка и `aria-activedescendant` в обоих случаях остаются здесь, в
	 * одной точке.
	 */
	highlightByText(needle: string, mode: 'startsWith' | 'includes' = 'startsWith'): void {
		if (!needle) {
			this.clearHighlight()

			return
		}

		const lower = needle.toLowerCase()
		const match = (this.items() as ISelectItem[]).find((item) => {
			const text = item.text.toLowerCase()

			return mode === 'includes' ? text.includes(lower) : text.startsWith(lower)
		})

		if (match) {
			this.highlight(match.uid)
		} else {
			this.clearHighlight()
		}
	}

	private _optionElement(uid: string | number): Element | null {
		return this._elements?.getElementByUid(uid) ?? null
	}
}
