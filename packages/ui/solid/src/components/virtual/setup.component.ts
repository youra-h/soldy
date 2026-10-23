import { TVirtualExtension, VirtualDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../adapter'
import type { VirtualProps } from './base.component'

/** Узла у обёртки нет: разметке нужны состояние и слой, `ref` не отдаётся. */
export function setupVirtual(props: VirtualProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(VirtualDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TVirtualExtension, { elevator })
	const binding = useAdapter(adapter, props)

	return { ctrl: binding.ctrl, state: binding.state, layer }
}
