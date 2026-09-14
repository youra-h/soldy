/**
 * useSetupButton — setup-слой Button (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context через createAdapterContext(ButtonDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 */

import { useRef } from 'react'
import { createAdapterContext, ButtonDescriptor } from '@soldy/setup'
import type { IAdapterContext } from '@soldy/setup'
import type { IButton } from '@soldy/core'
import { useAdapter } from '../../adapter'
import type { ButtonProps } from './base.component'

export function useSetupButton(props: ButtonProps) {
	// Создаем адаптер 1 раз за жизненный цикл компонента (аналог setup() во Vue)
	const adapterRef = useRef<IAdapterContext<IButton> | null>(null)

	if (!adapterRef.current) {
		adapterRef.current = createAdapterContext(ButtonDescriptor(), { ctrl: props.ctrl, props })
	}

	return useAdapter(adapterRef.current, props)
}
