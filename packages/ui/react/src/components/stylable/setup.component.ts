/**
 * useSetupStylable — setup-слой Stylable (аналог setup.component.ts во Vue).
 */

import { useRef } from 'react'
import { createAdapterContext, StylableDescriptor } from '@soldy/setup'
import type { IAdapterContext } from '@soldy/setup'
import type { IStylable, IStylableProps } from '@soldy/core'
import { useAdapter } from '../../adapter'
import type { StylableProps } from './base.component'

export function useSetupStylable(props: StylableProps) {
	const adapterRef = useRef<IAdapterContext | null>(null)

	if (!adapterRef.current) {
		adapterRef.current = createAdapterContext(StylableDescriptor(), { ctrl: props.ctrl, props })
	}

	return useAdapter<IStylableProps, IStylable>(adapterRef.current, props)
}
