/**
 * useSetupValueControl — setup-слой ValueControl (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context сборкой useAdapterContext — create(ValueControlDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 */

import { ValueControlDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { ValueControlProps } from './base.component'

export function useSetupValueControl(props: ValueControlProps) {
	const { contexts: adapter } = useAdapterContext((create) =>
		create(ValueControlDescriptor(), { ctrl: props.ctrl, props }),
	)

	return useAdapter(adapter, props)
}
