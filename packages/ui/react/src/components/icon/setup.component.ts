/**
 * useSetupIcon — setup-слой Icon (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context сборкой useAdapterContext — create(IconDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 */

import { IconDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { IconProps } from './base.component'

export function useSetupIcon(props: IconProps) {
	const adapter = useAdapterContext((create) =>
		create(IconDescriptor(), { ctrl: props.ctrl, props }),
	)

	// Выход `layout_styles` разметка кладёт в `style` корня
	return useAdapter(adapter, props)
}
