import { ScrollerDescriptor } from '@soldy-ui/setup'
import type { IScroller } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupScroller(ctrl: IScroller | undefined, props: object): TBinding<IScroller> {
	const adapter = createAngularAdapterContext(ScrollerDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
