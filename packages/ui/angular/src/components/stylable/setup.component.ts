import { StylableDescriptor } from '@soldy-ui/setup'
import type { IStylable } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupStylable(ctrl: IStylable | undefined, props: object): TBinding<IStylable> {
	const adapter = createAngularAdapterContext(StylableDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
