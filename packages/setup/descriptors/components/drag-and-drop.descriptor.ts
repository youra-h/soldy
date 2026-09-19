/**
 * Дескриптор DragAndDrop (TDragAndDrop).
 *
 * Наследует ComponentDescriptor (rendered, visible, present).
 * Не добавляет новых props/events — только предоставляет drag-контекст детям.
 */

import { defineComponent, defineDescriptor } from '../../define'
import { TDragAndDrop } from '@soldy/core'
import { ComponentDescriptor } from './component.descriptor'

export const DragAndDropDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TDragAndDrop,

		extends: ComponentDescriptor(),

		contribution: {},
	}),
)
