import { createAdapterContext, ComponentViewDescriptor } from '@soldy/setup'
import type { IComponentView, IComponentViewProps } from '@soldy/core'
import { useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupComponentView(
	ctrl: IComponentView | undefined,
	props: Partial<IComponentViewProps>,
): TBinding<IComponentView> {
	const adapter = createAdapterContext(ComponentViewDescriptor(), { ctrl, props })

	return useAdapter<IComponentView>(adapter)
}
