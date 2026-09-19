/**
 * useSetupButton — setup-слой Button (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context через createAdapterContext(ButtonDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 */

import { createAdapterContext, ButtonDescriptor } from '@soldy/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { ButtonProps } from './base.component'

export function useSetupButton(props: ButtonProps) {
	// Создаем адаптер 1 раз за жизненный цикл компонента (аналог setup() во Vue)
	const adapter = useAdapterContext(() =>
		createAdapterContext(ButtonDescriptor(), { ctrl: props.ctrl, props }),
	)

	return useAdapter(adapter, props)
}
