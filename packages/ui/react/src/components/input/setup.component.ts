/**
 * useSetupInput — setup-слой Input (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context через createAdapterContext(InputDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 */

import { createAdapterContext, InputDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { InputProps } from './base.component'

export function useSetupInput(props: InputProps) {
	const adapter = useAdapterContext(() =>
		createAdapterContext(InputDescriptor(), { ctrl: props.ctrl, props }),
	)

	return useAdapter(adapter, props)
}
