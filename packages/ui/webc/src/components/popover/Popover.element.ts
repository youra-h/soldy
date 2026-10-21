/**
 * `<span is="so-popover">` — панель с произвольным содержимым у триггера:
 * немодальный диалог.
 *
 * Элемент — настоящий `<span>`, расширенный классом soldy (customized
 * built-in, см. `SoldyElement`): тег ядра по умолчанию. Строчный корень —
 * обёртка триггера и якорь панели: поповер встаёт и в строку текста, и в ряд
 * тегов. Панель — деталь Frame: в цель её уводит база самого Frame, на месте в
 * корне остаётся якорь-комментарий, поэтому в корне лежит только триггер, и
 * прямоугольник корня совпадает с его прямоугольником.
 *
 * Триггер — элемент потребителя в слоте `trigger`:
 * `<span is="so-popover"><button is="so-button" slot="trigger">Ещё</button>…</span>`.
 * Связку с панелью (`aria-haspopup`, `aria-expanded`, `aria-controls`) и вид
 * «нажат» (`data-selected`) он получает сам — шаблон кладёт их на первый
 * элемент слота: scope у слотов нет, и привязать их потребитель не может.
 *
 * На корне из наборов ядра — `attrs` и `dataset` (`data-open`): ARIA у панели
 * и у триггера. Классы, наборы и скрытие корня раскладывает база.
 *
 * Разметка вынесена в popover.template.ts, жизненный цикл — в SoldyElement.
 */

import { PopoverDescriptor } from '@soldy-ui/setup'
import type { IPopover } from '@soldy-ui/core'
import { SoldyElement, defineElement } from '../../adapter'
import type { ISoldyElement, TSoldyElementProps } from '../../adapter'
import { popoverTemplate } from './popover.template'
import { setupPopover } from './setup.component'

export const TPopoverElement = SoldyElement(HTMLSpanElement, {
	descriptor: PopoverDescriptor(),
	template: popoverTemplate,
	root: { sets: ['attrs', 'dataset'] },
	setup: setupPopover,
})

defineElement('so-popover', TPopoverElement, 'span')

/**
 * `<span is="so-popover">` из JS: нативный `span`, своё элемента soldy
 * (`ctrl`, `state`) и свойства пропов дескриптора вместе с пропсами его
 * плагинов (`aria_label`) — без тех, что у `span` уже есть, и без
 * `HOST_PROPS` (`TSoldyElementProps`).
 */
export type TPopoverElementProps = HTMLSpanElement &
	ISoldyElement<IPopover> &
	TSoldyElementProps<typeof PopoverDescriptor, HTMLSpanElement>
