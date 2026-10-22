import { DrawerDescriptor } from '@soldy-ui/setup'
import type { IDrawer } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupDrawer(ctrl: IDrawer | undefined, props: object): TBinding<IDrawer> {
	const adapter = createAngularAdapterContext(DrawerDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
