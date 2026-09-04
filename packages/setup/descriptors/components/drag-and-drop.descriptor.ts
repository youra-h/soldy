/**
 * Дескриптор DragAndDrop (TDragAndDrop).
 *
 * Наследует ComponentDescriptor (rendered, visible, present).
 * Не добавляет новых props/events — только предоставляет drag-контекст детям.
 */

import { defineComponent } from '../base'
import { TDragAndDrop } from '@soldy/core'
import type { IDragAndDropProps, TDragAndDropEvents } from '@soldy/core'
import { DragAndDropContribution } from '../../contributions'
import { ComponentDescriptor } from './component.descriptor'

export const DragAndDropDescriptor = () =>
	defineComponent<IDragAndDropProps, TDragAndDropEvents>()({
		ctor: TDragAndDrop,

		extends: ComponentDescriptor(),

		contribution: DragAndDropContribution(),
	})
