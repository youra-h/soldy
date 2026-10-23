/**
 * `<so-drag-and-drop>` — перестановка элементов Tabs, ListBox и Accordion в его
 * свете, события `so:move:before` и `so:move`. Автономный элемент без коробки,
 * как `<so-virtual>`.
 */

import { DragAndDropDescriptor } from '@soldy-ui/setup'
import type { IDragAndDrop } from '@soldy-ui/core'
import { ElementBase } from '../../adapter'
import type { TElementClassOf, TElementType } from '../../adapter'
import { defineAutonomousElement } from '../../adapter/runtime/defineElement'
import { setupDragAndDrop } from './setup.component'
import { dragAndDropTemplate } from './drag-and-drop.template'

export const TDragAndDropElement: TElementClassOf<
	typeof HTMLElement,
	typeof DragAndDropDescriptor,
	IDragAndDrop
> = ElementBase(HTMLElement, {
	descriptor: DragAndDropDescriptor,
	template: dragAndDropTemplate,
	setup: setupDragAndDrop,
})

defineAutonomousElement('so-drag-and-drop', TDragAndDropElement)

export type TDragAndDropElementProps = TElementType<typeof TDragAndDropElement>
