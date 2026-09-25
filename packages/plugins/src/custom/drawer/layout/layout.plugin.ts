import { TModalLayoutPlugin } from '../../overlay/modal-layout'
import type { TModalLayoutVariables } from '../../overlay/modal-layout'

/**
 * Раскладка выезжающей панели: слой и размер — в объекты стилей для разметки.
 *
 * Расчёт общий с модальным окном — `TModalLayoutPlugin`: `styles` панели
 * (`z-index` слоя и размер переменными) и `backdropStyles` подложки. Своё у
 * панели — имена переменных, которые читает тема: `--drawer-width` у панели у
 * бокового края и `--drawer-height` у верхнего и нижнего. Край, анимацию и
 * место в контейнере раскладывает тема по модификатору и `data-*`.
 *
 * Сдвига во время жеста здесь нет: его пишет в узел `TDrawerSwipePlugin`, и
 * через обмен на каждом кадре он не ходит.
 */
export class TDrawerLayoutPlugin extends TModalLayoutPlugin {
	protected readonly _variables: TModalLayoutVariables = {
		width: '--drawer-width',
		height: '--drawer-height',
	}
}
