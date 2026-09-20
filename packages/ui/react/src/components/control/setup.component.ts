/**
 * useSetupControl — setup-слой Control (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context через createAdapterContext(ControlDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 */

import { createAdapterContext, ControlDescriptor } from '@soldy/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { ControlProps } from './base.component'

export function useSetupControl(props: ControlProps) {
	// Создаем адаптер 1 раз за жизненный цикл компонента (аналог setup() во Vue)
	const adapter = useAdapterContext(() =>
		createAdapterContext(ControlDescriptor(), { ctrl: props.ctrl, props }),
	)

	return useAdapter(adapter, props)
}
