/**
 * `<div is="so-component-view">` — слой ComponentView.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized built-in,
 * см. `SoldyElement`). Light DOM: классы из ядра — обычные глобальные
 * BEM-классы, тема работает как есть. Содержимое остаётся в элементе, а классы
 * и наборы ядра база раскладывает на него же, рядом с атрибутами потребителя.
 *
 * Разметка вынесена в component-view.template.ts, жизненный цикл — в SoldyElement.
 */

import { ComponentViewDescriptor } from '@soldy-ui/setup'
import type { IComponentView } from '@soldy-ui/core'
import { SoldyElement, defineElement } from '../../adapter'
import type { ISoldyElement, TSoldyElementProps } from '../../adapter'
import { componentViewTemplate } from './component-view.template'
import { setupComponentView } from './setup.component'

export const TComponentViewElement = SoldyElement(HTMLDivElement, {
	descriptor: ComponentViewDescriptor(),
	template: componentViewTemplate,
	setup: setupComponentView,
})

defineElement('so-component-view', TComponentViewElement, 'div')

/**
 * `<div is="so-component-view">` из JS: нативный `div`, своё элемента soldy и
 * свойства пропов дескриптора — без тех, что у `div` уже есть, и без
 * `HOST_PROPS` (`TSoldyElementProps`).
 */
export type TComponentViewElementProps = HTMLDivElement &
	ISoldyElement<IComponentView> &
	TSoldyElementProps<typeof ComponentViewDescriptor, HTMLDivElement>
