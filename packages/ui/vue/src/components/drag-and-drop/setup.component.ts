import { toRaw } from 'vue'
import { createAdapterContext, TDragAndDropExtension, DragAndDropDescriptor } from '@soldy/setup'
import { useVue, VueElevatorFactory } from '../../adapter'
import BaseDragAndDrop from './base.component'
import type { TBaseComponentProps } from '../../types'
import { type IDragAndDropProps } from '@soldy/core'

export default {
	name: '_DragAndDrop',
	extends: BaseDragAndDrop,
	setup(props: TBaseComponentProps<IDragAndDropProps>, { emit }: any) {
		const adapter = createAdapterContext(DragAndDropDescriptor, {
			ctrl: props.ctrl ? toRaw(props.ctrl) : undefined,
			plugins: props.plugins,
			props,
		}).use(TDragAndDropExtension, { elevator: VueElevatorFactory })

		return useVue<IDragAndDropProps>(adapter, props, emit)
	},
}
