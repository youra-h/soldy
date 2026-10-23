/**
 * `<span is="so-tooltip">` — подсказка у триггера: показывается по наведению
 * и по фокусу с клавиатуры.
 *
 * Элемент — настоящий `<span>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию. Строчный корень —
 * обёртка триггера, якорь панели и цель наведения: подсказка встаёт и в
 * строку текста, и в ряд кнопок. Панель — деталь Frame: в цель её уводит база
 * самого Frame, на месте в корне остаётся якорь-комментарий, поэтому в корне
 * лежит только триггер, и курсор на триггере — курсор на корне.
 *
 * Триггер — элемент потребителя в слоте `trigger`, текст подсказки — слот по
 * умолчанию:
 * `<span is="so-tooltip"><button is="so-button" slot="trigger">Сохранить</button>Сохранить черновик</span>`.
 * Ссылку на панель (`aria-describedby`, при `type="label"` —
 * `aria-labelledby`) триггер получает сам — шаблон кладёт её на первый
 * элемент слота: scope у слотов нет, и привязать её потребитель не может.
 *
 * На корне из наборов ядра — `attrs` и `dataset`: ARIA у панели и у триггера.
 * Классы, наборы и скрытие корня раскладывает база.
 *
 * Разметка вынесена в tooltip.template.ts, жизненный цикл — в ElementBase.
 */

import { TooltipDescriptor } from '@soldy-ui/setup'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementType } from '../../adapter'
import { tooltipTemplate } from './tooltip.template'
import { setupTooltip } from './setup.component'

export const TTooltipElement = ElementBase(HTMLSpanElement, {
	descriptor: TooltipDescriptor,
	template: tooltipTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'] },
	setup: setupTooltip,
})

defineElement('so-tooltip', TTooltipElement, 'span')

/**
 * `<span is="so-tooltip">` из JS: нативный `span`, своё элемента soldy
 * (`ctrl`, `state`) и свойства пропов дескриптора — без тех, что у `span` уже
 * есть, и без `HOST_PROPS` (`TElementProps`).
 */
export type TTooltipElementProps = TElementType<typeof TTooltipElement>
