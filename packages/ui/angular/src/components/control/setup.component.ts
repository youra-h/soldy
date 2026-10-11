import { ControlDescriptor } from '@soldy-ui/setup'
import type { IControl } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupControl(ctrl: IControl | undefined, props: object): TBinding<IControl> {
	const adapter = createAngularAdapterContext(ControlDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
