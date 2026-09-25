import type { IDialog } from '@soldy-ui/core'
import type { IPluginContext } from '../../../base'
import { toCssValue } from '../../../utils'
import { TModalLayoutPlugin } from '../../overlay/modal-layout'
import type { TModalLayoutVariables } from '../../overlay/modal-layout'
import { TDialogOffsetEvent } from './offset-event'
import type { TDialogLayoutPluginEvents } from './types'

/** Сторона отступа → переменная, которую читает CSS блока `s-dialog`. */
const OFFSET_VARIABLES = [
	['top', '--dialog-offset-top'],
	['bottom', '--dialog-offset-bottom'],
	['start', '--dialog-offset-start'],
	['end', '--dialog-offset-end'],
] as const

/**
 * Раскладка модального окна: слой, размер и отступ от краёв экрана — в
 * объекты стилей для разметки.
 *
 * Расчёт общий с выезжающей панелью — `TModalLayoutPlugin`: `styles` панели
 * (`z-index` слоя и размер переменными) и `backdropStyles` подложки. Своё у
 * окна — имена переменных, которые читает тема (`--dialog-width`,
 * `--dialog-height`), и отступ: по стороне на переменную
 * (`--dialog-offset-top`, `-bottom`, `-start`, `-end`). Место и разворот
 * раскладывает тема по модификатору и `data-maximized`.
 *
 * **Отступ** — проп окна `offset`, один на все стороны. Стороны по
 * отдельности правит подписчик `offset:before` (`TDialogOffsetEvent`):
 * событие приходит на каждый пересчёт стилей — установку, объявление
 * плагина (`created()`), показ, смену размера, отступа и места. Сторона без
 * значения переменной не даёт — тогда отступ темы; отменённое событие не даёт
 * ни одной.
 *
 * @example
 * // dialog.width = 480 → styles: { 'z-index': 1001, '--dialog-width': '480px' }
 * // dialog.offset = 24 → и '--dialog-offset-top': '24px' — так на все стороны
 */
export class TDialogLayoutPlugin extends TModalLayoutPlugin<TDialogLayoutPluginEvents> {
	protected readonly _variables: TModalLayoutVariables = {
		width: '--dialog-width',
		height: '--dialog-height',
	}

	private _dialog: IDialog | null = null

	override install(ctx: IPluginContext): void {
		// Окно — раньше установки базы: стили она считает уже при установке, и
		// отступ входит в них с первого расчёта
		this._dialog = ctx.getInstance<IDialog>()

		super.install(ctx)

		const updateStyles = () => this._updateStyles()

		this._listenTo(this._dialog?.events, 'change:offset', updateStyles)
		// Место приходит в событии: по нему подписчик решает, какую сторону править
		this._listenTo(this._dialog?.events, 'change:placement', updateStyles)
	}

	/**
	 * Объявить плагин и пересчитать стили. Подписчики `offset:before` к этому
	 * моменту уже есть: `bundle:create` и `layout:create` прошли, адаптер
	 * слушает события с монтирования. Пересчёт — до первого кадра, поэтому
	 * поправку получает и окно, созданное видимым: показа, который пересчитал
	 * бы стили, у него не будет.
	 */
	override created(): void {
		super.created()

		this._updateStyles()
	}

	override destroy(): void {
		this._dialog = null

		super.destroy()
	}

	/** Отступ по сторонам — после поправки подписчиков `offset:before`. */
	protected override _panelVariables(): Record<string, string> {
		const dialog = this._dialog

		if (!dialog) return {}

		const event = new TDialogOffsetEvent(dialog.placement, dialog.offset)

		this.events.emit('offset:before', event)

		if (event.defaultPrevented) return {}

		const variables: Record<string, string> = {}

		for (const [side, variable] of OFFSET_VARIABLES) {
			const value = event[side]

			if (value !== undefined) variables[variable] = toCssValue(value)
		}

		return variables
	}
}
