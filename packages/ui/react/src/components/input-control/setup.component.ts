/**
 * useSetupInputControl — setup-слой InputControl (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context сборкой useAdapterContext — create(InputControlDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 */

import { InputControlDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { InputControlProps } from './base.component'

export function useSetupInputControl(props: InputControlProps) {
	const { contexts: adapter } = useAdapterContext((create) =>
		create(InputControlDescriptor(), { ctrl: props.ctrl, props }),
	)

	return useAdapter(adapter, props)
}
