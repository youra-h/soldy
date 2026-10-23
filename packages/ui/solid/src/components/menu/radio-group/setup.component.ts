import {
	MenuRadioGroupDescriptor,
	TItemGroupExtension,
	TMenuRadioGroupExtension,
} from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../../adapter'
import type { MenuRadioGroupProps } from './base.component'

export function setupMenuRadioGroup(props: MenuRadioGroupProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(MenuRadioGroupDescriptor(), {
		ctrl: props.ctrl,
		props,
	})
		.use(TItemGroupExtension, { elevator })
		.use(TMenuRadioGroupExtension, { elevator })

	return { ...useAdapter(adapter, props), layer }
}
