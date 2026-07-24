import { useAdapter, VueElevator, DRAG_CONTEXT_ELEVATOR } from '../../adapter'
import { DragAndDropDescriptor } from '@soldy/setup'
import BaseDragAndDrop from './base.component'
import type { TBaseComponentProps } from '../../types'
import { type IDragAndDropProps } from '@soldy/core'

export default {
	name: '_DragAndDrop',
	extends: BaseDragAndDrop,
	setup(props: TBaseComponentProps<IDragAndDropProps>, { emit }: any) {
		const dragElevator = new VueElevator<boolean>(DRAG_CONTEXT_ELEVATOR)

		return useAdapter(DragAndDropDescriptor, props, emit, {
			elevators: { drag: dragElevator },
		})
	},
}
