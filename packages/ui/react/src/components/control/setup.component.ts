/**
 * useSetupControl — setup-слой Control (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context через createAdapterContext(ControlDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 */

import { useRef } from 'react'
import { createAdapterContext, ControlDescriptor } from '@soldy/setup'
import type { IAdapterContext } from '@soldy/setup'
import type { IControl, IControlProps } from '@soldy/core'
import { useAdapter } from '../../adapter'
import { resolveDefaultExtensions } from '../../adapter'
import type { ControlProps } from './base.component'

export function useSetupControl(props: ControlProps) {
	// Создаем адаптер 1 раз за жизненный цикл компонента (аналог setup() во Vue)
	const adapterRef = useRef<IAdapterContext | null>(null)

	if (!adapterRef.current) {
		const descriptor = ControlDescriptor()

		adapterRef.current = createAdapterContext(
			descriptor,
			{ ctrl: props.ctrl, props },
			{ defaultExtensions: resolveDefaultExtensions(descriptor) },
		)
	}

	return useAdapter<IControlProps, IControl>(adapterRef.current, props)
}
