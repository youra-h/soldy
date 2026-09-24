import { FRAME_LAYER_ATTRIBUTE } from '@soldy-ui/core'
import { layerOf } from './layerOf'

/**
 * Лежит ли узел в слое выше панели — в панели, открытой поверх неё.
 *
 * Слой узла — ближайший предок с `data-layer`, сам узел тоже в счёт: панели
 * лежат в `body` соседями и друг в друга не вложены. Узел без слоя — не выше,
 * и у панели без слоя выше не лежит ничего: сравнивать не с чем.
 *
 * Правило одно на весь слой оверлея. По нему `TDismissPlugin` считает
 * нажатие в список Select, открытый из поповера, нажатием внутри, а
 * `THideOutsidePlugin` оставляет этот список доступным скринридеру, когда
 * прячет фон модального окна. Два правила разошлись бы: панель, в которую
 * можно нажать, оказалась бы немой.
 */
export function isAboveLayer(node: Element, panel: Element | null): boolean {
	const layer = layerOf(node.closest(`[${FRAME_LAYER_ATTRIBUTE}]`))

	if (layer === null) return false

	const own = layerOf(panel)

	return own !== null && layer > own
}
