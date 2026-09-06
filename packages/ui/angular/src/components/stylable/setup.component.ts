import { createAdapterContext, StylableDescriptor } from '@soldy/setup'
import type { IStylable, IStylableProps } from '@soldy/core'
import { useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupStylable(
	ctrl: IStylable | undefined,
	props: Partial<IStylableProps>,
): TBinding<IStylable> {
	const adapter = createAdapterContext(StylableDescriptor(), { ctrl, props })

	return useAdapter<IStylable>(adapter)
}
