/**
 * `<div is="so-component-view">` — слой ComponentView.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized built-in,
 * см. `ElementBase`). Light DOM: классы из ядра — обычные глобальные
 * BEM-классы, тема работает как есть. Содержимое остаётся в элементе, а классы
 * и наборы ядра база раскладывает на него же, рядом с атрибутами потребителя.
 *
 * Разметка вынесена в component-view.template.ts, жизненный цикл — в ElementBase.
 */

import { ComponentViewDescriptor } from '@soldy-ui/setup'
import type { IComponentView } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { IElementBase, TElementProps } from '../../adapter'
import { componentViewTemplate } from './component-view.template'
import { setupComponentView } from './setup.component'

export const TComponentViewElement = ElementBase(HTMLDivElement, {
	descriptor: ComponentViewDescriptor(),
	template: componentViewTemplate,
	setup: setupComponentView,
})

defineElement('so-component-view', TComponentViewElement, 'div')

/**
 * `<div is="so-component-view">` из JS: нативный `div`, своё элемента soldy и
 * свойства пропов дескриптора — без тех, что у `div` уже есть, и без
 * `HOST_PROPS` (`TElementProps`).
 */
export type TComponentViewElementProps = HTMLDivElement &
	IElementBase<IComponentView> &
	TElementProps<typeof ComponentViewDescriptor, HTMLDivElement>
