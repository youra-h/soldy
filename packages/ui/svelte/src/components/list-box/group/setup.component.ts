import { ListBoxGroupDescriptor, TItemGroupExtension } from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	useAdapter,
	useElevator,
	type TRootReceiver,
} from '../../../adapter'
import type { ListBoxGroupProps } from './base.component'

export function setupListBoxGroup(
	getProps: () => ListBoxGroupProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const adapter = createSvelteAdapterContext(ListBoxGroupDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	}).use(TItemGroupExtension, { elevator })

	return useAdapter(adapter, getProps, receive)
}
