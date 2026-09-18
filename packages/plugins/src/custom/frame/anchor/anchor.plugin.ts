import type { IFrame, TDefaultValues } from '@soldy/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import type {
	IAnchorPluginOptions,
	IAnchorPluginProps,
	TAnchorPluginEvents,
	TFramePlacement,
} from './types'

/**
 * TAnchorPlugin — привязка Frame к чужому элементу.
 *
 * Общий слой для всего, что открывается у чего-то: выпадающий список Select,
 * меню у кнопки, поповер, подсказка. Сам ничего не рисует — вычисляет
 * координаты и пишет их во Frame (`x`, `y`, при `matchWidth` ещё `width`).
 * Дальше их раскладывает `TFrameLayoutPlugin`, как любые другие координаты.
 *
 * Разделение не формальное: раскладка отвечает за собственные пропсы Frame,
 * привязка — за слежение за посторонним элементом. Смешивать их значит
 * заводить в одном плагине два повода меняться.
 *
 * Поверх выбора потребителя (`placement`) плагин сам решает две вещи:
 * **flip** — если панель не влезает по высоте окна с выбранной стороны, а с
 * противоположной места больше, показывает её там; **shift** — сдвигает
 * панель по горизонтали, чтобы она не вылезала за левый и правый край окна.
 * Оба работают внутри тех же четырёх вариантов `placement`: flip переключает
 * `top`/`bottom`, shift не меняет `placement`, а только ограничивает `x`.
 * Flip выключается свойством `flip` (по умолчанию включён): панель остаётся на
 * стороне потребителя, даже если там не влезает. Shift от него не зависит.
 * `RTL` (`getComputedStyle(anchor).direction`) разворачивает `-start`/`-end`:
 * в RTL `-start` выравнивает панель по правому краю якоря, `-end` — по левому.
 *
 * Фактическая сторона после flip уходит теме через `data-placement` на самом
 * Frame (`frame.dataset`) — она не всегда совпадает с тем, что задал
 * потребитель в `placement`.
 *
 * Работает только при `position: 'fixed'`: координаты берутся из
 * `getBoundingClientRect()`, то есть относительно окна, а при `absolute`
 * отсчёт шёл бы от позиционированного предка.
 *
 * По той же причине оба наблюдателя (`ResizeObserver`) смотрят border-box:
 * наблюдать надо ровно то, что меряем. Умолчание `content-box` пропустило бы
 * смену одной рамки или паддинга — толщина рамки по состоянию, паддинг по
 * размеру, — и координаты держались бы устаревшими до ближайшего
 * scroll/resize окна.
 */
export class TAnchorPlugin extends TBasePlugin<any, TAnchorPluginEvents> {
	/**
	 * Умолчания пропов плагина. Из них стартуют поля плагина, и их же
	 * `definePlugin` кладёт в декларации пропов: значение живёт в одном месте.
	 * `flip: true` в приватном поле адаптер не увидел бы и отдал бы Frame без
	 * `anchor_flip` своё `false`.
	 *
	 * `anchor: null` — «панель ни к чему не привязана». Якорь не опция, его
	 * задаёт только разметка, но умолчание объявлено и ему: снятый из разметки
	 * проп связка возвращает к умолчанию декларации, и без него панель
	 * оставалась бы привязанной к прежнему элементу.
	 */
	static defaultValues: TDefaultValues<
		IAnchorPluginProps,
		'anchor' | 'placement' | 'matchWidth' | 'flip' | 'offset'
	> = {
		anchor: null,
		placement: 'bottom-start',
		matchWidth: false,
		flip: true,
		offset: 0,
	}

	private _frame: IFrame | null = null
	private _element: Element | null = null
	/** Якорю нужны только `getBoundingClientRect()` и `parentElement` — хватает `Element`. */
	private _anchor: Element | null = TAnchorPlugin.defaultValues.anchor
	private _placement: TFramePlacement = TAnchorPlugin.defaultValues.placement
	private _matchWidth = TAnchorPlugin.defaultValues.matchWidth
	private _flip = TAnchorPlugin.defaultValues.flip
	private _offset = TAnchorPlugin.defaultValues.offset
	private _cleanups: Array<() => void> = []
	private _panelObserver: ResizeObserver | null = null
	/**
	 * Кадр, в котором вернётся наблюдение панели, снятое на уведомление якоря
	 * (см. `_onAnchorResize`); `null` — возвращать нечего.
	 */
	private _panelResumeFrame: number | null = null
	/** Сторона, реально отданная во Frame — по ней решаем, менялся ли `data-placement`. */
	private _actualPlacement: TFramePlacement | null = null

	override install(ctx: IPluginContext, options?: IAnchorPluginOptions): void {
		super.install(ctx, options)

		this._placement = options?.placement ?? this._placement
		this._matchWidth = options?.matchWidth ?? this._matchWidth
		this._flip = options?.flip ?? this._flip
		this._offset = options?.offset ?? this._offset
		this._frame = ctx.getInstance<IFrame>() ?? null

		const elementPlugin = ctx.get(TElementPlugin)

		// Размер панели меняется вместе с содержимым (выросший Popover, теги
		// перенеслись) без единого scroll/resize — за ним следит свой наблюдатель.
		// Его колбэк ничего не приостанавливает: `observe()` сразу присылает
		// уведомление, и пауза здесь зациклилась бы (см. `_onAnchorResize`).
		elementPlugin?.events.on('ready', (element) => {
			this._cancelPanelResume()
			this._element = element
			this._panelObserver?.disconnect()
			this._panelObserver = new ResizeObserver(() => this._update())
			this._panelObserver.observe(element, { box: 'border-box' })
			this._update()
		})

		elementPlugin?.events.on('removed', () => {
			this._cancelPanelResume()
			this._panelObserver?.disconnect()
			this._panelObserver = null
			this._element = null
		})

		// Панель могла открыться после того, как якорь уже назначен
		this._frame?.events.on('show', () => this._update())
	}

	setAnchor(element: Element): void {
		if (this._anchor === element) return

		this._anchor = element
		this._subscribe()
		this._update()
		this.events.emit('change:anchor', element)
	}

	removeAnchor(): void {
		if (!this._anchor) return

		this._anchor = null
		this._unsubscribe()
		this._actualPlacement = null
		this._frame?.dataset.add('placement', null)
		this.events.emit('change:anchor', null)
	}

	get anchor(): Element | null {
		return this._anchor
	}

	get placement(): TFramePlacement {
		return this._placement
	}

	set placement(value: TFramePlacement) {
		if (this._placement === value) return

		this._placement = value
		this._update()
		this.events.emit('change:placement', value)
	}

	get matchWidth(): boolean {
		return this._matchWidth
	}

	set matchWidth(value: boolean) {
		if (this._matchWidth === value) return

		this._matchWidth = value
		this._update()
		this.events.emit('change:matchWidth', value)
	}

	get flip(): boolean {
		return this._flip
	}

	set flip(value: boolean) {
		if (this._flip === value) return

		this._flip = value
		this._update()
		this.events.emit('change:flip', value)
	}

	get offset(): number {
		return this._offset
	}

	set offset(value: number) {
		if (this._offset === value) return

		this._offset = value
		this._update()
		this.events.emit('change:offset', value)
	}

	override destroy(): void {
		this._unsubscribe()

		this._cancelPanelResume()
		this._panelObserver?.disconnect()
		this._panelObserver = null

		this._frame = null
		this._element = null
		this._anchor = null

		super.destroy()
	}

	/**
	 * Считает координаты и кладёт их во Frame.
	 *
	 * При `matchWidth` ширину панели для `x` и shift даёт якорь (см.
	 * `_panelSize`), а не записанный во Frame `width`: до DOM он доедет только
	 * после рендера адаптера.
	 */
	private _update(): void {
		const frame = this._frame
		const anchor = this._anchor

		if (!frame || !anchor || frame.position !== 'fixed') return

		const rect = anchor.getBoundingClientRect()
		const panel = this._panelSize(rect)

		if (this._matchWidth) frame.width = rect.width

		const rtl = getComputedStyle(anchor).direction === 'rtl'
		const alignment = this._placement.endsWith('-end') ? 'end' : 'start'
		const side = this._resolveSide(rect, panel.height)

		frame.x = this._resolveX(rect, panel.width, alignment, rtl)
		frame.y =
			side === 'top' ? rect.top - panel.height - this._offset : rect.bottom + this._offset

		this._applyPlacement(`${side}-${alignment}`)
	}

	/**
	 * Сторона (`top`/`bottom`) с учётом flip.
	 *
	 * Выбор потребителя в `_placement` не перетирается — flip живёт только
	 * здесь, в вычислении фактической стороны. Переключаемся на
	 * противоположную, только если на выбранной панель не влезает по высоте
	 * окна, а на противоположной места больше; если не влезает нигде, остаёмся
	 * на стороне потребителя. С выключенным `flip` сторона потребителя
	 * отдаётся сразу.
	 */
	private _resolveSide(rect: DOMRect, panelHeight: number): 'top' | 'bottom' {
		const wants = this._placement.startsWith('top-') ? 'top' : 'bottom'

		if (!this._flip) return wants
		const spaceTop = rect.top
		const spaceBottom = window.innerHeight - rect.bottom
		const needed = panelHeight + this._offset
		const spaceWanted = wants === 'top' ? spaceTop : spaceBottom
		const spaceOpposite = wants === 'top' ? spaceBottom : spaceTop

		if (spaceWanted >= needed || spaceOpposite <= spaceWanted) return wants

		return wants === 'top' ? 'bottom' : 'top'
	}

	/**
	 * Левый край панели с учётом выравнивания, RTL и shift.
	 *
	 * В LTR `-start` выравнивает панель по левому краю якоря, `-end` — по
	 * правому; в RTL наоборот. После выравнивания `x` сдвигается внутрь окна
	 * по горизонтали, чтобы панель не вылезала ни слева, ни справа — если
	 * панель шире окна, прижимается к левому краю.
	 */
	private _resolveX(
		rect: DOMRect,
		panelWidth: number,
		alignment: 'start' | 'end',
		rtl: boolean,
	): number {
		const alignRight = rtl ? alignment === 'start' : alignment === 'end'
		const x = alignRight ? rect.right - panelWidth : rect.left
		const maxX = Math.max(0, window.innerWidth - panelWidth)

		return Math.min(Math.max(x, 0), maxX)
	}

	/** Пишет фактическую сторону во Frame, только если она изменилась. */
	private _applyPlacement(placement: TFramePlacement): void {
		if (this._actualPlacement === placement) return

		this._actualPlacement = placement
		this._frame?.dataset.add('placement', placement)
	}

	/**
	 * Размер панели. Нужен для выравнивания по правому краю, для показа
	 * сверху и для shift — везде координата отсчитывается от размера панели,
	 * а не только от якоря.
	 *
	 * Берём `getBoundingClientRect()`, а не `offsetWidth`/`offsetHeight`:
	 * оба нулевые, пока `v-show` держит панель на `display: none`, но
	 * `getBoundingClientRect()` пересчитывается уже на первом кадре после
	 * того, как её сняли — раньше на это полагаться было нельзя, теперь за
	 * этим кадром следит `ResizeObserver`.
	 *
	 * При `matchWidth` ширина берётся из якоря, а не из DOM: во Frame она уже
	 * записана, но узел получит её только после рендера адаптера, а панели ещё
	 * может не быть вовсе. Поэтому список под полем не зависит от того,
	 * отрисовалась ли панель, и с `*-end` не мигает по устаревшей ширине.
	 * Высоту якорь не знает — она всегда из DOM.
	 */
	private _panelSize(anchorRect: DOMRect): { width: number; height: number } {
		const panel = this._element?.getBoundingClientRect()

		return {
			width: this._matchWidth ? anchorRect.width : (panel?.width ?? 0),
			height: panel?.height ?? 0,
		}
	}

	/**
	 * Следит за скроллом предков якоря, ресайзом окна и изменением размера
	 * самого якоря (без скролла — например, у него пропал соседний тег).
	 * Scroll и resize пересчитывают координаты сразу, уведомление наблюдателя
	 * якоря — через `_onAnchorResize`.
	 *
	 * Каждый слушатель снимается по своей ссылке на элемент: одна переменная
	 * цикла, захваченная всеми замыканиями, к моменту очистки была бы уже
	 * `null`, и слушатели остались бы висеть.
	 */
	private _subscribe(): void {
		this._unsubscribe()

		if (!this._anchor) return

		const update = () => this._update()

		for (let el = this._anchor.parentElement; el; el = el.parentElement) {
			const target = el

			target.addEventListener('scroll', update, { passive: true })
			this._cleanups.push(() => target.removeEventListener('scroll', update))
		}

		window.addEventListener('resize', update, { passive: true })
		window.addEventListener('scroll', update, { passive: true })

		this._cleanups.push(() => {
			window.removeEventListener('resize', update)
			window.removeEventListener('scroll', update)
		})

		const anchorObserver = new ResizeObserver(() => this._onAnchorResize())

		anchorObserver.observe(this._anchor, { box: 'border-box' })
		this._cleanups.push(() => anchorObserver.disconnect())
	}

	private _unsubscribe(): void {
		for (const cleanup of this._cleanups) cleanup()

		this._cleanups = []
	}

	/**
	 * Пересчёт по уведомлению наблюдателя якоря — с паузой в наблюдении панели.
	 *
	 * Колбэк `ResizeObserver` выполняется внутри шага наблюдения кадра, и
	 * записанные здесь `x`, `y` и `width` адаптер успевает отрисовать тут же, в
	 * микрозадаче после колбэка. При `matchWidth` от этого в том же шаге
	 * меняется размер панели. Панель телепортирована и в DOM лежит мельче
	 * якоря, а после уведомления якоря браузер в этом шаге доставляет только
	 * уведомления узлов глубже него. Уведомление панели пропускается: на
	 * `window` уходит `error` («ResizeObserver loop completed with undelivered
	 * notifications»), который получают трекеры ошибок у потребителя, а позиция
	 * по новому размеру панели запаздывает на кадр.
	 *
	 * Поэтому наблюдение панели снимается до пересчёта и возвращается следующим
	 * кадром — приём `autoUpdate` из Floating UI. Вернувшееся наблюдение само
	 * присылает текущий размер: если от новой ширины выросла высота (перенос
	 * текста при `top-*`), `y` поправится по нему. Возвращать микрозадачей
	 * нельзя: она попадёт в тот же шаг, и уведомление снова пропустится.
	 *
	 * Пауза только у якоря. Колбэк панели ничего не приостанавливает:
	 * `observe()` сразу присылает уведомление, и пауза на нём зациклилась бы.
	 * Scroll и resize окна, сеттеры и `show` выполняются вне шага наблюдения, им
	 * пауза не нужна.
	 */
	private _onAnchorResize(): void {
		this._pausePanel()
		this._update()
	}

	/**
	 * Снимает наблюдение панели до следующего кадра.
	 *
	 * Возврат один: повторное уведомление до кадра второго не заводит, иначе
	 * отмена застала бы только последний. Отменяют возврат `removed`, новый
	 * `ready` и `destroy` — то, что убирает или меняет саму панель. Снятие якоря
	 * (`removeAnchor`, `_unsubscribe`) его не отменяет: панель осталась, и без
	 * возврата за её размером никто бы не следил.
	 */
	private _pausePanel(): void {
		const observer = this._panelObserver
		const element = this._element

		if (!observer || !element) return

		observer.unobserve(element)

		if (this._panelResumeFrame !== null) return

		this._panelResumeFrame = requestAnimationFrame(() => {
			this._panelResumeFrame = null
			observer.observe(element, { box: 'border-box' })
		})
	}

	/** Отменяет отложенный возврат наблюдения панели. */
	private _cancelPanelResume(): void {
		if (this._panelResumeFrame === null) return

		cancelAnimationFrame(this._panelResumeFrame)
		this._panelResumeFrame = null
	}
}
