import type { IPopover } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TDismissPlugin } from '../../dismiss'
import type { IDomEventTarget } from '../../../utils'
import { tabStops } from '../../../utils'
import { focusFirst, tabStopsAfter } from './tab-stops'
import type { TPopoverFocusPluginEvents } from './types'

/**
 * TPopoverFocusPlugin — модель фокуса Popover, немодального диалога APG.
 *
 * **Открытие.** Запоминает элемент, на котором был фокус, и кадром позже
 * ставит фокус на первую остановку Tab в панели, а если её нет — на саму
 * панель (`tabindex="-1"`). Кадр — потому что панель показывает и
 * содержимое при `lazyMount` монтирует рендер адаптера, а он идёт после
 * смены `open`. Popover, открытый со старта, обрабатывается так же, как
 * только корень объявлен.
 *
 * **Закрытие.** Фокус возвращается на запомненный элемент, а если там был
 * `body` или элемент уже отсоединён — на первую остановку корня, то есть на
 * триггер. Кроме закрытия, которое решил `TDismissPlugin`: нажатие мимо и
 * уход фокуса — пользователь уже там, куда нажал. Об этом плагин узнаёт
 * событием `dismiss`, которое приходит до закрытия.
 *
 * **Escape** закрывает поповер, если его ещё никто не обработал
 * (`defaultPrevented`). Сам плагин гасит его `preventDefault`, а не
 * `stopPropagation`: так Escape в открытом Select или во вложенном поповере
 * закрывает только их слой, а внешний видит, что клавиша уже потрачена.
 *
 * **Tab** ведёт себя так, будто панель стоит в документе сразу за
 * триггером, хотя телепортирована в конец `body`:
 * - Tab с последней остановки корня при открытой панели — в панель;
 * - Tab с последней остановки панели — к первой остановке после корня, и
 *   поповер закрывается без возврата фокуса. Если после корня остановок нет —
 *   закрывается так же, а Tab не гасится;
 * - Shift+Tab с первой остановки панели или с неё самой — на триггер, панель
 *   остаётся открытой.
 *
 * Слушатели клавиш — на корне и на панели, пока поповер открыт. Корень берёт
 * у `TElementPlugin`, панель и `dismiss` — у `TDismissPlugin`: панель
 * телепортирована, и найти её можно только по его пометке владельцем.
 *
 * Поповер немодальный: ловушки фокуса, `aria-modal` и `inert` нет, страница
 * за панелью доступна.
 */
export class TPopoverFocusPlugin extends TBasePlugin<any, TPopoverFocusPluginEvents> {
	private _owner: IPopover | null = null
	private _dismiss: TDismissPlugin | null = null
	private _root: Element | null = null
	/** Панель, найденная при открытии, — на ней висит слушатель клавиш. */
	private _panel: Element | null = null
	/** Узлы со слушателем клавиш: корень и панель. */
	private _targets: IDomEventTarget[] = []
	/** Открытие обработано: элемент возврата запомнен, фокус уводится в панель. */
	private _engaged = false
	/** Элемент, на котором был фокус при открытии, — на него фокус вернётся. */
	private _returnTo: Element | null = null
	/** Возвращать ли фокус при закрытии. Снимают нажатие мимо, уход фокуса и Tab из панели. */
	private _restore = true
	/** Кадр, в котором фокус уйдёт в панель; `null` — уводить некуда. */
	private _focusFrame: number | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<IPopover>()
		this._dismiss = ctx.get(TDismissPlugin) ?? null

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => {
			this._root = element

			if (this._owner?.open) this._engage()
		})

		elementPlugin?.events.on('removed', () => {
			this._unlisten()
			this._root = null
		})

		// Приходит до закрытия (`TDismissPlugin` сообщает, потом закрывает)
		this._dismiss?.events.on('dismiss', () => {
			this._restore = false
		})

		this._owner?.events.on('change:open', (open: boolean) => {
			if (open) {
				this._engage()
			} else {
				this._release()
			}
		})
	}

	override destroy(): void {
		this._cancelFocusFrame()
		this._unlisten()

		this._owner = null
		this._dismiss = null
		this._root = null
		this._returnTo = null

		super.destroy()
	}

	/** Открытие: запомнить, куда вернуть фокус, увести его в панель, слушать клавиши. */
	private _engage(): void {
		const root = this._root

		// Корня ещё нет — откроется на `ready`
		if (!root) return

		this._listen(root)

		// Корень сменился, пока панель открыта: слушатели уже на новом узле, а
		// элемент возврата и фокус в панели остаются прежними
		if (this._engaged) return

		this._engaged = true
		this._restore = true
		this._returnTo = root.ownerDocument.activeElement

		this._cancelFocusFrame()
		this._focusFrame = requestAnimationFrame(() => {
			this._focusFrame = null
			this._focusPanel()
		})
	}

	/** Закрытие: снять слушатели и вернуть фокус, если закрыло не нажатие мимо. */
	private _release(): void {
		this._cancelFocusFrame()
		this._unlisten()

		if (!this._engaged) return

		const root = this._root
		const returnTo = this._returnTo
		const restore = this._restore

		this._engaged = false
		this._returnTo = null
		this._restore = true

		if (restore && root) this._returnFocus(root, returnTo)
	}

	/** Первая остановка Tab в панели, а если её нет — сама панель. */
	private _focusPanel(): void {
		const panel = this._panel

		if (panel) focusFirst([...tabStops(panel), panel])
	}

	/**
	 * На запомненный элемент, иначе — на первую остановку корня. `body` не в
	 * счёт: на нём фокус, когда его нет нигде (открыли не с клавиатуры и не
	 * кликом по кнопке), и вернуть его туда значило бы потерять.
	 */
	private _returnFocus(root: Element, returnTo: Element | null): void {
		const doc = root.ownerDocument
		const remembered =
			returnTo &&
			returnTo.isConnected &&
			returnTo !== doc.body &&
			returnTo !== doc.documentElement
				? [returnTo]
				: []

		focusFirst([...remembered, ...tabStops(root)])
	}

	private _close(): void {
		const owner = this._owner

		if (owner) owner.open = false
	}

	private _listen(root: Element): void {
		this._unlisten()

		this._panel = this._dismiss?.findPanel() ?? null
		this._targets = this._panel ? [root, this._panel] : [root]

		for (const target of this._targets) target.addEventListener('keydown', this._onKeyDown)
	}

	private _unlisten(): void {
		for (const target of this._targets) target.removeEventListener('keydown', this._onKeyDown)

		this._targets = []
		this._panel = null
	}

	private readonly _onKeyDown = (event: KeyboardEvent): void => {
		if (event.defaultPrevented) return

		if (event.key === 'Escape') {
			event.preventDefault()
			this._close()

			return
		}

		if (event.key === 'Tab') this._onTab(event)
	}

	private _onTab(event: KeyboardEvent): void {
		const root = this._root
		const panel = this._panel
		const active = root?.ownerDocument.activeElement

		if (!root || !panel || !active) return

		if (panel.contains(active)) {
			if (event.shiftKey) {
				this._tabBackFromPanel(event, root, panel, active)
			} else {
				this._tabForwardFromPanel(event, root, panel, active)
			}

			return
		}

		if (!event.shiftKey && root.contains(active)) this._tabIntoPanel(event, root, panel, active)
	}

	/** Tab с последней остановки корня — в панель, как будто она стоит сразу за триггером. */
	private _tabIntoPanel(
		event: KeyboardEvent,
		root: Element,
		panel: Element,
		active: Element,
	): void {
		if (active !== tabStops(root).at(-1)) return

		if (focusFirst([...tabStops(panel), panel])) event.preventDefault()
	}

	/** Shift+Tab с первой остановки панели или с неё самой — на триггер; панель остаётся открытой. */
	private _tabBackFromPanel(
		event: KeyboardEvent,
		root: Element,
		panel: Element,
		active: Element,
	): void {
		if (active !== panel && active !== tabStops(panel)[0]) return

		if (focusFirst(tabStops(root).reverse())) event.preventDefault()
	}

	/**
	 * Tab с последней остановки панели — к первой остановке после корня.
	 * Поповер закрывается без возврата фокуса: фокус уходит дальше по
	 * странице. Остановок после корня нет — Tab не гасится, фокус уводит
	 * браузер.
	 */
	private _tabForwardFromPanel(
		event: KeyboardEvent,
		root: Element,
		panel: Element,
		active: Element,
	): void {
		if (active !== (tabStops(panel).at(-1) ?? panel)) return

		this._restore = false
		this._close()

		if (focusFirst(tabStopsAfter(root, panel))) event.preventDefault()
	}

	private _cancelFocusFrame(): void {
		if (this._focusFrame === null) return

		cancelAnimationFrame(this._focusFrame)
		this._focusFrame = null
	}
}
