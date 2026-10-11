import { ButtonDescriptor } from '@soldy-ui/setup'
import type { IButton } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupButton(ctrl: IButton | undefined, props: object): TBinding<IButton> {
	const adapter = createAngularAdapterContext(ButtonDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
