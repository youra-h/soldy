/**
 * setupComponentView — setup-слой ComponentView.
 *
 * Создаёт adapter-context и связывает его с Solid через useAdapter.
 * Компонент в Solid выполняется один раз, поэтому контекст достаточно
 * положить в обычную константу — useRef-обвязки, как в React, не нужно.
 */

import { createAdapterContext, ComponentViewDescriptor } from '@soldy/setup'
import type { IComponentView } from '@soldy/core'
import { useAdapter } from '../../adapter'
import type { ComponentViewProps } from './base.component'

export function setupComponentView(props: ComponentViewProps) {
	const adapter = createAdapterContext(ComponentViewDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter<IComponentView>(adapter, props)
}
