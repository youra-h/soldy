import { DragAndDropDescriptor, TDragAndDropExtension } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../adapter'
import type { DragAndDropProps } from './base.component'

/** Узла у обёртки нет: `useAdapter` — ради событий перестановки, `ref` не отдаётся. */
export function setupDragAndDrop(props: DragAndDropProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(DragAndDropDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TDragAndDropExtension, { elevator })
	const binding = useAdapter(adapter, props)

	return { ctrl: binding.ctrl, state: binding.state, layer }
}
