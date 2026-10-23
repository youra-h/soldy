import { NumberInputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	useAdapter,
	useElevator,
	type TRootReceiver,
} from '../../adapter'
import type { NumberInputProps } from './base.component'

export function setupNumberInput(
	getProps: () => NumberInputProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const adapter = createSvelteAdapterContext(NumberInputDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	}).use(TFieldControlExtension, { elevator })

	return useAdapter(adapter, getProps, receive)
}
