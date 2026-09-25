import type { ITooltip } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TDismissPlugin } from '../../dismiss'
import type { IDomEventTarget } from '../../../utils'
import { tooltipClosed, tooltipOpened, tooltipSkipsDelay } from './document-state'
import type { ITooltipEntry, TTooltipTriggerPluginEvents } from './types'

/**
 * TTooltipTriggerPlugin — когда подсказка показывается и когда прячется.
 *
 * Подсказку держат две причины: **курсор** — он на корне или на панели — и
 * **фокус с клавиатуры** внутри корня. Показывается она, когда появилась
 * первая, прячется, когда ушла последняя:
 * - курсор (не касание) — показ через `openDelay`, уход — скрытие через
 *   `closeDelay`. Панель под курсором подсказку держит (WCAG 1.4.13): за
 *   задержку скрытия курсор пересекает зазор между триггером и панелью;
 * - фокус с клавиатуры (`:focus-visible`) показывает сразу, уход фокуса из
 *   корня прячет сразу. Фокус от нажатия мышью на кнопку подсказку не
 *   показывает: её уже показало наведение, а нажатие закрыло. Текстовое
 *   поле браузер считает видимым и после клика — в нём печатают, — и
 *   подсказка поля показывается.
 *
 * **Нажатие** на корень и **Escape** закрывают подсказку и гасят обе причины
 * вместе с отложенным показом: курсор так и остаётся на триггере, фокус — на
 * нём же, и снова показать подсказку может только новый заход курсора или
 * новый фокус.
 *
 * Escape слушается на документе в фазе перехвата и только пока подсказка
 * открыта: её закрывают, не сдвигая ни курсор, ни фокус (WCAG 1.4.13), а
 * фокус может быть где угодно. Клавиша гасится `preventDefault`, а не
 * `stopPropagation`, — как у всего слоя оверлея: поповер под подсказкой
 * видит, что Escape уже потрачен, и сам не закрывается.
 *
 * Слушатели — на корне, а не на элементе триггера: в корне лежит только
 * триггер, и прямоугольник у них один. Так подсказка работает и у
 * выключенной кнопки — у неё `pointer-events: none`, и курсор попадает в
 * корень.
 *
 * Нажатие мимо закрывает `TDismissPlugin`, он же помечает панель и находит её
 * (`findPanel()`): она телепортирована, и ссылки на неё у плагинов нет. Без
 * него панель подсказку не держит.
 *
 * Открытость плагин ведёт по свойству владельца, а не по своим флагам:
 * `open` пишут и разметка, и код через инстанс. Любое закрытие — снаружи, мимо,
 * соседней подсказкой — сбрасывает причины и таймеры, а подсказку на экране
 * видит документ (`document-state.ts`): одна открытая и окно без задержки.
 */
export class TTooltipTriggerPlugin extends TBasePlugin<any, TTooltipTriggerPluginEvents> {
	private _owner: ITooltip | null = null
	private _dismiss: TDismissPlugin | null = null
	/** Корень: наведение, фокус и нажатие слушаются на нём. */
	private _root: Element | null = null
	/** Документ корня: на нём Escape и общее состояние подсказок. */
	private _doc: Document | null = null
	/** Панель, найденная при открытии, — курсор на ней держит подсказку. */
	private _panel: IDomEventTarget | null = null
	/** Стоят ли слушатели открытой подсказки: Escape на документе, курсор на панели. */
	private _active = false
	/** Причина «курсор»: он на корне или на панели. */
	private _hovered = false
	/** Причина «фокус»: фокус с клавиатуры внутри корня. */
	private _focused = false
	private _showTimer: ReturnType<typeof setTimeout> | null = null
	private _hideTimer: ReturnType<typeof setTimeout> | null = null
	/** Эта подсказка для документа: открылась соседка — закрыться. */
	private readonly _entry: ITooltipEntry = { close: () => this._hide() }

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<ITooltip>()
		this._dismiss = ctx.get(TDismissPlugin) ?? null
		this._listenTo(this._owner?.events, 'change:open', this._onOpenChange)

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => this._bindRoot(element))
		elementPlugin?.events.on('removed', () => this._unbindRoot())
	}

	override destroy(): void {
		this._unbindRoot()

		this._owner = null
		this._dismiss = null

		super.destroy()
	}

	private _bindRoot(element: Element): void {
		this._unbindRoot()

		// Слушателю нужна полная карта событий узла (см. `IDomEventTarget`)
		const target: IDomEventTarget = element

		target.addEventListener('pointerenter', this._onEnter)
		target.addEventListener('pointerleave', this._onLeave)
		target.addEventListener('pointerdown', this._onPress)
		target.addEventListener('focusin', this._onFocusIn)
		target.addEventListener('focusout', this._onFocusOut)

		this._root = element
		this._doc = element.ownerDocument

		// Открытая до объявления корня — со старта или из кода
		if (this._owner?.open) this._activate()
	}

	private _unbindRoot(): void {
		const root = this._root

		if (!root) return

		const target: IDomEventTarget = root

		target.removeEventListener('pointerenter', this._onEnter)
		target.removeEventListener('pointerleave', this._onLeave)
		target.removeEventListener('pointerdown', this._onPress)
		target.removeEventListener('focusin', this._onFocusIn)
		target.removeEventListener('focusout', this._onFocusOut)

		this._deactivate()

		this._root = null
		this._doc = null
	}

	private readonly _onOpenChange = (open: boolean): void => {
		if (open) {
			this._activate()
		} else {
			this._deactivate()
		}
	}

	/**
	 * Подсказка открылась: слушать Escape и курсор на панели, закрыть соседку.
	 * Отложенный показ больше не нужен — открыли и без него.
	 */
	private _activate(): void {
		this._cancelShow()

		const doc = this._doc

		// Корня ещё нет — откроется на `ready`
		if (!doc || this._active) return

		this._active = true

		doc.addEventListener('keydown', this._onKeyDown, true)

		const panel: IDomEventTarget | null = this._dismiss?.findPanel() ?? null

		panel?.addEventListener('pointerenter', this._onEnter)
		panel?.addEventListener('pointerleave', this._onLeave)

		this._panel = panel

		tooltipOpened(doc, this._entry)
	}

	/**
	 * Подсказка закрылась (или корень ушёл): причины и таймеры сбрасываются,
	 * слушатели открытой снимаются. Снова показать её может только новый заход
	 * курсора или новый фокус.
	 */
	private _deactivate(): void {
		this._hovered = false
		this._focused = false
		this._cancelShow()
		this._cancelHide()

		if (!this._active) return

		this._active = false

		this._doc?.removeEventListener('keydown', this._onKeyDown, true)
		this._panel?.removeEventListener('pointerenter', this._onEnter)
		this._panel?.removeEventListener('pointerleave', this._onLeave)
		this._panel = null

		if (this._doc) tooltipClosed(this._doc, this._entry)
	}

	/**
	 * Курсор на корне или на панели. Касание не в счёт: наведения у пальца
	 * нет, а `pointerenter` перед нажатием показал бы подсказку на каждое
	 * касание.
	 */
	private readonly _onEnter = (event: PointerEvent): void => {
		if (event.pointerType === 'touch') return

		this._hovered = true
		this._cancelHide()

		// На панель курсор попадает только у открытой: там показывать нечего
		if (!this._owner?.open) this._scheduleShow()
	}

	/** Курсор ушёл с корня или с панели: без фокуса — скрытие с задержкой. */
	private readonly _onLeave = (event: PointerEvent): void => {
		if (event.pointerType === 'touch') return

		this._hovered = false
		this._cancelShow()

		if (!this._focused) this._scheduleHide()
	}

	/** Нажатие на корень закрывает — и тем, кто навёл, и тем, кто пришёл фокусом. */
	private readonly _onPress = (): void => {
		this._cancel()
	}

	/**
	 * Фокус с клавиатуры показывает сразу. `:focus-visible` — эвристика
	 * браузера: фокус от Tab её включает, от нажатия на кнопку — нет, у
	 * текстового поля — всегда: в нём печатают.
	 */
	private readonly _onFocusIn = (event: FocusEvent): void => {
		const target = event.target

		if (!(target instanceof Element) || !target.matches(':focus-visible')) return

		this._focused = true
		this._cancelShow()
		this._cancelHide()
		this._show()
	}

	/** Фокус ушёл из корня: причина снята, без курсора — скрыть сразу. */
	private readonly _onFocusOut = (event: FocusEvent): void => {
		const next = event.relatedTarget

		// Фокус перешёл внутри корня — триггер тот же
		if (next instanceof Node && this._root?.contains(next)) return

		this._focused = false

		if (this._hovered) return

		this._cancelHide()
		this._hide()
	}

	/**
	 * Escape у открытой подсказки, где бы ни был фокус. Потраченную кем-то
	 * клавишу не трогает; свою гасит `preventDefault` (см. шапку).
	 */
	private readonly _onKeyDown = (event: KeyboardEvent): void => {
		if (event.key !== 'Escape' || event.defaultPrevented) return

		event.preventDefault()
		this._cancel()
	}

	/** Нажатие и Escape: подсказка закрыта, обе причины и отложенный показ погашены. */
	private _cancel(): void {
		this._hovered = false
		this._focused = false
		this._cancelShow()
		this._cancelHide()
		this._hide()
	}

	/**
	 * Показ после `openDelay`, а без задержки — если другая подсказка открыта
	 * или только что закрылась (`document-state.ts`). Задержка читается здесь:
	 * новое значение действует со следующего наведения.
	 */
	private _scheduleShow(): void {
		const owner = this._owner

		if (!owner || this._showTimer !== null) return

		const delay = this._doc && tooltipSkipsDelay(this._doc) ? 0 : owner.openDelay

		if (delay <= 0) {
			this._show()

			return
		}

		this._showTimer = setTimeout(() => {
			this._showTimer = null
			this._show()
		}, delay)
	}

	/** Скрытие после `closeDelay` — только у открытой. */
	private _scheduleHide(): void {
		const owner = this._owner

		if (!owner?.open || this._hideTimer !== null) return

		const delay = owner.closeDelay

		if (delay <= 0) {
			this._hide()

			return
		}

		this._hideTimer = setTimeout(() => {
			this._hideTimer = null
			this._hide()
		}, delay)
	}

	private _show(): void {
		if (this._owner) this._owner.open = true
	}

	private _hide(): void {
		if (this._owner) this._owner.open = false
	}

	private _cancelShow(): void {
		if (this._showTimer === null) return

		clearTimeout(this._showTimer)
		this._showTimer = null
	}

	private _cancelHide(): void {
		if (this._hideTimer === null) return

		clearTimeout(this._hideTimer)
		this._hideTimer = null
	}
}
