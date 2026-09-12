import type {
	ISelect,
	IFilterExtension,
	ISelectExtension,
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
 * На закрытии панели набранное сбрасывается и отбор снимается. Текст
 * выбранного (`engine.extensions.select.text`) плагин возвращает в поле
 * прямой записью в DOM, и это место — самое слабое здесь: значением
 * `<input>` на самом деле владеет вложенный `Input`, его `TInputPlugin`
 * пишет набранное в свой контрол, поэтому ближайший рендер Input вернёт
 * набранное обратно. Реактивным `:value="text"` не обойтись по встречной
 * причине: если текст выбранного не менялся, перерисовки не будет вовсе.
 * Чинится это не здесь, а тем, кто владеет полем, — и до решения владельца
 * оставлено как было.
 */
export class TEditablePlugin extends TBasePlugin<any, TEditablePluginEvents> {
	private _owner: ISelect | null = null
	private _keyboard: TSelectKeyboardPlugin | null = null
	private _engine: TCollectionEngine<any, any> | null = null
	private _input: HTMLInputElement | null = null
	private _listening = false
	private _query = ''
	private readonly _onInput = this._handleInput.bind(this)

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<ISelect>() ?? null
		this._keyboard = ctx.get(TSelectKeyboardPlugin) ?? null

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', () => {
			const el = elementPlugin.element

			if (!el) return

			this._input = el.querySelector<HTMLInputElement>('input')
			this._syncListener()
		})

		elementPlugin?.events.on('removed', () => {
			this._unlisten()
			this._input = null
		})

		ctx.get(TCollectionBundlesPlugin)?.events.on('engine:bound', (engine) => {
			this._engine = engine
		})

		// Оба свойства решают одно: слушать ввод или нет
		this._owner?.events.on('change:editable', () => this._syncListener())
		this._owner?.events.on('change:editableMode', () => this._syncListener())

		this._owner?.events.on('close', () => this._reset())
	}

	override destroy(): void {
		this._unlisten()

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
	 */
	private _filter(value: string): void {
		const filter = this._filterExtension

		if (!filter) return

		filter.query = value

		if (value) this._open()
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
	 * Панель закрылась — набранное сбрасывается, отбор снимается, поле
	 * возвращает текст выбранного.
	 */
	private _reset(): void {
		this._setQuery('')
		this._filterExtension?.clear()

		if (this._input) this._input.value = this._selectedText()
	}

	private get _filterExtension(): IFilterExtension<ISelectItem> | undefined {
		return this._engine?.extensions?.filter as IFilterExtension<ISelectItem> | undefined
	}

	private _selectedText(): string {
		const select = this._engine?.extensions?.select as ISelectExtension | undefined

		return select?.text ?? ''
	}
}
