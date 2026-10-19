/**
 * setupVirtual — setup-слой Virtual.
 *
 * Контекст обёртки и её проводка (`TVirtualExtension`): проводка опускает
 * коллекциям внутри подключение к окну в слой лифта обёртки (`useElevator`),
 * детям его отдаёт `Elevate` в разметке. Коллекция, собранная внутри, прочтёт
 * подключение при своей сборке.
 *
 * `useAdapter` — ради входа `enabled` и событий: узла у обёртки нет, и `ref`
 * разметке не нужен.
 */

import { TVirtualExtension, VirtualDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../adapter'
import type { VirtualProps } from './base.component'

export function setupVirtual(props: VirtualProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(VirtualDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TVirtualExtension, { elevator })
	const binding = useAdapter(adapter, props)

	return { ctrl: binding.ctrl, plugins: binding.plugins, state: binding.state, layer }
}
