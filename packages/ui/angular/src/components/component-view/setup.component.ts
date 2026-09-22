import { createAdapterContext, ComponentViewDescriptor } from '@soldy-ui/setup'
import type { IComponentView } from '@soldy-ui/core'
import { useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupComponentView(
	ctrl: IComponentView | undefined,
	props: object,
): TBinding<IComponentView> {
	const adapter = createAdapterContext(ComponentViewDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
