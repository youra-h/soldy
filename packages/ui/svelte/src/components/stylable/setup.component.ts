/**
 * setupStylable — setup-слой Stylable.
 *
 * Создаёт adapter-context и связывает его со Svelte через useAdapter.
 * Вызывается один раз при инициализации компонента, поэтому контекст
 * достаточно положить в обычную константу.
 *
 * Принимает геттер, а не сам объект props: в Svelte 5 захват $props() в
 * переменную теряет реактивность, читать его нужно лениво.
 */

import { createAdapterContext, StylableDescriptor } from '@soldy/setup'
import type { IStylable } from '@soldy/core'
import { useAdapter } from '../../adapter'
import type { StylableProps } from './base.component'

export function setupStylable(getProps: () => StylableProps) {
	const adapter = createAdapterContext(StylableDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
	})

	return useAdapter<IStylable>(adapter, getProps)
}
