/**
 * `<div is="so-menu-separator">` — разделитель меню, линия между группами
 * пунктов, как `Menu.Separator` у Vue.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `SoldyElement`): тег ядра по умолчанию. Классы и наборы ядра
 * — `role="separator"` — база раскладывает на него. Ручной разделитель
 * разметки свойство меню `groupSeparators` не трогает: его поставил
 * потребитель.
 *
 * Разметка вынесена в menu-separator.template.ts, жизненный цикл — в
 * SoldyElement.
 */

import { MenuSeparatorDescriptor } from '@soldy-ui/setup'
import type { TMenuSeparator } from '@soldy-ui/core'
import { SoldyElement } from '../../../adapter'
import type { ISoldyElement, TSoldyElementProps } from '../../../adapter'
import { menuSeparatorTemplate } from './menu-separator.template'
import { setupMenuSeparator } from './setup.component'

export const TMenuSeparatorElement = SoldyElement(HTMLDivElement, {
	descriptor: MenuSeparatorDescriptor(),
	template: menuSeparatorTemplate,
	setup: setupMenuSeparator,
})

/**
 * `<div is="so-menu-separator">` из JS: нативный `div`, своё элемента soldy и
 * свойства пропов дескриптора — без тех, что у `div` уже есть, и без
 * `HOST_PROPS` (`TSoldyElementProps`).
 */
export type TMenuSeparatorElementProps = HTMLDivElement &
	ISoldyElement<TMenuSeparator> &
	TSoldyElementProps<typeof MenuSeparatorDescriptor, HTMLDivElement>
