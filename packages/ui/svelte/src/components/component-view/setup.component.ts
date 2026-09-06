/**
 * setupComponentView — setup-слой ComponentView.
 *
 * Создаёт adapter-context и связывает его со Svelte через useAdapter.
 * Вызывается один раз при инициализации компонента, поэтому контекст
 * достаточно положить в обычную константу.
 *
 * Принимает геттер, а не сам объект props: в Svelte 5 захват $props() в
 * переменную теряет реактивность, читать его нужно лениво.
 */

import { createAdapterContext, ComponentViewDescriptor } from '@soldy/setup'
import type { IComponentView } from '@soldy/core'
import { useAdapter } from '../../adapter'
import type { ComponentViewProps } from './base.component'

export function setupComponentView(getProps: () => ComponentViewProps) {
	const adapter = createAdapterContext(ComponentViewDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
	})

	return useAdapter<IComponentView>(adapter, getProps)
}
