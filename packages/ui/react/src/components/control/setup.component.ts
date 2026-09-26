/**
 * useSetupControl — setup-слой Control (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context сборкой useAdapterContext — create(ControlDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 */

import { ControlDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { ControlProps } from './base.component'

export function useSetupControl(props: ControlProps) {
	// Создаем адаптер 1 раз за жизненный цикл компонента (аналог setup() во Vue)
	const adapter = useAdapterContext((create) =>
		create(ControlDescriptor(), { ctrl: props.ctrl, props }),
	)

	return useAdapter(adapter, props)
}
