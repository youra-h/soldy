/**
 * useSetupComponentView — setup-слой ComponentView (аналог setup.component.ts во Vue).
 */

import { useRef } from 'react'
import { createAdapterContext, ComponentViewDescriptor } from '@soldy/setup'
import type { IAdapterContext } from '@soldy/setup'
import type { IComponentView, IComponentViewProps } from '@soldy/core'
import { useAdapter } from '../../adapter'
import { resolveDefaultExtensions } from '../../adapter'
import type { ComponentViewProps } from './base.component'

export function useSetupComponentView(props: ComponentViewProps) {
	const adapterRef = useRef<IAdapterContext | null>(null)

	if (!adapterRef.current) {
		const descriptor = ComponentViewDescriptor()

		adapterRef.current = createAdapterContext(
			descriptor,
			{ ctrl: props.ctrl, props },
			{ defaultExtensions: resolveDefaultExtensions(descriptor) },
		)
	}

	return useAdapter<IComponentViewProps, IComponentView>(adapterRef.current, props)
}
