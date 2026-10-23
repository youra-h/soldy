import { SwitchDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	useAdapter,
	useElevator,
	type TRootReceiver,
} from '../../adapter'
import type { SwitchProps } from './base.component'

export function setupSwitch(getProps: () => SwitchProps, mountId: string, receive: TRootReceiver) {
	const elevator = useElevator()
	const adapter = createSvelteAdapterContext(SwitchDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	}).use(TFieldControlExtension, { elevator })

	return useAdapter(adapter, getProps, receive)
}
