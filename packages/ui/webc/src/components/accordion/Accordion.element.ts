/**
 * `<div is="so-accordion">` — набор раскрывающихся секций.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `SoldyElement`): тег ядра по умолчанию. На корне из наборов
 * ядра только `attrs`, как у Vue и Angular.
 *
 * Контекстов два — свой и фасада коллекции (`setupAccordion`), и пропсы
 * фасада (`items`, `mode`, `engine`, `trackBy`) — атрибуты-входы и свойства
 * того же элемента: дескриптор фасада элемент называет рядом со своим. Движок
 * аккордеона его сборка опускает лифтом своему хосту, и секции находят его
 * вверх по документу.
 *
 * Модуль регистрирует и секцию — после аккордеона: при апгрейде разметки
 * элемент, зарегистрированный раньше, собирается раньше, и аккордеон уже
 * опустил движок, когда собираются его секции.
 *
 * Разметка вынесена в accordion.template.ts, жизненный цикл — в SoldyElement.
 */

import { AccordionCollectionDescriptor, AccordionDescriptor } from '@soldy-ui/setup'
import type { IAccordion, TAccordionCollectionFacade } from '@soldy-ui/core'
import { SoldyElement, defineElement } from '../../adapter'
import type { ISoldyElement, TSoldyElementProps } from '../../adapter'
import { accordionTemplate } from './accordion.template'
import { TAccordionItemElement } from './item'
import { setupAccordion } from './setup.component'

export const TAccordionElement = SoldyElement(HTMLDivElement, {
	descriptor: AccordionDescriptor(),
	facade: AccordionCollectionDescriptor(),
	template: accordionTemplate,
	root: { sets: ['attrs'] },
	setup: setupAccordion,
})

defineElement('so-accordion', TAccordionElement, 'div')
// Части — после владельца (см. шапку)
defineElement('so-accordion-item', TAccordionItemElement, 'div')

/**
 * `<div is="so-accordion">` из JS: нативный `div`, своё элемента soldy
 * (`ctrl`, `state` — вместе со свойствами фасада) и свойства пропов
 * дескриптора вместе с пропсами его плагинов и фасада (`items`, `mode`,
 * `engine`) — без тех, что у `div` уже есть, и без `HOST_PROPS`
 * (`TSoldyElementProps`).
 */
export type TAccordionElementProps = HTMLDivElement &
	ISoldyElement<IAccordion, TAccordionCollectionFacade> &
	TSoldyElementProps<typeof AccordionDescriptor, HTMLDivElement>
