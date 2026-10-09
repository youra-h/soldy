/**
 * useSetupVirtual — setup-слой Virtual (аналог setup.component.ts во Vue).
 *
 * Сборка — `useAdapterContext`: контекст обёртки и её проводка
 * (`TVirtualExtension`), которая опускает коллекциям внутри подключение к окну
 * лифтом компонента. Детям слой лифта (`layer`) отдаёт `Elevate` в разметке.
 *
 * `useAdapter` — ради входа `enabled` и событий: узла у обёртки нет, и `ref`
 * разметке не нужен.
 */

import { TVirtualExtension, VirtualDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { VirtualProps } from './base.component'

export function useSetupVirtual(props: VirtualProps) {
	const { contexts: adapter, layer } = useAdapterContext((create, elevator) =>
		create(VirtualDescriptor(), { ctrl: props.ctrl, props }).use(TVirtualExtension, {
			elevator,
		}),
	)

	return { ...useAdapter(adapter, props), layer }
}
