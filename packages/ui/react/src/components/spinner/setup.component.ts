/**
 * useSetupSpinner — setup-слой Spinner (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context сборкой useAdapterContext — create(SpinnerDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 */

import { SpinnerDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { SpinnerProps } from './base.component'

export function useSetupSpinner(props: SpinnerProps) {
	const adapter = useAdapterContext((create) =>
		create(SpinnerDescriptor(), { ctrl: props.ctrl, props }),
	)

	// Выход `layout_styles` разметка кладёт в `style` корня
	return useAdapter(adapter, props)
}
