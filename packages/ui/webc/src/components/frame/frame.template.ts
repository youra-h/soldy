/**
 * Шаблон Frame.
 *
 * Структуры нет: содержимое панели — слот `default` — остаётся прямо в корне,
 * в самом `<div is="so-frame">`, и уезжает в цель вместе с ним. Классы, наборы
 * `aria`, `attrs` и `dataset` (номер слоя `data-layer`, открытость
 * `data-open`, `data-contained`), раскладку и скрытие раскладывает на корень
 * база (`SoldyElement`), и в цель корень уводит она же — по описанию корня
 * элемента (`teleport`).
 */

import type { IFrame } from '@soldy-ui/core'
import type { ITemplate } from '../../adapter'

export const frameTemplate: ITemplate<IFrame> = {
	create: (root) => ({ slots: { default: { mode: 'append', node: root } } }),

	bindings: [],
}
