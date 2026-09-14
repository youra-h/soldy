import { createAdapterContext, StylableDescriptor } from '@soldy/setup'
import type { IStylable } from '@soldy/core'
import { useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupStylable(
	ctrl: IStylable | undefined,
	props: object,
): TBinding<IStylable> {
	const adapter = createAdapterContext(StylableDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
