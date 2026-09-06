/**
 * useSetupTextable — setup-слой Textable (аналог setup.component.ts во Vue).
 */

import { useRef } from 'react'
import { createAdapterContext, TextableDescriptor } from '@soldy/setup'
import type { IAdapterContext } from '@soldy/setup'
import type { ITextable, ITextableProps } from '@soldy/core'
import { useAdapter } from '../../adapter'
import type { TextableProps } from './base.component'

export function useSetupTextable(props: TextableProps) {
	const adapterRef = useRef<IAdapterContext | null>(null)

	if (!adapterRef.current) {
		adapterRef.current = createAdapterContext(TextableDescriptor(), { ctrl: props.ctrl, props })
	}

	return useAdapter<ITextableProps, ITextable>(adapterRef.current, props)
}
