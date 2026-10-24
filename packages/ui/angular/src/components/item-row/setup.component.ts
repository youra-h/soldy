import { ItemRowDescriptor } from '@soldy-ui/setup'
import type { IButton } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupItemRow(ctrl: IButton | undefined, props: object): TBinding<IButton> {
	const adapter = createAngularAdapterContext(ItemRowDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
