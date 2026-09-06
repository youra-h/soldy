import { createAdapterContext, ControlDescriptor } from '@soldy/setup'
import type { IControl, IControlProps } from '@soldy/core'
import { useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupControl(
	ctrl: IControl | undefined,
	props: Partial<IControlProps>,
): TBinding<IControl> {
	const adapter = createAdapterContext(ControlDescriptor(), { ctrl, props })

	return useAdapter<IControl>(adapter)
}
