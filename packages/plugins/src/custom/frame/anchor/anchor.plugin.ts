import type { IFrame } from '@soldy/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import type { IAnchorPluginOptions, TAnchorPluginEvents, TFramePlacement } from './types'

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
 * Работает только при `position: 'fixed'`: координаты берутся из
 * `getBoundingClientRect()`, то есть относительно окна, а при `absolute`
 * отсчёт шёл бы от позиционированного предка.
 */
export class TAnchorPlugin extends TBasePlugin<any, TAnchorPluginEvents> {
	private _frame: IFrame | null = null
	private _element: HTMLElement | null = null
	private _anchor: HTMLElement | null = null
	private _placement: TFramePlacement = 'bottom-start'
	private _matchWidth = false
	private _offset = 0
	private _cleanups: Array<() => void> = []

	override install(ctx: IPluginContext, options?: IAnchorPluginOptions): void {
		super.install(ctx, options)

		this._placement = options?.placement ?? this._placement
		this._matchWidth = options?.matchWidth ?? this._matchWidth
		this._offset = options?.offset ?? this._offset
		this._frame = ctx.getInstance<IFrame>() ?? null

		// Размер панели нужен только для `*-end` и `top-*` без matchWidth
		ctx.get(TElementPlugin)?.events.on('ready', (element) => {
			this._element = element
			this._update()
		})

		ctx.get(TElementPlugin)?.events.on('removed', () => {
			this._element = null
		})

		// Панель могла открыться после того, как якорь уже назначен
		this._frame?.events.on('show', () => this._update())
	}

	setAnchor(element: HTMLElement): void {
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
		this.events.emit('change:anchor', null)
	}

	get anchor(): HTMLElement | null {
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

		this._frame = null
		this._element = null
		this._anchor = null

		super.destroy()
	}

	/**
	 * Считает координаты и кладёт их во Frame.
	 *
	 * `matchWidth` ставится до координат: при `*-end` левый край считается от
	 * правого края якоря минус ширина панели, а её только что задали.
	 */
	private _update(): void {
		const frame = this._frame
		const anchor = this._anchor

		if (!frame || !anchor || frame.position !== 'fixed') return

		const rect = anchor.getBoundingClientRect()

		if (this._matchWidth) frame.width = rect.width

		frame.x = this._placement.endsWith('-end')
			? rect.right - this._panelSize().width
			: rect.left

		frame.y = this._placement.startsWith('top-')
			? rect.top - this._panelSize().height - this._offset
			: rect.bottom + this._offset
	}

	/**
	 * Размер панели. Нужен только для выравнивания по правому краю и для
	 * показа сверху — там координата отсчитывается от дальнего края.
	 *
	 * При `matchWidth` ширина уже известна из якоря, поэтому самый частый
	 * случай (список под полем) не зависит от того, отрисовалась ли панель.
	 */
	private _panelSize(): { width: number; height: number } {
		if (!this._element) return { width: 0, height: 0 }

		return { width: this._element.offsetWidth, height: this._element.offsetHeight }
	}

	/**
	 * Следит за скроллом предков якоря и за ресайзом окна.
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
	}

	private _unsubscribe(): void {
		for (const cleanup of this._cleanups) cleanup()

		this._cleanups = []
	}
}
