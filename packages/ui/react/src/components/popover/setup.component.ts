import { PopoverDescriptor } from '@soldy-ui/setup'
import { useComponent, useRootElement } from '../../adapter'
import type { PopoverProps } from './base.component'

export function useSetupPopover(props: PopoverProps) {
	const binding = useComponent(
		(create) => create(PopoverDescriptor(), { ctrl: props.ctrl, props }),
		props,
	)

	return { ...binding, rootElement: useRootElement(binding.root) }
}
