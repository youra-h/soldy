/**
 * `<div is="so-radio-group">` — группа радио.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию. Все наборы ядра — на
 * корне: `role="radiogroup"` и имя группы — здесь.
 *
 * Контекстов два — свой и фасада коллекции (`setupRadioGroup`), и пропсы
 * фасада (`items`, `engine`, `trackBy`) — атрибуты-входы и свойства того же
 * элемента: дескриптор фасада элемент называет рядом со своим. Движок группы
 * её сборка опускает лифтом своему хосту, и радио находят его вверх по
 * документу.
 *
 * Модуль регистрирует и радио. Разметку, ожившую при регистрации, база
 * собирает по месту (`deferral.ts`): группа — раньше своих радио, и движок они
 * находят уже опущенным.
 *
 * Разметка вынесена в radio-group.template.ts, жизненный цикл — в ElementBase.
 */

import { RadioGroupCollectionDescriptor, RadioGroupDescriptor } from '@soldy-ui/setup'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementType } from '../../adapter'
import { TRadioGroupItemElement } from './item'
import { radioGroupTemplate } from './radio-group.template'
import { setupRadioGroup } from './setup.component'

export const TRadioGroupElement = ElementBase(HTMLDivElement, {
	descriptor: RadioGroupDescriptor,
	facade: RadioGroupCollectionDescriptor,
	template: radioGroupTemplate,
	setup: setupRadioGroup,
})

defineElement('so-radio-group', TRadioGroupElement, 'div')
defineElement('so-radio-group-item', TRadioGroupItemElement, 'label')

/**
 * `<div is="so-radio-group">` из JS: нативный `div`, своё элемента soldy
 * (`ctrl`, `state` — вместе со свойствами фасада) и свойства пропов
 * дескриптора вместе с пропсами его плагинов и фасада (`items`, `engine`) —
 * без тех, что у `div` уже есть, и без `HOST_PROPS` (`TElementProps`).
 */
export type TRadioGroupElementProps = TElementType<typeof TRadioGroupElement>
