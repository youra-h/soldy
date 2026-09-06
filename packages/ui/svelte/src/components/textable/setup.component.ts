/**
 * setupTextable — setup-слой Textable.
 *
 * Создаёт adapter-context и связывает его со Svelte через useAdapter.
 * Вызывается один раз при инициализации компонента, поэтому контекст
 * достаточно положить в обычную константу.
 *
 * Принимает геттер, а не сам объект props: в Svelte 5 захват $props() в
 * переменную теряет реактивность, читать его нужно лениво.
 */

import { createAdapterContext, TextableDescriptor } from '@soldy/setup'
import type { ITextable } from '@soldy/core'
import { useAdapter } from '../../adapter'
import type { TextableProps } from './base.component'

export function setupTextable(getProps: () => TextableProps) {
	const adapter = createAdapterContext(TextableDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
	})

	return useAdapter<ITextable>(adapter, getProps)
}
