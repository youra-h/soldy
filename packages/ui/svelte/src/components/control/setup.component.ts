/**
 * setupControl — setup-слой Control.
 *
 * Создаёт adapter-context и связывает его со Svelte через useAdapter.
 * Вызывается один раз при инициализации компонента, поэтому контекст
 * достаточно положить в обычную константу.
 *
 * Принимает геттер, а не сам объект props: в Svelte 5 захват $props() в
 * переменную теряет реактивность, читать его нужно лениво.
 */

import { createAdapterContext, ControlDescriptor } from '@soldy/setup'
import type { IControl } from '@soldy/core'
import { useAdapter } from '../../adapter'
import type { ControlProps } from './base.component'

export function setupControl(getProps: () => ControlProps) {
	const adapter = createAdapterContext(ControlDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
	})

	return useAdapter<IControl>(adapter, getProps)
}
