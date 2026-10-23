/**
 * `<div is="so-frame">` — слой поверх страницы: панель, которая уходит в цель
 * `target` (по умолчанию `body`), из-под `overflow` и контекстов наложения
 * предков.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию. Обёртки нет: в цель
 * уезжает сам элемент потребителя, как у Angular, — класс, атрибуты и
 * слушатели потребителя остаются на панели без проброса. Переносит его база
 * по описанию корня (`teleport`): цель и «на месте» она читает из выходов
 * `target` и `contained`, а на месте оставляет якорь-комментарий. Содержимое
 * элемента — слот `default` — едет вместе с ним и остаётся в контексте места:
 * кнопка в панели видит локаль провайдера вокруг Frame. Перенос связку не
 * пересобирает — ни у Frame, ни у элементов в панели.
 *
 * Показанный Frame получает номер слоя: он же `z-index` раскладки и
 * `data-layer` набора `dataset`, по нему плагины оверлея узнают вложенность.
 * Классы, наборы, раскладку (`position`, координаты, `z-index`) и скрытие
 * раскладывает на элемент база; без цели корень стоит на месте скрытым.
 * `contained` оставляет панель на месте: она встаёт в ближайшем
 * позиционированном предке.
 *
 * Разметка вынесена в frame.template.ts, жизненный цикл и перенос — в
 * ElementBase.
 */

import { FrameDescriptor } from '@soldy-ui/setup'
import type { IFrame } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { IElementBase, TElementProps } from '../../adapter'
import { frameTemplate } from './frame.template'
import { setupFrame } from './setup.component'

export const TFrameElement = ElementBase(HTMLDivElement, {
	descriptor: FrameDescriptor(),
	template: frameTemplate,
	root: { teleport: { target: 'target', contained: 'contained' } },
	setup: setupFrame,
})

defineElement('so-frame', TFrameElement, 'div')

/**
 * `<div is="so-frame">` из JS: нативный `div`, своё элемента soldy (`ctrl`,
 * `state`) и свойства пропов дескриптора вместе с пропсами его плагинов —
 * якоря (`anchor_anchor`) и имени (`aria_label`), — без тех, что у `div` уже
 * есть, и без `HOST_PROPS` (`TElementProps`).
 */
export type TFrameElementProps = HTMLDivElement &
	IElementBase<IFrame> &
	TElementProps<typeof FrameDescriptor, HTMLDivElement>
