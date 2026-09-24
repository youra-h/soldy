/**
 * useSetupLabel — setup-слой Label (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context через createAdapterContext(LabelDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 */

import { createAdapterContext, LabelDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { LabelProps } from './base.component'

export function useSetupLabel(props: LabelProps) {
	const adapter = useAdapterContext(() =>
		createAdapterContext(LabelDescriptor(), { ctrl: props.ctrl, props }),
	)

	return useAdapter(adapter, props)
}
