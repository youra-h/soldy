import { CheckBoxDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	useAdapter,
	useElevator,
	type TRootReceiver,
} from '../../adapter'
import type { CheckBoxProps } from './base.component'

export function setupCheckBox(
	getProps: () => CheckBoxProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const adapter = createSvelteAdapterContext(CheckBoxDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	}).use(TFieldControlExtension, { elevator })

	return useAdapter(adapter, getProps, receive)
}
