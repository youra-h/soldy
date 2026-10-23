import { DragAndDropDescriptor, TDragAndDropExtension } from '@soldy-ui/setup'
import type { IDragAndDrop } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

/** Экземпляр опускается лифтом хоста; коллекции в свете находят его вверх по документу. */
export function setupDragAndDrop(
	host: HTMLElement,
	ctrl: IDragAndDrop | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IDragAndDrop> {
	const adapter = createWebcAdapterContext(host, DragAndDropDescriptor(), { ctrl, props }).use(
		TDragAndDropExtension,
		{ elevator: createWebcElevator(host) },
	)

	return useAdapter(adapter, host, onUpdate)
}
