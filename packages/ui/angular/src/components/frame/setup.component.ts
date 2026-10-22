import { FrameDescriptor } from '@soldy-ui/setup'
import type { IFrame } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupFrame(ctrl: IFrame | undefined, props: object): TBinding<IFrame> {
	const adapter = createAngularAdapterContext(FrameDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
