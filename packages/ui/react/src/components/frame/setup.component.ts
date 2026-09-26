/**
 * useSetupFrame — setup-слой Frame (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context сборкой useAdapterContext — create(FrameDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 */

import { FrameDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { FrameProps } from './base.component'

export function useSetupFrame(props: FrameProps) {
	const adapter = useAdapterContext((create) =>
		create(FrameDescriptor(), { ctrl: props.ctrl, props }),
	)

	// Выход `layout_styles` разметка кладёт в `style` корня
	return useAdapter(adapter, props)
}
