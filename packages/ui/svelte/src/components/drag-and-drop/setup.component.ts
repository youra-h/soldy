/**
 * setupDragAndDrop — setup-слой DragAndDrop.
 *
 * Контекст обёртки и её проводка (`TDragAndDropExtension`): проводка опускает
 * коллекциям внутри свой экземпляр лифтом (`setContext`). Коллекция,
 * смонтированная внутри, прочтёт его при своей инициализации.
 *
 * `useAdapter` — ради событий перестановки (`onMoveBefore`, `onMove`): узла у
 * обёртки нет, и приёмника корня ей не нужно.
 */

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
