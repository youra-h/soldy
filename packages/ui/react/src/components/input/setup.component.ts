/**
 * useSetupInput — setup-слой Input (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context сборкой useAdapterContext — create(InputDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 */

import { InputDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { InputProps } from './base.component'

export function useSetupInput(props: InputProps) {
	const adapter = useAdapterContext((create) =>
		create(InputDescriptor(), { ctrl: props.ctrl, props }),
	)

	return useAdapter(adapter, props)
}
