/**
 * setupInputControl — setup-слой InputControl.
 *
 * Создаёт adapter-context (`createSvelteAdapterContext`) и связывает его со
 * Svelte через useAdapter. Вызывается один раз при инициализации компонента,
 * поэтому контекст достаточно положить в обычную константу.
 *
 * Принимает геттер, а не сам объект props: в Svelte 5 захват $props() в
 * переменную теряет реактивность, читать его нужно лениво. Id монтирования
 * (`$props.id()`) отдаёт компонент: компилятор пускает его только туда.
 */

import { InputControlDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter } from '../../adapter'
import type { InputControlProps } from './base.component'

export function setupInputControl(getProps: () => InputControlProps, mountId: string) {
	const adapter = createSvelteAdapterContext(InputControlDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	return useAdapter(adapter, getProps)
}
