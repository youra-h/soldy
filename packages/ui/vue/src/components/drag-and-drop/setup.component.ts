import { toRaw } from 'vue'
import { createAdapterContext, TDragAndDropExtension, DragAndDropDescriptor } from '@soldy/setup'
import { useAdapter, VueElevatorFactory } from '../../adapter'
import BaseDragAndDrop from './base.component'
import type { TBaseComponentProps } from '../../types'
import { type IDragAndDropProps } from '@soldy/core'

export default {
	name: '_DragAndDrop',
	extends: BaseDragAndDrop,
	setup(props: TBaseComponentProps<IDragAndDropProps>, { emit }: any) {
		const adapter = createAdapterContext(
			DragAndDropDescriptor(),
			{
				ctrl: toRaw(props.ctrl),
				props,
			},
			{ defaultExtensions: [] },
		).use(TDragAndDropExtension, { elevator: VueElevatorFactory })

		return useAdapter<IDragAndDropProps>(adapter, props, emit)
	},
}
