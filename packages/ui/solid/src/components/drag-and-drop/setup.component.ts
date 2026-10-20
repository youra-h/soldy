/**
 * setupDragAndDrop — setup-слой DragAndDrop.
 *
 * Контекст обёртки и её проводка (`TDragAndDropExtension`): проводка опускает
 * коллекциям внутри свой экземпляр в слой лифта обёртки (`useElevator`),
 * детям его отдаёт `Elevate` в разметке. Коллекция, собранная внутри, прочтёт
 * экземпляр при своей сборке.
 *
 * `useAdapter` — ради событий перестановки (`onMoveBefore`, `onMove`): узла у
 * обёртки нет, и `ref` разметке не нужен.
 */

import { DragAndDropDescriptor, TDragAndDropExtension } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../adapter'
import type { DragAndDropProps } from './base.component'

export function setupDragAndDrop(props: DragAndDropProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(DragAndDropDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TDragAndDropExtension, { elevator })
	const binding = useAdapter(adapter, props)

	return { ctrl: binding.ctrl, plugins: binding.plugins, state: binding.state, layer }
}
