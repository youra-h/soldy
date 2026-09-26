/**
 * useSetupStylable — setup-слой Stylable (аналог setup.component.ts во Vue).
 */

import { StylableDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { StylableProps } from './base.component'

export function useSetupStylable(props: StylableProps) {
	const adapter = useAdapterContext((create) =>
		create(StylableDescriptor(), { ctrl: props.ctrl, props }),
	)

	return useAdapter(adapter, props)
}
