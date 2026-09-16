import { createAdapterContext, TextableDescriptor } from '@soldy/setup'
import type { ITextable } from '@soldy/core'
import { useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupTextable(ctrl: ITextable | undefined, props: object): TBinding<ITextable> {
	const adapter = createAdapterContext(TextableDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
