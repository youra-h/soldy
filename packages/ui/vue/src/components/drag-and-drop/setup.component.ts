import { useAdapter, VueElevator } from '../../adapter'
import { DragAndDropDescriptor, DRAG_CONTEXT_ELEVATOR } from '@soldy/setup'
import BaseDragAndDrop from './base.component'
import type { TBaseComponentProps } from '../../types'
import { type IDragAndDropProps } from '@soldy/core'

export default {
	name: '_DragAndDrop',
	extends: BaseDragAndDrop,
	setup(props: TBaseComponentProps<IDragAndDropProps>, { emit }: any) {
		const dragElevator = new VueElevator<boolean>(DRAG_CONTEXT_ELEVATOR)

		// Опускаем флаг drag-контекста вниз — createCollectionAdapter
		// в дочерней коллекции поймает его через dragElevator.up()
		dragElevator.down(true)

		return useAdapter(DragAndDropDescriptor, props, emit)
	},
}
