import type {
	ISelect,
	IFilterExtension,
	ISelectExtension,
	ISelectionExtension,
	ISelectItem,
	TCollectionEngine,
} from '@soldy-ui/core'
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
 *   содержит набранное в любом месте, без учёта регистра — тем же методом,
 *   что и набор по буквам с клавиатуры (`TSelectKeyboardPlugin.highlightByText`),
 *   но со сравнением по вхождению, а не по началу строки: набор по буквам
 *   ищет один печатный символ за раз на закрытом списке (WAI-ARIA), а здесь
 *   вводят произвольный фрагмент текста. Список остаётся целым, ничего не
 *   скрывается.
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
 * **Возврат поля** — одна точка (`_returnField`), которая пишет
 * `owner.field.value` — экземпляр `TInput`, которым владеет Select (не
 * `<input>` напрямую: DOM больше нигде здесь не трогается). Закрытие панели
 * её не вызывает (владелец закрывает панель кликом по стрелке, оставляя
 * набранное как есть); точку вызывают два повода:
 *
 * - второй `Escape` на уже закрытой панели (первый только закрывает —
 *   событие `escape` шлёт клавиатурная стратегия `TEditableKeyboardStrategy`,
 *   слушать `close` напрямую было бы циклом: клавиатура сама зависит от
 *   `TSelectKeyboardPlugin`);
 * - `focusout`, когда фокус ушёл и с корня, и с телепортированной панели
 *   (`data-owner`) — переход внутрь панели ничего не меняет;
 * - смена `editable`/`editableMode` — режим сменился, значит набранное и
 *   отбор относились к прежнему режиму и больше не актуальны. Никакой
 *   умной логики (что оставить, а что сбросить) для этого редкого перехода
 *   нет намеренно: сбрасывается всё, как при обычном возврате поля.
 *
 * Выбор сюда не входит: текст выбранного (`single`) и очистку поля
 * (`multiple`) пишет сама `TSelectExtension` — `owner.field.value` меняется
 * реактивно, и вложенный `Input` перерисуется сам. Этому плагину на выбор
 * остаётся сбросить то, что относится только к вводу: набранное (`query`) и
 * отбор (`filter`) — иначе после выбора в `multiple` панель осталась бы
 * сужена прежним запросом.
 *
 * Слушает он для этого событие `choose` расширения `select`, а не
 * `change:selection`. Набор прерывает то же, что безусловно пишет поле, —
 * выбор пользователя (`chooseItem`, `clear`). Смена `value` или состава,
 * закрытие тега во время ввода поле не трогают, и сброс на
 * `change:selection` оставил бы набранное в поле, развернув список целиком.
 *
 * Реакция на сам ввод (`_handleInput`) слушает DOM-событие `input`
 * вложенного `<input>`, а не `change:value` у `field`: `_returnField` тоже
 * пишет в `field.value`, и слушай плагин это событие, собственная запись
 * возврата запустила бы повторный поиск и открыла панель.
 */
export class TEditablePlugin extends TBasePlugin<any, TEditablePluginEvents> {
	private _owner: ISelect | null = null
	private _root: Element | null = null
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

			// Текст поля на выбор пишет `TSelectExtension` сама
			// (`owner.field.value`). Плагину остаётся то, что относится
			// только к вводу: набранное и отбор — иначе выбор в `multiple`
			// оставил бы панель суженной прежним запросом. Именно на выбор
			// пользователя (`choose`), а не на любую смену выбора: её поле
			// переживает, пока в нём печатают, и отбор обязан пережить тоже.
			this._listenTo(this._selectExtension?.events, 'choose', () => {
				if (this._owner?.editable) this._resetQuery()
			})
		})

		// Оба свойства решают одно: слушать ввод или нет
		this._listenTo(this._owner?.events, 'change:editable', () => {
			this._syncListener()
			this._syncFocusListener()
			this._returnField()
		})
		this._listenTo(this._owner?.events, 'change:editableMode', () => {
			this._syncListener()
			this._returnField()
		})

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
		this._keyboard?.highlightByText(value, 'includes')
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
		this.events.emit('change:query', value)
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

		return !!owner && !!target.closest(`[data-owner="${owner.idBase}"]`)
	}

	/**
	 * Единая точка возврата поля: снимает набранное и отбор, пишет текст
	 * возврата в `owner.field.value`. Вызывают второй `Escape` на закрытой
	 * панели и уход фокуса — см. JSDoc класса.
	 */
	private _returnField(): void {
		this._resetQuery()

		if (this._owner) this._owner.field.value = this._fieldText()
	}

	/** Сбросить только набранное и отбор, не трогая текст поля. */
	private _resetQuery(): void {
		this._setQuery('')
		this._filterExtension?.clear()
	}

	private get _filterExtension(): IFilterExtension<ISelectItem> | undefined {
		return this._engine?.extensions?.filter as IFilterExtension<ISelectItem> | undefined
	}

	private get _selectionExtension(): ISelectionExtension<ISelectItem> | undefined {
		return this._engine?.extensions?.selection as ISelectionExtension<ISelectItem> | undefined
	}

	private get _selectExtension(): ISelectExtension | undefined {
		return this._engine?.extensions?.select as ISelectExtension | undefined
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
		return this._selectExtension?.text ?? ''
	}
}
