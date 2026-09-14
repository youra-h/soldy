import { TDragAndDropExtension, DragAndDropDescriptor } from '@soldy/setup'
import {
	useAdapter,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
import BaseDragAndDrop, { type DragAndDropProps } from './base.component'
import { type IDragAndDropProps } from '@soldy/core'

export default {
	name: '_DragAndDrop',
	extends: BaseDragAndDrop,
	setup(props: DragAndDropProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(DragAndDropDescriptor(), {
			ctrl: props.ctrl,
			props,
		}).use(TDragAndDropExtension, { elevator: VueElevatorFactory })

		return useAdapter<IDragAndDropProps>(adapter, props, emit)
	},
}
