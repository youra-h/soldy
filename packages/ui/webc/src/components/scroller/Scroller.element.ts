/**
 * `<div is="so-scroller">` — лента произвольного содержимого в одну строку,
 * которую двигают две кнопки.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию. На корне — все три
 * набора ядра, как у Vue: `attrs` (`dir`), `aria` и `dataset`
 * (`data-can-prev`, `data-can-next`, `data-disabled`). Атрибуты потребителя
 * остаются на корне; роль ряда и всё, что к ней прилагается, вьюпорт получает
 * пропом `viewportAria` — своего экземпляра у вьюпорта нет.
 *
 * Разметка вынесена в scroller.template.ts, жизненный цикл — в ElementBase.
 */

import { ScrollerDescriptor } from '@soldy-ui/setup'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementType } from '../../adapter'
import { scrollerTemplate } from './scroller.template'
import { setupScroller } from './setup.component'

export const TScrollerElement = ElementBase(HTMLDivElement, {
	descriptor: ScrollerDescriptor,
	template: scrollerTemplate,
	setup: setupScroller,
})

defineElement('so-scroller', TScrollerElement, 'div')

/**
 * `<div is="so-scroller">` из JS: нативный `div`, своё элемента soldy
 * (`ctrl`, `state`) и свойства пропов дескриптора вместе с пропсами его
 * плагинов (`aria_label`) — без тех, что у `div` уже есть, и без `HOST_PROPS`
 * (`TElementProps`).
 */
export type TScrollerElementProps = TElementType<typeof TScrollerElement>
