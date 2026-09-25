/**
 * useSetupSwitch — setup-слой Switch (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context через createAdapterContext(SwitchDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 */

import { createAdapterContext, SwitchDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { SwitchProps } from './base.component'

export function useSetupSwitch(props: SwitchProps) {
	const adapter = useAdapterContext(() =>
		createAdapterContext(SwitchDescriptor(), { ctrl: props.ctrl, props }),
	)

	return useAdapter(adapter, props)
}
