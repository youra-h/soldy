import type { TBaseComponentProps } from '../component'
import { TDragAndDrop, type IDragAndDropProps } from '@soldy/core'
import BaseDragAndDrop from './base.component'
import { useInstance } from '../../composables/useInstance'
import { useProvideDragContext } from '../../composables/useDragContext'

export default {
	name: '_DragAndDrop',
	extends: BaseDragAndDrop,
	setup(props: TBaseComponentProps<IDragAndDropProps>) {
		const instance = useInstance(TDragAndDrop, props)

		useProvideDragContext()

		return { ctrl: instance }
	},
}
