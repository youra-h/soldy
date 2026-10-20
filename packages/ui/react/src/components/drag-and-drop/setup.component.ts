/**
 * useSetupDragAndDrop — setup-слой DragAndDrop (аналог setup.component.ts во Vue).
 *
 * Сборка — `useAdapterContext`: контекст обёртки и её проводка
 * (`TDragAndDropExtension`), которая опускает коллекциям внутри свой
 * экземпляр лифтом компонента. Детям слой лифта (`layer`) отдаёт `Elevate` в
 * разметке.
 *
 * `useAdapter` — ради событий перестановки (`onMoveBefore`, `onMove`): узла у
 * обёртки нет, и `ref` разметке не нужен.
 */

import { DragAndDropDescriptor, TDragAndDropExtension } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { DragAndDropProps } from './base.component'

export function useSetupDragAndDrop(props: DragAndDropProps) {
	const { contexts: adapter, layer } = useAdapterContext((create, elevator) =>
		create(DragAndDropDescriptor(), { ctrl: props.ctrl, props }).use(TDragAndDropExtension, {
			elevator,
		}),
	)

	return { ...useAdapter(adapter, props), layer }
}
