import { SelectGroupDescriptor, TItemGroupExtension } from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	useAdapter,
	useElevator,
	type TRootReceiver,
} from '../../../adapter'
import type { SelectGroupProps } from './base.component'

export function setupSelectGroup(
	getProps: () => SelectGroupProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const adapter = createSvelteAdapterContext(SelectGroupDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	}).use(TItemGroupExtension, { elevator })

	return useAdapter(adapter, getProps, receive)
}
