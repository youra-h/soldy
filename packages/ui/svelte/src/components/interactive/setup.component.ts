/**
 * setupInteractive — setup-слой Interactive.
 *
 * Создаёт adapter-context (`createSvelteAdapterContext`) и связывает его со
 * Svelte через useAdapter. Вызывается один раз при инициализации компонента,
 * поэтому контекст достаточно положить в обычную константу.
 *
 * Принимает геттер, а не сам объект props: в Svelte 5 захват $props() в
 * переменную теряет реактивность, читать его нужно лениво. Id монтирования
 * (`$props.id()`) отдаёт компонент: компилятор пускает его только туда.
 */

import { InteractiveDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter } from '../../adapter'
import type { InteractiveProps } from './base.component'

export function setupInteractive(getProps: () => InteractiveProps, mountId: string) {
	const adapter = createSvelteAdapterContext(InteractiveDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	return useAdapter(adapter, getProps)
}
