/**
 * setupButton — setup-слой Button.
 *
 * Создаёт adapter-context и связывает его с Solid через useAdapter.
 * Компонент в Solid выполняется один раз, поэтому контекст достаточно
 * положить в обычную константу — useRef-обвязки, как в React, не нужно.
 */

import { createAdapterContext, ButtonDescriptor } from '@soldy/setup'
import type { IButton } from '@soldy/core'
import { useAdapter } from '../../adapter'
import type { ButtonProps } from './base.component'

export function setupButton(props: ButtonProps) {
	const adapter = createAdapterContext(ButtonDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter<IButton>(adapter, props)
}
