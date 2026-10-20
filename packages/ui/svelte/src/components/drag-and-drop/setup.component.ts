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
import { SvelteElevatorFactory, createSvelteAdapterContext, useAdapter } from '../../adapter'
import type { DragAndDropProps } from './base.component'

export function setupDragAndDrop(getProps: () => DragAndDropProps, mountId: string) {
	const adapter = createSvelteAdapterContext(DragAndDropDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	}).use(TDragAndDropExtension, { elevator: SvelteElevatorFactory })

	return useAdapter(adapter, getProps)
}
