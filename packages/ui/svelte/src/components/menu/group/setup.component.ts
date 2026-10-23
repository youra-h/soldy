import { MenuGroupDescriptor, TItemGroupExtension } from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	useAdapter,
	useElevator,
	type TRootReceiver,
} from '../../../adapter'
import type { MenuGroupProps } from './base.component'

export function setupMenuGroup(
	getProps: () => MenuGroupProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const adapter = createSvelteAdapterContext(MenuGroupDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	}).use(TItemGroupExtension, { elevator })

	return useAdapter(adapter, getProps, receive)
}
