import type { ICalendar, ICalendarViewExtension, TCalendarCollection } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginBundle, IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin, TCollectionElements } from '../../collection'
import { isFocusableElement } from '../../../utils'
import type { IDomEventTarget } from '../../../utils'
import { dayElementOf, dayOf, pagerOf, pickerPartOf } from '../parts'
import type { TCalendarPager } from '../types'
import type { TCalendarKeyboardPluginEvents, TCalendarMove } from './types'

/**
 * Переходы фокуса по клавишам — APG, Date Picker Dialog: ←/→ — день, ↑/↓ —
 * неделя, Home/End — края недели, PageUp/PageDown — месяц, с Shift — год.
 * Даты считает расширение фокуса, клавиша только называет команду.
 */
const MOVES: Readonly<Record<string, TCalendarMove>> = {
	ArrowLeft: (focus, { rtl }) => focus.shiftFocus('day', rtl ? 1 : -1),
	ArrowRight: (focus, { rtl }) => focus.shiftFocus('day', rtl ? -1 : 1),
	ArrowUp: (focus) => focus.shiftFocus('week', -1),
	ArrowDown: (focus) => focus.shiftFocus('week', 1),
	Home: (focus) => focus.moveFocusToEdge('start'),
	End: (focus) => focus.moveFocusToEdge('end'),
	PageUp: (focus, { shift }) => focus.shiftFocus(shift ? 'year' : 'month', -1),
	PageDown: (focus, { shift }) => focus.shiftFocus(shift ? 'year' : 'month', 1),
}

/** Клавиши выбора дня под фокусом. */
const CHOOSE_KEYS: ReadonlySet<string> = new Set(['Enter', ' '])

/** Погасла ли кнопка листания — по выходу вида коллекции. */
const PAGER_OFF: Readonly<Record<TCalendarPager, (view: ICalendarViewExtension) => boolean>> = {
	prev: (view) => view.prevDisabled,
	next: (view) => view.nextDisabled,
}

/**
 * TCalendarKeyboardPlugin — клавиатура календаря по APG (Date Picker Dialog)
 * и DOM-фокус, который идёт за фокусом коллекции.
 *
 * Все сетки — одна остановка Tab (roving tabindex): `tabindex` дней пишет
 * расширение фокуса коллекции, потому что атрибут обязан стоять с первой
 * отрисовки, включая серверную. Здесь только то, что требует DOM: слушатели
 * на корне и перенос фокуса.
 *
 * **Клавиши** берутся только с самой ячейки дня: у содержимого слота дня свои
 * клавиши. Переходы (`MOVES`) — команды расширения фокуса, Enter и пробел —
 * выбор дня, Escape — отмена начатого диапазона, и только когда якорь стоит:
 * без него клавиша не наша, её ждёт панель DatePicker. Обработанная клавиша
 * гасится `preventDefault`, а не `stopPropagation`. Перед переходом плагин
 * снимает день под указателем: предпросмотр диапазона идёт за клавишами, а не
 * за указателем, который остался где был.
 *
 * Enter и пробел на ячейке — только здесь: `click` из них браузер у `td` не
 * делает, а плагин указателя слушает нажатия, так что день выбирается один раз.
 *
 * **Фокус.** `focusin` на дне сообщает фокусу коллекции день — от клавиш,
 * нажатия и `focus()` из кода, одним путём. Обратно — `change:focusedDate`:
 * если DOM-фокус стоял на дне, он переходит на день новой даты. Узла этого
 * дня может ещё не быть — PageDown увёл сетку в новый месяц, а разметка его
 * ещё не нарисовала. Тогда плагин ждёт регистрации дня в коллекции, а потом
 * его узла (`ready`). Ждёт он день с фокусом коллекции на момент прихода
 * узла, а не дату, запомненную заранее: ожидание одно, и фокус, сменившийся
 * за время ожидания, его заменяет. Снимают ожидание фокус, ушедший из
 * календаря, фокус на не-дне и `destroy()`.
 *
 * Фокус на кнопке листания остаётся на ней: листание двигает фокус коллекции
 * вместе с сеткой, но не DOM. Кроме случая, когда кнопка погасла у края под
 * фокусом (`change:paging`): выключенная кнопка фокус теряет, и он упал бы на
 * страницу, поэтому плагин переводит его на остановку сетки, как React Aria.
 *
 * То же у стрелок панели выбора месяца и года (`change:pickers`): стрелка
 * погасла у границы лет под фокусом — фокус на список той же панели. Решает
 * выход расширения, а не атрибут: разметка выключит кнопку позже, а фокус
 * должен уйти с неё раньше.
 */
export class TCalendarKeyboardPlugin extends TBasePlugin<ICalendar, TCalendarKeyboardPluginEvents> {
	private _owner: ICalendar | null = null
	/** Корень: на нём слушатели, по нему же направление письма. */
	private _root: Element | null = null
	private _elements: TCollectionElements | null = null
	private _engine: TCalendarCollection | null = null
	/** DOM-фокус ждёт узла дня с фокусом коллекции. */
	private _following = false
	/** Снять подписку на `ready` узла, которого ждёт фокус. */
	private _stopWaiting: (() => void) | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<ICalendar>() ?? null
		this._elements = ctx.get(TCollectionElements) ?? null

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => this._bind(element))
		elementPlugin?.events.on('removed', () => this._bind(null))

		const bundles = ctx.get(TCollectionBundlesPlugin)

		// Коллекция привязывается после install — ждём момент привязки
		bundles?.events.on('engine:bound', (engine) => this._bindEngine(engine))
		// День собран — может быть, его узла и ждёт фокус
		bundles?.events.on('bundle:registered', ({ uid, bundle }) =>
			this._onRegistered(uid, bundle),
		)
	}

	override destroy(): void {
		this._bind(null)

		this._owner = null
		this._elements = null
		this._engine = null

		super.destroy()
	}

	private _bindEngine(engine: TCalendarCollection): void {
		this._engine = engine

		this._listenTo(engine.extensions.focus.events, 'change:focusedDate', this._onFocusedDate)
		this._listenTo(engine.extensions.view.events, 'change:paging', this._onPaging)
		this._listenTo(engine.extensions.picker.events, 'change:pickers', this._onPickers)
	}

	/** Корень сменился — слушатели переезжают, ожидание узла прежнего корня снимается. */
	private _bind(root: Element | null): void {
		const previous: IDomEventTarget | null = this._root

		previous?.removeEventListener('keydown', this._onKeyDown)
		previous?.removeEventListener('focusin', this._onFocusIn)
		previous?.removeEventListener('focusout', this._onFocusOut)

		this._stopFollowing()
		this._root = root

		const target: IDomEventTarget | null = root

		target?.addEventListener('keydown', this._onKeyDown)
		target?.addEventListener('focusin', this._onFocusIn)
		target?.addEventListener('focusout', this._onFocusOut)
	}

	private readonly _onKeyDown = (event: KeyboardEvent): void => {
		// С модификатором — чужой жест: Alt+← у браузера «назад». Shift свой:
		// с ним PageUp и PageDown листают год
		if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return

		const engine = this._engine
		const day = engine ? dayOf(engine, this._elements, event.target) : undefined

		// Клавиша — только с самой ячейки: у содержимого слота дня свои клавиши
		if (!engine || !day || day.element !== event.target) return

		const { focus, selection } = engine.extensions

		if (CHOOSE_KEYS.has(event.key)) {
			// Пробел без этого прокрутил бы страницу
			event.preventDefault()
			selection.chooseDate(day.item.date)

			return
		}

		if (event.key === 'Escape') {
			if (selection.anchor === undefined) return

			event.preventDefault()
			selection.cancelRange()

			return
		}

		const move = MOVES[event.key]

		if (!move) return

		event.preventDefault()

		selection.notifyHover(undefined)
		move(focus, { rtl: this._rtl, shift: event.shiftKey })
	}

	/**
	 * Фокус пришёл на день — фокус коллекции переходит к нему: один путь для
	 * клавиш (их `focus()` тоже даёт `focusin`), нажатия и `focus()` из кода.
	 * Фокус пришёл не на день — ожидание узла больше не нужно: пользователь
	 * уже там, куда ушёл.
	 */
	private readonly _onFocusIn = (event: FocusEvent): void => {
		const engine = this._engine

		if (!engine) return

		const day = dayOf(engine, this._elements, event.target)

		if (!day) {
			this._stopFollowing()

			return
		}

		engine.extensions.focus.focusDate(day.item.date)
	}

	/**
	 * Фокус ушёл из календаря — ожидание снимается. Без `relatedTarget` фокус
	 * ушёл «никуда»: узел дня с фокусом убрала разметка или кнопка погасла под
	 * фокусом, — тогда ожидание как раз и нужно.
	 */
	private readonly _onFocusOut = (event: FocusEvent): void => {
		const next = event.relatedTarget

		if (next instanceof Node && !this._root?.contains(next)) this._stopFollowing()
	}

	/**
	 * Фокус коллекции перешёл — DOM-фокус идёт за ним, если стоял на дне или
	 * уже ждал узла: тогда он ждёт уже новый день.
	 */
	private readonly _onFocusedDate = (): void => {
		const engine = this._engine

		if (!engine) return

		if (this._following || dayOf(engine, this._elements, this._activeElement)) this._follow()
	}

	/**
	 * Кнопка листания погасла, пока на ней фокус, — фокус на остановку сетки.
	 * У выключенного календаря остановки нет, и переносить некуда.
	 */
	private readonly _onPaging = (): void => {
		const engine = this._engine
		const owner = this._owner
		const root = this._root

		if (!engine || !owner || !root || owner.disabled) return

		const pager = pagerOf(owner, root, this._activeElement)

		if (pager && PAGER_OFF[pager](engine.extensions.view)) this._follow()
	}

	/** Стрелка панели выбора погасла, пока на ней фокус, — фокус на список панели. */
	private readonly _onPickers = (): void => {
		const engine = this._engine
		const owner = this._owner

		if (!engine || !owner) return

		const pickers = engine.extensions.picker.pickers
		const hit = pickerPartOf(owner, pickers, this._activeElement)
		const picker = hit ? pickers[hit.index] : undefined

		if (!hit || !picker || hit.part === 'heading') return
		if (!(hit.part === 'prev' ? picker.prevDisabled : picker.nextDisabled)) return

		const list = hit.panel.querySelector(
			owner.classes.resolve('__picker-list', { point: true }),
		)

		if (isFocusableElement(list)) list.focus()
	}

	/** DOM-фокус — на день с фокусом коллекции; узла ещё нет — ждать его. */
	private _follow(): void {
		this._stopFollowing()
		this._following = true
		this._focusFollowed()
	}

	/**
	 * Собран день, которого ждёт фокус, — ждать его узла: регистрация идёт при
	 * сборке дня, раньше, чем фреймворк привяжет узел. Подписка — прямая: шина
	 * узла умирает вместе с набором дня.
	 */
	private _onRegistered(uid: string | number, bundle: IPluginBundle): void {
		const engine = this._engine

		if (!engine || !this._following) return

		const item = engine.extensions.batch.items.find((candidate) => candidate.uid === uid)
		const element = bundle.get(TElementPlugin)

		if (item?.date !== engine.extensions.focus.focusedDate || !element) return

		this._stopWaiting?.()

		const onReady = (): void => this._focusFollowed()

		element.events.on('ready', onReady)
		this._stopWaiting = () => element.events.off('ready', onReady)
	}

	/** Узел дня с фокусом коллекции в документе — фокус на него, ожидание снято. */
	private _focusFollowed(): void {
		const engine = this._engine
		const element = engine
			? dayElementOf(engine, this._elements, engine.extensions.focus.focusedDate)
			: null

		if (!element) return

		this._stopFollowing()

		if (!element.contains(this._activeElement) && isFocusableElement(element)) element.focus()
	}

	private _stopFollowing(): void {
		this._stopWaiting?.()
		this._stopWaiting = null
		this._following = false
	}

	private get _activeElement(): Element | null {
		return this._root?.ownerDocument.activeElement ?? null
	}

	/**
	 * Направление письма берётся вычисленным: `direction` компонента бывает
	 * `inherit`, и тогда его задаёт предок.
	 */
	private get _rtl(): boolean {
		return this._root !== null && getComputedStyle(this._root).direction === 'rtl'
	}
}
