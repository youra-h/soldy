/**
 * useSetupComponentView — setup-слой ComponentView (аналог setup.component.ts во Vue).
 */

import { useRef } from 'react'
import { createAdapterContext, ComponentViewDescriptor } from '@soldy/setup'
import type { IAdapterContext } from '@soldy/setup'
import type { IComponentView, IComponentViewProps } from '@soldy/core'
import { useAdapter } from '../../adapter'
import type { ComponentViewProps } from './base.component'

export function useSetupComponentView(props: ComponentViewProps) {
	const adapterRef = useRef<IAdapterContext | null>(null)

	if (!adapterRef.current) {
		adapterRef.current = createAdapterContext(ComponentViewDescriptor(), { ctrl: props.ctrl, props })
	}

	return useAdapter<IComponentViewProps, IComponentView>(adapterRef.current, props)
}
