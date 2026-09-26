/**
 * useSetupButton — setup-слой Button (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context сборкой useAdapterContext — create(ButtonDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 */

import { ButtonDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { ButtonProps } from './base.component'

export function useSetupButton(props: ButtonProps) {
	// Создаем адаптер 1 раз за жизненный цикл компонента (аналог setup() во Vue)
	const adapter = useAdapterContext((create) =>
		create(ButtonDescriptor(), { ctrl: props.ctrl, props }),
	)

	return useAdapter(adapter, props)
}
