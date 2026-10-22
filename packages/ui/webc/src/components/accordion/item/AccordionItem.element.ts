/**
 * `<div is="so-accordion-item">` — секция аккордеона: заголовок — Button — и
 * панель под ним.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `SoldyElement`): тег ядра по умолчанию. Корень несёт классы,
 * `attrs`, `dataset` и место в коллекции (`order`): ряд секций — флексбокс, и
 * секция стоит по номеру в коллекции. Заголовок — узел поля корня (`control`):
 * статические атрибуты разметки секции, кроме `class`, `style`, `is`, `slot` и
 * входов пропов, база при построении переносит на него — `id`, `title`,
 * `aria-label`, `data-*` потребителя стоят на заголовке.
 *
 * Пропсы фасада — `selected` — тоже атрибут-вход и свойство элемента:
 * дескриптор фасада элемент называет рядом со своим. Регистрирует элемент
 * модуль аккордеона (`Accordion.element.ts`).
 *
 * Разметка вынесена в accordion-item.template.ts, жизненный цикл — в
 * SoldyElement.
 */

import { AccordionCollectionItemDescriptor, AccordionItemDescriptor } from '@soldy-ui/setup'
import type { IAccordionItem, TAccordionItemCollectionFacade } from '@soldy-ui/core'
import { SoldyElement } from '../../../adapter'
import type { ISoldyElement, TSoldyElementProps } from '../../../adapter'
import { accordionItemTemplate } from './accordion-item.template'
import { setupAccordionItem } from './setup.component'

export const TAccordionItemElement = SoldyElement(HTMLDivElement, {
	descriptor: AccordionItemDescriptor(),
	facade: AccordionCollectionItemDescriptor(),
	template: accordionItemTemplate,
	root: { sets: ['attrs', 'dataset'], order: true, control: true },
	setup: setupAccordionItem,
})

/**
 * `<div is="so-accordion-item">` из JS: нативный `div`, своё элемента soldy
 * (`ctrl`, `state` — вместе со свойствами фасада) и свойства пропов
 * дескриптора вместе с пропсами его плагинов и фасада (`selected`) — без тех,
 * что у `div` уже есть, и без `HOST_PROPS` (`TSoldyElementProps`).
 */
export type TAccordionItemElementProps = HTMLDivElement &
	ISoldyElement<IAccordionItem, TAccordionItemCollectionFacade> &
	TSoldyElementProps<typeof AccordionItemDescriptor, HTMLDivElement>
