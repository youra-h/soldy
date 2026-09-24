/**
 * useSetupFrame — setup-слой Frame (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context через createAdapterContext(FrameDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 */

import { createAdapterContext, FrameDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { FrameProps } from './base.component'

export function useSetupFrame(props: FrameProps) {
	const adapter = useAdapterContext(() =>
		createAdapterContext(FrameDescriptor(), { ctrl: props.ctrl, props }),
	)

	// Выход `layout_styles` разметка кладёт в `style` корня
	return useAdapter(adapter, props)
}
