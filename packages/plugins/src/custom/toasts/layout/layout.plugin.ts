import type { IToasts } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import type { TToastsLayoutPluginEvents } from './types'

/**
 * TToastsLayoutPlugin — раскладка региона тостов: номер слоя в стили.
 *
 * Регион ничего не меряет и координат не считает: место у края окна, отступы
 * и стопку раскладывает тема по модификатору места. Плагину остаётся
 * значение, которое в класс не уложить, — `z-index` слоя: регион поднимается
 * в общем стеке на каждый новый тост и на F8, и номер у него каждый раз новый.
 *
 * Объект стилей заменяется целиком, а не мутируется: геттер отдаёт ссылку
 * наружу, и без смены идентичности адаптер не увидит изменения.
 * `change:styles` — только когда номер сменился.
 */
export class TToastsLayoutPlugin extends TBasePlugin<IToasts, TToastsLayoutPluginEvents> {
	private _styles: Record<string, string | number> = {}

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const owner = ctx.getInstance<IToasts>()

		if (!owner) return

		this._listenTo(owner.events, 'change:zIndex', () => this._update(owner))

		this._update(owner)
	}

	/** Стили региона: `z-index` слоя. */
	get styles(): Record<string, string | number> {
		return this._styles
	}

	private _update(owner: IToasts): void {
		if (this._styles['z-index'] === owner.zIndex) return

		this._styles = { 'z-index': owner.zIndex }
		this.events.emit('change:styles', this._styles)
	}
}
