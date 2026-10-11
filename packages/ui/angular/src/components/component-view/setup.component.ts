import { ComponentViewDescriptor } from '@soldy-ui/setup'
import type { IComponentView } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupComponentView(
	ctrl: IComponentView | undefined,
	props: object,
): TBinding<IComponentView> {
	const adapter = createAngularAdapterContext(ComponentViewDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
