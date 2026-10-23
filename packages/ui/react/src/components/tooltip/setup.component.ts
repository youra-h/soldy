import { TooltipDescriptor } from '@soldy-ui/setup'
import { useComponent, useRootElement } from '../../adapter'
import type { TooltipProps } from './base.component'

export function useSetupTooltip(props: TooltipProps) {
	const binding = useComponent(
		(create) => create(TooltipDescriptor(), { ctrl: props.ctrl, props }),
		props,
	)

	return { ...binding, rootElement: useRootElement(binding.root) }
}
