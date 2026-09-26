/**
 * useSetupSwitch — setup-слой Switch (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context сборкой useAdapterContext — create(SwitchDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 */

import { SwitchDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { SwitchProps } from './base.component'

export function useSetupSwitch(props: SwitchProps) {
	const adapter = useAdapterContext((create) =>
		create(SwitchDescriptor(), { ctrl: props.ctrl, props }),
	)

	return useAdapter(adapter, props)
}
