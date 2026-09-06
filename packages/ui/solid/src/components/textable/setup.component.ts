/**
 * setupTextable — setup-слой Textable.
 *
 * Создаёт adapter-context и связывает его с Solid через useAdapter.
 * Компонент в Solid выполняется один раз, поэтому контекст достаточно
 * положить в обычную константу — useRef-обвязки, как в React, не нужно.
 */

import { createAdapterContext, TextableDescriptor } from '@soldy/setup'
import type { ITextable } from '@soldy/core'
import { useAdapter } from '../../adapter'
import type { TextableProps } from './base.component'

export function setupTextable(props: TextableProps) {
	const adapter = createAdapterContext(TextableDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter<ITextable>(adapter, props)
}
