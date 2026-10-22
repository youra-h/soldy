/**
 * `<div is="so-select-group">` — опции списка Select под общей подписью, как
 * `Select.Group` у Vue.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `SoldyElement`): тег ядра по умолчанию. Классы и три набора
 * ядра — `role="group"` и `aria-labelledby` на подпись — база раскладывает на
 * него, рядом с атрибутами потребителя. Подпись и её набор рисует шаблон.
 *
 * Регистрирует элемент модуль Select (`Select.element.ts`).
 *
 * Разметка вынесена в select-group.template.ts, жизненный цикл — в
 * SoldyElement.
 */

import { SelectGroupDescriptor } from '@soldy-ui/setup'
import type { IItemGroup } from '@soldy-ui/core'
import { SoldyElement } from '../../../adapter'
import type { ISoldyElement, TSoldyElementProps } from '../../../adapter'
import { selectGroupTemplate } from './select-group.template'
import { setupSelectGroup } from './setup.component'

export const TSelectGroupElement = SoldyElement(HTMLDivElement, {
	descriptor: SelectGroupDescriptor(),
	template: selectGroupTemplate,
	setup: setupSelectGroup,
})

/**
 * `<div is="so-select-group">` из JS: нативный `div`, своё элемента soldy и
 * свойства пропов дескриптора (`label`) — без тех, что у `div` уже есть, и без
 * `HOST_PROPS` (`TSoldyElementProps`).
 */
export type TSelectGroupElementProps = HTMLDivElement &
	ISoldyElement<IItemGroup> &
	TSoldyElementProps<typeof SelectGroupDescriptor, HTMLDivElement>
