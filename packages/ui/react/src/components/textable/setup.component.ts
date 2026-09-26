/**
 * useSetupTextable — setup-слой Textable (аналог setup.component.ts во Vue).
 */

import { TextableDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { TextableProps } from './base.component'

export function useSetupTextable(props: TextableProps) {
	const adapter = useAdapterContext((create) =>
		create(TextableDescriptor(), { ctrl: props.ctrl, props }),
	)

	return useAdapter(adapter, props)
}
