import { createAdapterContext, ButtonDescriptor } from '@soldy-ui/setup'
import type { IButton } from '@soldy-ui/core'
import { useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupButton(ctrl: IButton | undefined, props: object): TBinding<IButton> {
	const adapter = createAdapterContext(ButtonDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
