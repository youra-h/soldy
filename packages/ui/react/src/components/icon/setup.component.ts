/**
 * useSetupIcon — setup-слой Icon (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context через createAdapterContext(IconDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 */

import { createAdapterContext, IconDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { IconProps } from './base.component'

export function useSetupIcon(props: IconProps) {
	const adapter = useAdapterContext(() =>
		createAdapterContext(IconDescriptor(), { ctrl: props.ctrl, props }),
	)

	// Выход `layout_styles` разметка кладёт в `style` корня
	return useAdapter(adapter, props)
}
