import { COMPONENT_SIZES } from '../types'
import type { TComponentSize } from '../types'

/**
 * Сдвигает размер на `delta` шагов по шкале.
 * `+1` — увеличение, `-1` — уменьшение.
 * Не выходит за границы шкалы.
 *
 * Шкала берётся из `COMPONENT_SIZES` — того же массива, из которого выведен
 * `TComponentSize`. Раньше здесь лежала своя копия (`SIZE_SCALE`), и добавить
 * размер значило не забыть про оба списка.
 *
 * @example shiftSize('normal', -1) // 'sm'
 * @example shiftSize('2xl', 1)    // '2xl' (потолок)
 */
export function shiftSize(size: TComponentSize, delta: number): TComponentSize {
	const idx = COMPONENT_SIZES.indexOf(size)

	return COMPONENT_SIZES[idx + delta] ?? size
}
