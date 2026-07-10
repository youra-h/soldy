import type { SetupContext } from 'vue'
import { TDragAndDrop, type IDragAndDropProps } from '@soldy/core'
import BaseDragAndDrop from './base.component'
import { useInstance } from '../../composables/useInstance'
import { useProvideDragContext } from '../../composables/useDragContext'
import type { TBaseComponentProps } from '../component'

export default {
	name: '_DragAndDrop',
	extends: BaseDragAndDrop,
	setup(props: TBaseComponentProps<IDragAndDropProps>, { emit }: SetupContext) {
		const instance = useInstance(TDragAndDrop, props)

		useProvideDragContext()

		return { ctrl: instance }
	},
}
