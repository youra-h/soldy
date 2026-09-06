import { createAdapterContext, TextableDescriptor } from '@soldy/setup'
import type { ITextable, ITextableProps } from '@soldy/core'
import { useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupTextable(
	ctrl: ITextable | undefined,
	props: Partial<ITextableProps>,
): TBinding<ITextable> {
	const adapter = createAdapterContext(TextableDescriptor(), { ctrl, props })

	return useAdapter<ITextable>(adapter)
}
