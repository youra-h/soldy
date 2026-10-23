import { ScrollerDescriptor } from '@soldy-ui/setup'
import { useComponent } from '../../adapter'
import type { ScrollerProps } from './base.component'

export function useSetupScroller(props: ScrollerProps) {
	return useComponent(
		(create) => create(ScrollerDescriptor(), { ctrl: props.ctrl, props }),
		props,
	)
}
