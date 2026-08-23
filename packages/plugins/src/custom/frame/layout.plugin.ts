import type { IFrame } from '@soldy/core'
import { TBasePlugin } from '../../base'
import type { IPluginContext } from '../../base'
import { toCssValue } from '../../utils/toCssValue'
import type { TFrameLayoutPluginEvents } from './types'
import { TEvented } from '@soldy/core'

/**
 * Плагин для управления CSS-стилями Frame (позиционирование + z-index + anchor).
 *
 * Подписывается на события TFrame (change:x, change:y, change:width, change:height, change:zIndex, change:position)
 * и вычисляет объект стилей для применения к DOM-элементу.
 *
 * При установке anchor-элемента через {@link setAnchor} координаты x/y
 * становятся отступом относительно anchor. При скролле/ресайзе позиция
 * пересчитывается через getBoundingClientRect.
 *
 * @example
 * const bundle = createFrameBundle()
 * const stylePlugin = bundle.get(TFrameLayoutPlugin)!
 * stylePlugin.setAnchor(someButton)
 * // stylePlugin.styles → { position: 'fixed', left: '100px', top: '200px', zIndex: 1001 }
 */
export class TFrameLayoutPlugin extends TBasePlugin<any, TFrameLayoutPluginEvents> {
	private _styles: Record<string, string | number> = {}
	private _frame: IFrame | null = null
	private _anchor: HTMLElement | null = null
	private _anchorOffsets: { x: number; y: number } = { x: 0, y: 0 }
	private _scrollCleanups: Array<() => void> = []

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const frame = ctx.getInstance<IFrame>()

		if (frame) {
			this._frame = frame
			this._bindFrame(frame)
		}
	}

	setAnchor(element: HTMLElement): void {
		this._anchor = element
		this._anchorOffsets = { x: this._frame?.x ?? 0, y: this._frame?.y ?? 0 }
		this._subscribeScroll()
		this._update()
		;(this.events as TEvented<TFrameLayoutPluginEvents>).emit('change:anchor', element)
	}

	removeAnchor(): void {
		this._anchor = null
		this._unsubscribeScroll()
		this._update()
		;(this.events as TEvented<TFrameLayoutPluginEvents>).emit('change:anchor', null)
	}

	get anchor(): HTMLElement | null {
		return this._anchor
	}

	get styles(): Record<string, string | number> {
		return this._styles
	}

	private _bindFrame(frame: IFrame): void {
		const update = () => this._update()
		;(frame as any).events.on('change:x', update)
		;(frame as any).events.on('change:y', update)
		;(frame as any).events.on('change:width', update)
		;(frame as any).events.on('change:height', update)
		;(frame as any).events.on('change:zIndex', update)
		;(frame as any).events.on('change:position', update)

		this._update()
	}

	private _update(): void {
		if (!this._frame) return

		const styles: Record<string, string | number> = {}
		styles['position'] = this._frame.position

		let left = this._frame.x
		let top = this._frame.y

		if (this._anchor && this._frame.position === 'fixed') {
			const rect = this._anchor.getBoundingClientRect()
			left = rect.left + this._anchorOffsets.x
			top = rect.top + this._anchorOffsets.y
		}

		styles['left'] = toCssValue(left)
		styles['top'] = toCssValue(top)

		if (this._frame.width !== undefined) styles['width'] = toCssValue(this._frame.width)
		if (this._frame.height !== undefined) styles['height'] = toCssValue(this._frame.height)
		styles['z-index'] = this._frame.zIndex

		this._styles = styles
		;(this.events as any).emit('change:styles', this._styles)
	}

	private _subscribeScroll(): void {
		this._unsubscribeScroll()
		if (!this._anchor) return

		let el: HTMLElement | null = this._anchor.parentElement
		while (el) {
			const handler = () => this._update()
			el.addEventListener('scroll', handler, { passive: true })
			this._scrollCleanups.push(() => el?.removeEventListener('scroll', handler))
			el = el.parentElement
		}

		const resizeHandler = () => this._update()
		window.addEventListener('resize', resizeHandler, { passive: true })
		this._scrollCleanups.push(() => window.removeEventListener('resize', resizeHandler))
	}

	private _unsubscribeScroll(): void {
		for (const cleanup of this._scrollCleanups) cleanup()
		this._scrollCleanups = []
	}
}
