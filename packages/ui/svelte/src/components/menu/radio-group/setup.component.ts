import {
	MenuRadioGroupDescriptor,
	TItemGroupExtension,
	TMenuRadioGroupExtension,
} from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	useAdapter,
	useElevator,
	type TRootReceiver,
} from '../../../adapter'
import type { MenuRadioGroupProps } from './base.component'

export function setupMenuRadioGroup(
	getProps: () => MenuRadioGroupProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const adapter = createSvelteAdapterContext(MenuRadioGroupDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})
		.use(TItemGroupExtension, { elevator })
		.use(TMenuRadioGroupExtension, { elevator })

	return useAdapter(adapter, getProps, receive)
}
