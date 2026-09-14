/**
 * useSetupTextable — setup-слой Textable (аналог setup.component.ts во Vue).
 */

import { createAdapterContext, TextableDescriptor } from '@soldy/setup'
import type { ITextable } from '@soldy/core'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { TextableProps } from './base.component'

export function useSetupTextable(props: TextableProps) {
	const adapter = useAdapterContext<ITextable>(() =>
		createAdapterContext(TextableDescriptor(), { ctrl: props.ctrl, props }),
	)

	return useAdapter(adapter, props)
}
