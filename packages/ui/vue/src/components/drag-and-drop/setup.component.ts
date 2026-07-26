import { toRaw } from 'vue'
import { createAdapterContext, DragAndDropDescriptor, DRAG_CONTEXT_ELEVATOR } from '@soldy/setup'
import { useVue, VueElevator } from '../../adapter'
import BaseDragAndDrop from './base.component'
import type { TBaseComponentProps } from '../../types'
import { type IDragAndDropProps } from '@soldy/core'

export default {
	name: '_DragAndDrop',
	extends: BaseDragAndDrop,
	setup(props: TBaseComponentProps<IDragAndDropProps>, { emit }: any) {
		const dragElevator = new VueElevator<boolean>(DRAG_CONTEXT_ELEVATOR)

		// Опускаем флаг drag-контекста вниз — withCollection
		// в дочерней коллекции поймает его через dragElevator.up()
		dragElevator.down(true)

		const adapter = createAdapterContext(DragAndDropDescriptor, {
			ctrl: props.ctrl ? toRaw(props.ctrl) : undefined,
			plugins: props.plugins,
			props,
		})

		return useVue(adapter, props, emit)
	},
}
