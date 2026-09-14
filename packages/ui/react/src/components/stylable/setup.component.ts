/**
 * useSetupStylable — setup-слой Stylable (аналог setup.component.ts во Vue).
 */

import { createAdapterContext, StylableDescriptor } from '@soldy/setup'
import type { IStylable } from '@soldy/core'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { StylableProps } from './base.component'

export function useSetupStylable(props: StylableProps) {
	const adapter = useAdapterContext<IStylable>(() =>
		createAdapterContext(StylableDescriptor(), { ctrl: props.ctrl, props }),
	)

	return useAdapter(adapter, props)
}
