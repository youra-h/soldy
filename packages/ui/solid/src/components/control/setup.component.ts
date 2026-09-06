/**
 * setupControl — setup-слой Control.
 *
 * Создаёт adapter-context и связывает его с Solid через useAdapter.
 * Компонент в Solid выполняется один раз, поэтому контекст достаточно
 * положить в обычную константу — useRef-обвязки, как в React, не нужно.
 */

import { createAdapterContext, ControlDescriptor } from '@soldy/setup'
import type { IControl } from '@soldy/core'
import { useAdapter } from '../../adapter'
import type { ControlProps } from './base.component'

export function setupControl(props: ControlProps) {
	const adapter = createAdapterContext(ControlDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter<IControl>(adapter, props)
}
