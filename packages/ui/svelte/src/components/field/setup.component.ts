import { FieldDescriptor, TFieldExtension } from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	useAdapter,
	useElevator,
	type TRootReceiver,
} from '../../adapter'
import type { FieldProps } from './base.component'

export function setupField(getProps: () => FieldProps, mountId: string, receive: TRootReceiver) {
	const elevator = useElevator()
	const adapter = createSvelteAdapterContext(FieldDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	}).use(TFieldExtension, { elevator })

	return useAdapter(adapter, getProps, receive)
}
