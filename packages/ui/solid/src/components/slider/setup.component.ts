import { SliderDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../adapter'
import type { SliderProps } from './base.component'

export function setupSlider(props: SliderProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(SliderDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TFieldControlExtension, { elevator })

	return { ...useAdapter(adapter, props), layer }
}
