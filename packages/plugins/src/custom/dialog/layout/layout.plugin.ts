import { TModalLayoutPlugin } from '../../overlay/modal-layout'
import type { TModalLayoutVariables } from '../../overlay/modal-layout'

/**
 * Раскладка модального окна: слой и размер — в объекты стилей для разметки.
 *
 * Расчёт общий с выезжающей панелью — `TModalLayoutPlugin`: `styles` панели
 * (`z-index` слоя и размер переменными) и `backdropStyles` подложки. Своё у
 * окна — имена переменных, которые читает тема: `--dialog-width` и
 * `--dialog-height`. Место и разворот раскладывает тема по модификатору и
 * `data-maximized`.
 *
 * @example
 * // dialog.width = 480 → styles: { 'z-index': 1001, '--dialog-width': '480px' }
 */
export class TDialogLayoutPlugin extends TModalLayoutPlugin {
	protected readonly _variables: TModalLayoutVariables = {
		width: '--dialog-width',
		height: '--dialog-height',
	}
}
