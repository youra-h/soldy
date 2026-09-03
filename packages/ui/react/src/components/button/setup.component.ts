/**
 * useSetupButton — setup-слой Button (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context через createAdapterContext(ButtonDescriptor(), ...)
 * и связывает его с React Runtime через useReact.
 */

import { useRef } from 'react'
import { createAdapterContext, ButtonDescriptor } from '@soldy/setup'
import type { IAdapterContext } from '@soldy/setup'
import type { IButton, IButtonProps } from '@soldy/core'
import { useReact } from '../../adapter'
import { resolveDefaultExtensions } from '../../adapter'
import type { ButtonProps } from './base.component'

export function useSetupButton(props: ButtonProps) {
	// Создаем адаптер 1 раз за жизненный цикл компонента (аналог setup() во Vue)
	const adapterRef = useRef<IAdapterContext | null>(null)

	if (!adapterRef.current) {
		const descriptor = ButtonDescriptor()

		adapterRef.current = createAdapterContext(
			descriptor,
			{ ctrl: props.ctrl, props },
			{ defaultExtensions: resolveDefaultExtensions(descriptor) },
		)
	}

	return useReact<IButtonProps, IButton>(adapterRef.current, props)
}
