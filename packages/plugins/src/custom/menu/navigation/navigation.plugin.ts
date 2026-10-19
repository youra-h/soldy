import type { IMenuOwner } from '@soldy-ui/core'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TDismissPlugin } from '../../dismiss'
import { TCollectionElements } from '../../collection'
import { TListNavigationPlugin } from '../../list/navigation'
import type { TListEdge } from '../../list/navigation'
import { rowOf } from '../../list/row'
import { TTypeahead, itemText } from '../../list/typeahead'
import { isFocusableElement, isPrintableKey } from '../../../utils'
import type { IDomEventTarget } from '../../../utils'
import type { TMenuNavigationPluginEvents } from './types'

/**
 * TMenuNavigationPlugin — клавиатура панели одного уровня меню: корня или
 * подменю.
 *
 * Общая механика — привязка к коллекции, учёт подсветки, циклический сдвиг,
 * пропуск недоступных пунктов — в `TListNavigationPlugin`, как у ListBox и
 * Select. Своё у меню — модель фокуса: **фокус идёт за подсветкой**.
 * Подсвеченный пункт держит DOM-фокус на своей строке (`tabindex="-1"` пишет
 * коллекция), а без подсветки фокус на самой панели. Поэтому подсветка здесь
 * и есть фокус: сменилась — фокус строке, снята у открытого меню — панели.
 * Закрытие подсветку снимает, фокус не трогая: куда его вернуть, решает модель
 * фокуса уровня.
 *
 * Панель слушается, пока меню открыто, — её находит `TDismissPlugin` по
 * пометке владельцем: панель телепортирована, и до корня её клавиши не
 * всплывают. ↑/↓ — по кругу, Home и End — к крайним, буква — набор по первым
 * буквам (`TTypeahead`); пробел — буква, только пока набор идёт. Клавишу
 * панель берёт только с себя и со строк своих пунктов, как ListBox: клавиши
 * содержимого слотов (поле в пункте) принадлежат им. Клавишу, которую уже
 * обработали (`defaultPrevented`), панель не трогает: строка пункта с
 * подменю гасит свои — стрелку к концу строки, Enter и пробел, — и своё
 * подменю открывает сама (`TMenuSubmenuKeyboardPlugin`), а набор её пробела
 * не перехватывает; строка пункта с панелью так же гасит стрелку к концу
 * строки (`TMenuPopoverItemKeyboardPlugin`).
 *
 * Enter и пробел на строке не трогаются: строка — `Button` на `div`, и клик
 * из них делает её `TActionPlugin`, как браузер у `<button>`. Нажатие пункта
 * одно — клик по строке, и второго пути к нему нет. Escape и Tab — у модели
 * фокуса.
 *
 * Что слушает корень и что ещё значат клавиши панели, решает наследник:
 * у меню у кнопки корень — триггер (`TMenuKeyboardPlugin`), у подменю корень
 * — его строка в меню над ним, а стрелка к началу строки в его панели
 * закрывает уровень (`TMenuSubmenuKeyboardPlugin`).
 *
 * Наружу — открытие на крайнем пункте, подсветка пункта, её снятие и строка
 * подсвеченного: открывает и подсвечивает пункт и указатель, а строку берёт
 * модель фокуса — туда она ставит фокус при открытии.
 */
export abstract class TMenuNavigationPlugin<
	TEvents extends TMenuNavigationPluginEvents = TMenuNavigationPluginEvents,
> extends TListNavigationPlugin<TEvents> {
	/** Владелец пунктов — меню или пункт с подменю. */
	protected _owner: IMenuOwner<any> | null = null
	protected _dismiss: TDismissPlugin | null = null
	protected _elements: TCollectionElements | null = null
	/** Панель со слушателем клавиш — пока меню открыто. */
	private _panel: IDomEventTarget | null = null
	private readonly _typeahead = new TTypeahead()
	/** Как ставить фокус на смене подсветки: указатель — без прокрутки. */
	private _focusOptions: FocusOptions | undefined = undefined

	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)

		this._owner = ctx.getInstance<IMenuOwner<any>>() ?? null
		this._dismiss = ctx.get(TDismissPlugin) ?? null
		this._elements = ctx.get(TCollectionElements) ?? null

		// Панель находит `TDismissPlugin` от корня: без корня искать её негде
		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', () => this._syncPanel())
		elementPlugin?.events.on('removed', () => this._unlistenPanel())

		this._listenTo(this._owner?.events, 'change:open', (open: boolean) => {
			this._syncPanel()

			if (open) return

			// Закрытое меню подсветку не держит; фокус не трогается — его
			// возвращает модель фокуса
			this._typeahead.reset()
			this.clearHighlight()
		})
	}

	override destroy(): void {
		this._unlistenPanel()

		// Владельца нет — снятие подсветки в `destroy()` базы фокус не двигает
		this._owner = null
		this._dismiss = null
		this._elements = null

		super.destroy()
	}

	/** Строка подсвеченного пункта; `null` — подсветки нет или пункта нет в документе. */
	get highlightedRow(): Element | null {
		return this._highlightedUid === null ? null : rowOf(this._elements, this._highlightedUid)
	}

	/**
	 * Подсветить пункт — фокус его строке. Недоступный не подсвечивается.
	 *
	 * @param options — как ставить фокус: указатель зовёт без прокрутки, пункт
	 *   под ним и так виден
	 * @returns подсвечен ли пункт
	 */
	highlightItem(uid: string | number, options?: FocusOptions): boolean {
		if (!this.itemByUid(uid)) return false

		this._focusOptions = options

		try {
			this.highlight(uid)
		} finally {
			this._focusOptions = undefined
		}

		return true
	}

	/** Снять подсветку: у открытого меню фокус уходит панели. */
	unhighlight(options?: FocusOptions): void {
		this._focusOptions = options

		try {
			this.clearHighlight()
		} finally {
			this._focusOptions = undefined
		}
	}

	/**
	 * Открыть меню и подсветить крайний пункт — фокус уйдёт на его строку.
	 * Так открывают клавишей: кнопку — ↓, Enter, пробел и ↑, контекстное меню —
	 * его клавиша и Shift+F10, подменю — стрелка к концу строки, Enter и
	 * пробел на его строке.
	 */
	openAt(edge: TListEdge): void {
		const owner = this._owner

		if (!owner) return

		owner.open = true
		this.highlightEdge(edge)
	}

	/**
	 * Своя клавиша панели сверх общих — у подменю стрелка к началу строки.
	 * Обработал — `true`, и клавиша гасится здесь.
	 */
	protected onPanelKey(_e: KeyboardEvent): boolean {
		return false
	}

	/** Справа налево ли панель: стрелки по строке — по её направлению. */
	protected isRtl(): boolean {
		const panel = this._openPanel()

		return panel !== null && getComputedStyle(panel).direction === 'rtl'
	}

	/**
	 * Подсветка — фокус: подсвеченному пункту — его строке, без подсветки у
	 * открытого меню — панели. Строки нет в документе (панель ещё скрыта, её
	 * откроет следующий кадр) — фокус ставит модель фокуса при открытии.
	 */
	protected override onHighlightChanged(uid: string | number | null): void {
		const target = uid === null ? this._openPanel() : rowOf(this._elements, uid)

		if (isFocusableElement(target)) target.focus(this._focusOptions)
	}

	/** Панель открытого меню; закрытое фокус не получает. */
	private _openPanel(): Element | null {
		return this._owner?.open ? (this._dismiss?.findPanel() ?? null) : null
	}

	/** Слушать панель, пока меню открыто, — на её открытии и на объявлении корня. */
	private _syncPanel(): void {
		const panel: IDomEventTarget | null = this._openPanel()

		if (panel === this._panel) return

		this._unlistenPanel()

		if (!panel) return

		this._panel = panel
		panel.addEventListener('keydown', this._onPanelKeyDown)
	}

	private _unlistenPanel(): void {
		this._panel?.removeEventListener('keydown', this._onPanelKeyDown)
		this._panel = null
	}

	/** Клавиша панели — с неё самой или со строки показанного пункта. */
	private _isOwnKey(e: KeyboardEvent): boolean {
		if (e.target === e.currentTarget) return true

		return this.shown().some((item) => rowOf(this._elements, item.uid) === e.target)
	}

	private readonly _onPanelKeyDown = (e: KeyboardEvent): void => {
		if (e.defaultPrevented || !this._isOwnKey(e)) return

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
		}

		if (this.onPanelKey(e)) {
			e.preventDefault()

			return
		}

		// Пробел вне набора — нажатие строки: клик из него делает она сама
		if (e.key === ' ' && !this._typeahead.typing()) return

		if (!isPrintableKey(e)) return

		e.preventDefault()
		this._typeTo(e.key)
	}

	/** Буква набора: подсветка — на найденный пункт, нет такого — на месте. */
	private _typeTo(char: string): void {
		const current = this._highlightedUid === null ? null : this.itemByUid(this._highlightedUid)
		const match = this._typeahead.next(char, this.items(), current, itemText)

		if (match) this.highlight(match.uid)
	}
}
