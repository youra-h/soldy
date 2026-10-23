/**
 * `<div is="so-accordion">` — набор раскрывающихся секций.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию. На корне из наборов
 * ядра только `attrs`, как у Vue и Angular.
 *
 * Контекстов два — свой и фасада коллекции (`setupAccordion`), и пропсы
 * фасада (`items`, `mode`, `engine`, `trackBy`) — атрибуты-входы и свойства
 * того же элемента: дескриптор фасада элемент называет рядом со своим. Движок
 * аккордеона его сборка опускает лифтом своему хосту, и секции находят его
 * вверх по документу.
 *
 * Модуль регистрирует и секцию. Разметку, ожившую при регистрации, база
 * собирает по месту (`deferral.ts`): аккордеон — раньше своих секций, и
 * движок они находят уже опущенным.
 *
 * Разметка вынесена в accordion.template.ts, жизненный цикл — в ElementBase.
 */

import { AccordionCollectionDescriptor, AccordionDescriptor } from '@soldy-ui/setup'
import type { IAccordion, TAccordionCollectionFacade } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { IElementBase, TElementProps } from '../../adapter'
import { accordionTemplate } from './accordion.template'
import { TAccordionItemElement } from './item'
import { setupAccordion } from './setup.component'

export const TAccordionElement = ElementBase(HTMLDivElement, {
	descriptor: AccordionDescriptor(),
	facade: AccordionCollectionDescriptor(),
	template: accordionTemplate,
	root: { strategy: 'host', sets: ['attrs'] },
	setup: setupAccordion,
})

defineElement('so-accordion', TAccordionElement, 'div')
defineElement('so-accordion-item', TAccordionItemElement, 'div')

/**
 * `<div is="so-accordion">` из JS: нативный `div`, своё элемента soldy
 * (`ctrl`, `state` — вместе со свойствами фасада) и свойства пропов
 * дескриптора вместе с пропсами его плагинов и фасада (`items`, `mode`,
 * `engine`) — без тех, что у `div` уже есть, и без `HOST_PROPS`
 * (`TElementProps`).
 */
export type TAccordionElementProps = HTMLDivElement &
	IElementBase<IAccordion, TAccordionCollectionFacade> &
	TElementProps<typeof AccordionDescriptor, HTMLDivElement>
