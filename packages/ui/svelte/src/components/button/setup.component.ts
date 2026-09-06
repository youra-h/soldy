/**
 * setupButton — setup-слой Button.
 *
 * Создаёт adapter-context и связывает его со Svelte через useAdapter.
 * Вызывается один раз при инициализации компонента, поэтому контекст
 * достаточно положить в обычную константу.
 *
 * Принимает геттер, а не сам объект props: в Svelte 5 захват $props() в
 * переменную теряет реактивность, читать его нужно лениво.
 */

import { createAdapterContext, ButtonDescriptor } from '@soldy/setup'
import type { IButton } from '@soldy/core'
import { useAdapter } from '../../adapter'
import type { ButtonProps } from './base.component'

export function setupButton(getProps: () => ButtonProps) {
	const adapter = createAdapterContext(ButtonDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
	})

	return useAdapter<IButton>(adapter, getProps)
}
