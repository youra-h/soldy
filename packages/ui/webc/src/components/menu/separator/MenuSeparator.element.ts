/**
 * `<div is="so-menu-separator">` — разделитель меню, линия между группами
 * пунктов, как `Menu.Separator` у Vue.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию. Классы и наборы ядра
 * — `role="separator"` — база раскладывает на него. Ручной разделитель
 * разметки свойство меню `groupSeparators` не трогает: его поставил
 * потребитель.
 *
 * Разметка вынесена в menu-separator.template.ts, жизненный цикл — в
 * ElementBase.
 */

import { MenuSeparatorDescriptor } from '@soldy-ui/setup'
import type { TMenuSeparator } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { TElementClassOf, TElementType } from '../../../adapter'
import { menuSeparatorTemplate } from './menu-separator.template'
import { setupMenuSeparator } from './setup.component'

export const TMenuSeparatorElement: TElementClassOf<
	typeof HTMLDivElement,
	typeof MenuSeparatorDescriptor,
	TMenuSeparator
> = ElementBase(HTMLDivElement, {
	descriptor: MenuSeparatorDescriptor,
	template: menuSeparatorTemplate,
	setup: setupMenuSeparator,
})

/**
 * `<div is="so-menu-separator">` из JS: нативный `div`, своё элемента soldy и
 * свойства пропов дескриптора — без тех, что у `div` уже есть, и без
 * `HOST_PROPS` (`TElementProps`).
 */
export type TMenuSeparatorElementProps = TElementType<typeof TMenuSeparatorElement>
