import { IconDescriptor } from '@soldy-ui/setup'
import type { IIcon } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupIcon(ctrl: IIcon | undefined, props: object): TBinding<IIcon> {
	const adapter = createAngularAdapterContext(IconDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
