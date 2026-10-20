/**
 * useSetupInteractive — setup-слой Interactive (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context сборкой useAdapterContext — create(InteractiveDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 */

import { InteractiveDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { InteractiveProps } from './base.component'

export function useSetupInteractive(props: InteractiveProps) {
	const { contexts: adapter } = useAdapterContext((create) =>
		create(InteractiveDescriptor(), { ctrl: props.ctrl, props }),
	)

	return useAdapter(adapter, props)
}
