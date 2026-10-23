import { RatingDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../adapter'
import type { RatingProps } from './base.component'

export function setupRating(props: RatingProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(RatingDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TFieldControlExtension, { elevator })

	return { ...useAdapter(adapter, props), layer }
}
