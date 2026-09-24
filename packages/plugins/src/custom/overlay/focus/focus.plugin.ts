import { TBasePlugin } from '../../../base'
import type { IPluginContext, TPluginEvents } from '../../../base'
import { TElementPlugin } from '../../element'
import { TDismissPlugin } from '../../dismiss'
import type { IDomEventTarget } from '../../../utils'
import { focusFirst, tabStops } from '../../../utils'
import { bindOverlayOpen } from '../open-state'
import type { IOverlayOpenOptions, IOverlayOpenState } from '../types'

/**
 * TOverlayFocusPlugin — общая часть модели фокуса всего, что открывается
 * поверх страницы.
 *
 * Одинаково у модального и немодального оверлея всё, кроме Tab: запомнить,
 * откуда открыли, увести фокус в панель, вернуть его при закрытии и закрыться
 * по Escape. Стратегий Tab две, и различаются они целиком, а не деталью:
 * немодальная панель пропускает фокус дальше по странице
 * (`TPopoverFocusPlugin`), модальная замыкает его в себе
 * (`TModalFocusPlugin`). Поэтому здесь база, а не флаг `modal` в одном
 * плагине.
 *
 * **Открытие.** Запоминает элемент, на котором был фокус, и кадром позже
 * ставит фокус на первую остановку Tab в панели, а если её нет — на саму
 * панель (`tabindex="-1"`). Кадр — потому что содержимое панели монтирует
 * рендер адаптера, а он идёт после смены открытости. Оверлей, открытый со
 * старта, обрабатывается так же, как только корень объявлен.
 *
 * **Закрытие.** Фокус возвращается на запомненный элемент, а если там был
 * `body` или элемент уже отсоединён — на то, что подставит наследник
 * (`_returnCandidates`). Кроме закрытия, которое решил `TDismissPlugin`:
 * нажатие мимо и уход фокуса — пользователь уже там, куда нажал. Об этом
 * плагин узнаёт событием `dismiss`, которое приходит до закрытия.
 *
 * **Escape** закрывает оверлей, если его ещё никто не обработал
 * (`defaultPrevented`). Сам плагин гасит его `preventDefault`, а не
 * `stopPropagation`: так Escape в открытом Select или во вложенной панели
 * закрывает только их слой, а внешний видит, что клавиша уже потрачена.
 *
 * Слушатели клавиш — на корне и на панели, пока оверлей открыт. Корень берёт
 * у `TElementPlugin`, панель и `dismiss` — у `TDismissPlugin`: панель
 * телепортирована, и найти её можно только по его пометке владельцем. Панели
 * по пометке нет (её не пометили или `TDismissPlugin` не поставлен) —
 * подставляет её наследник (`_panelFallback`): у модального окна корень и
 * есть панель, а у немодального панели просто нет.
 */
export abstract class TOverlayFocusPlugin<
	TEvents extends TPluginEvents = TPluginEvents,
> extends TBasePlugin<any, TEvents> {
	/** Открытость владельца: по ней плагин включается и ею же закрывает. */
	private _open: IOverlayOpenState | null = null
	private _dismiss: TDismissPlugin | null = null
	/** Корень компонента — на нём висит слушатель клавиш. */
	protected _root: Element | null = null
	/** Панель, найденная при открытии, — на ней тоже висит слушатель клавиш. */
	protected _panel: Element | null = null
	/** Возвращать ли фокус при закрытии. Снимают нажатие мимо и уход фокуса. */
	protected _restore = true
	/** Узлы со слушателем клавиш: корень и панель, если это разные узлы. */
	private _targets: IDomEventTarget[] = []
	/** Открытие обработано: элемент возврата запомнен, фокус уводится в панель. */
	private _engaged = false
	/** Элемент, на котором был фокус при открытии, — на него фокус вернётся. */
	private _returnTo: Element | null = null
	/** Кадр, в котором фокус уйдёт в панель; `null` — уводить некуда. */
	private _focusFrame: number | null = null

	override install(ctx: IPluginContext, options?: IOverlayOpenOptions): void {
		super.install(ctx, options)

		this._dismiss = ctx.get(TDismissPlugin) ?? null

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => {
			this._root = element

			if (this._open?.read()) this._engage()
		})

		elementPlugin?.events.on('removed', () => {
			this._unlisten()
			this._root = null
		})

		// Приходит до закрытия (`TDismissPlugin` сообщает, потом закрывает)
		this._dismiss?.events.on('dismiss', () => {
			this._restore = false
		})

		this._open = bindOverlayOpen(ctx, options, (open) => {
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

		this._open?.unbind()
		this._open = null
		this._dismiss = null
		this._root = null
		this._returnTo = null

		super.destroy()
	}

	/** Что делает Tab: наружу из панели у немодального, по кругу — у модального. */
	protected abstract _onTab(event: KeyboardEvent): void

	/**
	 * Панель, когда её не нашлось по пометке владельца. У модального оверлея
	 * панель и есть корень, у немодального панели без пометки нет.
	 */
	protected _panelFallback(_root: Element): Element | null {
		return null
	}

	/**
	 * Куда вернуть фокус, когда запомненный элемент пропал. У немодального
	 * оверлея это триггер внутри корня, у модального возвращать некуда.
	 */
	protected _returnCandidates(_root: Element): readonly Element[] {
		return []
	}

	/** Закрыть владельца — Escape и, у немодального, Tab из панели. */
	protected _close(): void {
		this._open?.write(false)
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
	 * На запомненный элемент, иначе — туда, куда указал наследник. `body` не в
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

		focusFirst([...remembered, ...this._returnCandidates(root)])
	}

	private _listen(root: Element): void {
		this._unlisten()

		this._panel = this._dismiss?.findPanel() ?? this._panelFallback(root)
		// Корень и панель бывают одним узлом — тогда и слушатель на нём один
		this._targets = this._panel && this._panel !== root ? [root, this._panel] : [root]

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

	private _cancelFocusFrame(): void {
		if (this._focusFrame === null) return

		cancelAnimationFrame(this._focusFrame)
		this._focusFrame = null
	}
}
