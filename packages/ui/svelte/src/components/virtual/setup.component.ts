/**
 * setupVirtual — setup-слой Virtual.
 *
 * Контекст обёртки и её проводка (`TVirtualExtension`): проводка опускает
 * коллекциям внутри подключение к окну лифтом (`setContext`). Коллекция,
 * смонтированная внутри, прочтёт его при своей инициализации.
 *
 * `useAdapter` — ради входа `enabled` и событий: узла у обёртки нет, и
 * приёмника корня ей не нужно.
 */

import { TVirtualExtension, VirtualDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter, useElevator } from '../../adapter'
import type { VirtualProps } from './base.component'

export function setupVirtual(getProps: () => VirtualProps, mountId: string) {
	const elevator = useElevator()
	const adapter = createSvelteAdapterContext(VirtualDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	}).use(TVirtualExtension, { elevator })

	return useAdapter(adapter, getProps)
}
