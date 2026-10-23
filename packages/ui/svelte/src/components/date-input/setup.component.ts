import { DateInputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	useAdapter,
	useElevator,
	type TRootReceiver,
} from '../../adapter'
import type { DateInputProps } from './base.component'

export function setupDateInput(
	getProps: () => DateInputProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const adapter = createSvelteAdapterContext(DateInputDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	}).use(TFieldControlExtension, { elevator })

	return useAdapter(adapter, getProps, receive)
}
