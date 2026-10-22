import { LabelDescriptor } from '@soldy-ui/setup'
import type { ILabel } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupLabel(ctrl: ILabel | undefined, props: object): TBinding<ILabel> {
	const adapter = createAngularAdapterContext(LabelDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
