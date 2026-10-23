import { RatingDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	useAdapter,
	useElevator,
	type TRootReceiver,
} from '../../adapter'
import type { RatingProps } from './base.component'

export function setupRating(getProps: () => RatingProps, mountId: string, receive: TRootReceiver) {
	const elevator = useElevator()
	const adapter = createSvelteAdapterContext(RatingDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	}).use(TFieldControlExtension, { elevator })

	return useAdapter(adapter, getProps, receive)
}
