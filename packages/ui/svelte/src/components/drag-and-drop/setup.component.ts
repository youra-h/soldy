import { DragAndDropDescriptor, TDragAndDropExtension } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter, useElevator } from '../../adapter'
import type { DragAndDropProps } from './base.component'

export function setupDragAndDrop(getProps: () => DragAndDropProps, mountId: string) {
	const elevator = useElevator()
	const adapter = createSvelteAdapterContext(DragAndDropDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	}).use(TDragAndDropExtension, { elevator })

	return useAdapter(adapter, getProps)
}
