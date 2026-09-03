/**
 * useSetupTextable — setup-слой Textable (аналог setup.component.ts во Vue).
 */

import { useRef } from 'react'
import { createAdapterContext, TextableDescriptor } from '@soldy/setup'
import type { IAdapterContext } from '@soldy/setup'
import type { ITextable, ITextableProps } from '@soldy/core'
import { useReact } from '../../adapter'
import { resolveDefaultExtensions } from '../../adapter'
import type { TextableProps } from './base.component'

export function useSetupTextable(props: TextableProps) {
	const adapterRef = useRef<IAdapterContext | null>(null)

	if (!adapterRef.current) {
		const descriptor = TextableDescriptor()

		adapterRef.current = createAdapterContext(
			descriptor,
			{ ctrl: props.ctrl, props },
			{ defaultExtensions: resolveDefaultExtensions(descriptor) },
		)
	}

	return useReact<ITextableProps, ITextable>(adapterRef.current, props)
}
