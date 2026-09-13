import type {
	ISelect,
	IFilterExtension,
	ISelectExtension,
	ISelectionExtension,
	ISelectItem,
	TCollectionEngine,
} from '@soldy/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin } from '../../collection'
import { TSelectKeyboardPlugin } from '../keyboard'
import type { TEditablePluginEvents } from './types'

/**
 * TEditablePlugin — реакция на ввод текста в поле Select при `editable: true`.
 *
 * Подписка, а не проверка на каждый ввод: плагин слушает `change:editable` и
 * `change:editableMode` и вешает обработчик `input` только тогда, когда ввод
 * вообще на что-то влияет — `editable: true` и режим не `none`. В остальное
 * время слушателя нет, и никакой логики не выполняется вовсе. Так состояние
 * поля выражено подпиской, а не условием внутри обработчика, который иначе
 * звали бы на каждое нажатие впустую.
 *
 * `editableMode` (см. `TSelect`) — значение с тремя состояниями, а этот плагин
 * — операция над ним, по одной функции на режим:
 *
 * - `search` — {@link _highlight}: подсвечивает первую опцию, чей текст
 *   начинается с набранного, тем же алгоритмом, что и набор по буквам с
 *   клавиатуры (`TSelectKeyboardPlugin.highlightByText`). Список остаётся
 *   целым, ничего не скрывается.
 * - `filter` — {@link _filter}: отдаёт набранное в `filter.query` коллекции.
 *   Отбор уже умеет `TFilterExtension` — сузить выдачу, не трогая хранилище;
 *   плагину остаётся передать текст. Отсюда и одна строка вместо второго
 *   значения поля: ни ядру, ни шести адаптерам не пришлось ничего узнать.
 *
 * Слушает `input` вложенного `<input>`, а не `keydown`: текст меняется не
 * только с клавиатуры, но и вставкой, автозаполнением, IME или очисткой поля
 * — всё это `input`-событие ловит одинаково. Узел ищется так же, как в
 * `TInputPlugin` (`el.querySelector('input')`) — разметку и адаптеры трогать
 * не пришлось.
 *
 * **Возврат поля** — одна точка (`_returnField`), а не несколько мест,
 * которые могли бы разойтись. Закрытие панели её не вызывает (владелец
 * закрывает панель кликом по стрелке, оставляя набранное как есть); точку
 * вызывают три повода:
 *
 * - второй `Escape` на уже закрытой панели (первый только закрывает —
 *   событие `escape` шлёт клавиатурная стратегия `TEditableKeyboardStrategy`,
 *   слушать `close` напрямую было бы циклом: клавиатура сама зависит от
 *   `TSelectKeyboardPlugin`);
 * - `focusout`, когда фокус ушёл и с корня, и с телепортированной панели
 *   (`data-owner`) — переход внутрь панели ничего не меняет;
 * - `change:selection` — выбор сменился, и это относится и к самому вводу:
 *   `single` показывает текст выбранного, `multiple` всегда пуст, потому что
 *   значение там в тегах, а не в поле, и это верно для обоих режимов ввода.
 *
 * Текст выбранного (`engine.extensions.select.text`) плагин возвращает в поле
 * прямой записью в DOM, и это место — самое слабое здесь: значением
 * `<input>` на самом деле владеет вложенный `Input`, его `TInputPlugin`
 * пишет набранное в свой контрол, поэтому ближайший рендер Input вернёт
 * набранное обратно. Реактивным `:value="text"` не обойтись по встречной
 * причине: если текст выбранного не менялся, перерисовки не будет вовсе.
 * Чинится это не здесь (заведено отдельной задачей).
 */
export class TEditablePlugin extends TBasePlugin<any, TEditablePluginEvents> {
	private _owner: ISelect | null = null
	private _root: HTMLElement | null = null
	private _keyboard: TSelectKeyboardPlugin | null = null
	private _engine: TCollectionEngine<any, any> | null = null
	private _input: HTMLInputElement | null = null
	private _listening = false
	private _focusListening = false
	private _query = ''
	private readonly _onInput = this._handleInput.bind(this)
	private readonly _onFocusOut = this._handleFocusOut.bind(this)

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<ISelect>() ?? null
		this._keyboard = ctx.get(TSelectKeyboardPlugin) ?? null

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', () => {
			const el = elementPlugin.element

			if (!el) return

			this._root = el
			this._input = el.querySelector<HTMLInputElement>('input')
			this._syncListener()
			this._syncFocusListener()
		})

		elementPlugin?.events.on('removed', () => {
			this._unlisten()
			this._unlistenFocus()
			this._root = null
			this._input = null
		})

		ctx.get(TCollectionBundlesPlugin)?.events.on('engine:bound', (engine) => {
			this._engine = engine

			// Не про сам ввод, а про то, что поле показывает: вне `editable`
			// текстом поля управляет разметка (`text` фасада), плагину сюда
			// вмешиваться незачем
			this._selectionExtension?.events.on('change:selection', () => {
				if (this._owner?.editable) this._returnField()
			})
		})

		// Оба свойства решают одно: слушать ввод или нет
		this._owner?.events.on('change:editable', () => {
			this._syncListener()
			this._syncFocusListener()
		})
		this._owner?.events.on('change:editableMode', () => this._syncListener())

		// Escape на уже закрытой панели — вторая половина двойного Escape
		this._keyboard?.events.on('escape', () => this._returnField())
	}

	override destroy(): void {
		this._unlisten()
		this._unlistenFocus()

		this._root = null
		this._input = null
		this._owner = null
		this._keyboard = null
		this._engine = null

		super.destroy()
	}

	/** Что сейчас набрано в поле — до выбора или закрытия панели. */
	get query(): string {
		return this._query
	}

	/** Слушаем ввод ровно тогда, когда ему есть на что влиять. */
	private _syncListener(): void {
		const owner = this._owner
		const needed = Boolean(owner?.editable) && owner?.editableMode !== 'none'

		if (needed) {
			this._listen()
		} else {
			this._unlisten()
		}
	}

	private _listen(): void {
		if (this._listening || !this._input) return

		this._input.addEventListener('input', this._onInput)
		this._listening = true
	}

	private _unlisten(): void {
		if (!this._listening) return

		this._input?.removeEventListener('input', this._onInput)
		this._listening = false
	}

	private _handleInput(event: Event): void {
		const target = event.target as HTMLInputElement | null
		const value = target?.value ?? ''

		this._setQuery(value)

		if (this._owner?.editableMode === 'filter') {
			this._filter(value)
		} else {
			this._highlight(value)
		}
	}

	/** `search` — подсветка совпадения, список остаётся целым. */
	private _highlight(value: string): void {
		if (!value) return

		this._open()
		this._keyboard?.highlightByText(value)
	}

	/**
	 * `filter` — скрытие несовпавших.
	 *
	 * Пустая строка сюда доходит и снимает отбор: в отличие от подсветки,
	 * «ничего не набрано» — это состояние, а не отсутствие события.
	 *
	 * Подсветку `filter` не расставляет по вводу, как `search`: набранное
	 * сужает выдачу, а не ищет конкретную опцию. Но у неё нет и своей
	 * клавиатурной подсказки, поэтому при первом открытии панель встаёт на
	 * выбранное или на первую из отфильтрованных сама, тем же методом, что и
	 * стрелка вниз (`TSelectKeyboardPlugin.highlightSelected`). Дальше, пока
	 * панель уже открыта, подсветка следит за сузившейся выдачей сама
	 * (`onEngineBound` в `TSelectKeyboardPlugin`).
	 */
	private _filter(value: string): void {
		const filter = this._filterExtension

		if (!filter) return

		filter.query = value

		if (!value) return

		const wasOpen = Boolean(this._owner?.open)

		this._open()

		if (!wasOpen) this._keyboard?.highlightSelected()
	}

	private _open(): void {
		if (this._owner) this._owner.open = true
	}

	private _setQuery(value: string): void {
		if (this._query === value) return

		this._query = value
		;(this.events as unknown as {
			emit(name: 'change:query', value: string): void
		}).emit('change:query', value)
	}

	/**
	 * Слушаем `focusout`, только пока поле принимает ввод — независимо от
	 * `editableMode`: в select-only фокус на панель не переключается вовсе
	 * (панель не фокусируемая часть), поэтому там слушать нечего.
	 */
	private _syncFocusListener(): void {
		if (this._owner?.editable) {
			this._listenFocus()
		} else {
			this._unlistenFocus()
		}
	}

	private _listenFocus(): void {
		if (this._focusListening || !this._input) return

		this._input.addEventListener('focusout', this._onFocusOut)
		this._focusListening = true
	}

	private _unlistenFocus(): void {
		if (!this._focusListening) return

		this._input?.removeEventListener('focusout', this._onFocusOut)
		this._focusListening = false
	}

	/**
	 * Фокус ушёл — но не в панель: она телепортирована и лежит вне поддерева
	 * поля, поэтому одного `contains()` мало, вторая граница — `data-owner`
	 * (тот же приём, что у `TDismissPlugin`).
	 */
	private _handleFocusOut(event: FocusEvent): void {
		if (this._isInside(event.relatedTarget)) return

		this._returnField()
	}

	private _isInside(target: EventTarget | null): boolean {
		if (!(target instanceof Element)) return false
		if (this._root?.contains(target)) return true

		const owner = this._owner

		return !!owner && !!target.closest(`[data-owner="${owner.uid}"]`)
	}

	/**
	 * Единая точка возврата поля: снимает набранное и отбор, пишет текст
	 * возврата. Вызывают второй `Escape` на закрытой панели, уход фокуса и
	 * смена выбора — см. JSDoc класса.
	 */
	private _returnField(): void {
		this._setQuery('')
		this._filterExtension?.clear()

		if (this._input) this._input.value = this._fieldText()
	}

	private get _filterExtension(): IFilterExtension<ISelectItem> | undefined {
		return this._engine?.extensions?.filter as IFilterExtension<ISelectItem> | undefined
	}

	private get _selectionExtension(): ISelectionExtension<ISelectItem> | undefined {
		return this._engine?.extensions?.selection as ISelectionExtension<ISelectItem> | undefined
	}

	/**
	 * Текст, который встаёт в поле при возврате. `multiple` всегда пуст —
	 * значение там показывают теги, а не текст поля; `single` — текст
	 * выбранного, пусто, если ничего не выбрано.
	 */
	private _fieldText(): string {
		if (this._selectionExtension?.multiple) return ''

		return this._selectedText()
	}

	private _selectedText(): string {
		const select = this._engine?.extensions?.select as ISelectExtension | undefined

		return select?.text ?? ''
	}
}
