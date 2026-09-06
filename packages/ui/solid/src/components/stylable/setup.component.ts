/**
 * setupStylable — setup-слой Stylable.
 *
 * Создаёт adapter-context и связывает его с Solid через useAdapter.
 * Компонент в Solid выполняется один раз, поэтому контекст достаточно
 * положить в обычную константу — useRef-обвязки, как в React, не нужно.
 */

import { createAdapterContext, StylableDescriptor } from '@soldy/setup'
import type { IStylable } from '@soldy/core'
import { useAdapter } from '../../adapter'
import type { StylableProps } from './base.component'

export function setupStylable(props: StylableProps) {
	const adapter = createAdapterContext(StylableDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter<IStylable>(adapter, props)
}
