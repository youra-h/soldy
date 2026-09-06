import { createAdapterContext, ButtonDescriptor } from '@soldy/setup'
import type { IButton, IButtonProps } from '@soldy/core'
import { useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupButton(
	ctrl: IButton | undefined,
	props: Partial<IButtonProps>,
): TBinding<IButton> {
	const adapter = createAdapterContext(ButtonDescriptor(), { ctrl, props })

	return useAdapter<IButton>(adapter)
}
