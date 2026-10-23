/** `<div is="so-component-view">`. docs/architecture.md, Layer 8d, «Light DOM». */

import { ComponentViewDescriptor } from '@soldy-ui/setup'
import type { IComponentView } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementClassOf, TElementType } from '../../adapter'
import { componentViewTemplate } from './component-view.template'
import { setupComponentView } from './setup.component'

export const TComponentViewElement: TElementClassOf<
	typeof HTMLDivElement,
	typeof ComponentViewDescriptor,
	IComponentView
> = ElementBase(HTMLDivElement, {
	descriptor: ComponentViewDescriptor,
	template: componentViewTemplate,
	setup: setupComponentView,
})

defineElement('so-component-view', TComponentViewElement, 'div')

export type TComponentViewElementProps = TElementType<typeof TComponentViewElement>
