import type { IFrame } from '@soldy/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { toCssValue } from '../../../utils/toCssValue'
import type { TFrameLayoutPluginEvents } from './types'
import { TEvented } from '@soldy/core'

/**
 * Раскладка Frame: превращает собственные пропсы в объект стилей.
 *
 * Подписывается на `change:x/y/width/height/zIndex/position` и отдаёт готовый
 * набор, который шаблон вешает на элемент.
 *
 * Про чужие элементы не знает ничего. Привязка к якорю — отдельная
 * ответственность и отдельный плагин `TAnchorPlugin`: он вычисляет координаты
 * и пишет их сюда же, в `x`/`y`/`width`. Здесь остаётся только отрисовка того,
 * что во Frame уже лежит.
 *
 * @example
 * const layout = bundle.get(TFrameLayoutPlugin)!
 * // layout.styles → { position: 'fixed', left: '100px', top: '200px', 'z-index': 1001 }
 */
export class TFrameLayoutPlugin extends TBasePlugin<any, TFrameLayoutPluginEvents> {
	private _styles: Record<string, string | number> = {}
	private _frame: IFrame | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const frame = ctx.getInstance<IFrame>()

		if (frame) {
			this._frame = frame
			this._bindFrame(frame)
		}
	}

	get styles(): Record<string, string | number> {
		return this._styles
	}

	override destroy(): void {
		this._frame = null

		super.destroy()
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

		const frame = this._frame

		const styles: Record<string, string | number> = {
			position: frame.position,
			left: toCssValue(frame.x),
			top: toCssValue(frame.y),
		}

		if (frame.width !== undefined) styles['width'] = toCssValue(frame.width)
		if (frame.height !== undefined) styles['height'] = toCssValue(frame.height)

		styles['z-index'] = frame.zIndex

		this._styles = styles
		;(this.events as TEvented<TFrameLayoutPluginEvents>).emit('change:styles', this._styles)
	}
}
