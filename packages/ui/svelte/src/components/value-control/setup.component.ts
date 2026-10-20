/**
 * setupValueControl — setup-слой ValueControl.
 *
 * Создаёт adapter-context (`createSvelteAdapterContext`) и связывает его со
 * Svelte через useAdapter. Вызывается один раз при инициализации компонента,
 * поэтому контекст достаточно положить в обычную константу.
 *
 * Принимает геттер, а не сам объект props: в Svelte 5 захват $props() в
 * переменную теряет реактивность, читать его нужно лениво. Id монтирования
 * (`$props.id()`) отдаёт компонент: компилятор пускает его только туда.
 */

import { ValueControlDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter } from '../../adapter'
import type { ValueControlProps } from './base.component'

export function setupValueControl(getProps: () => ValueControlProps, mountId: string) {
	const adapter = createSvelteAdapterContext(ValueControlDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	return useAdapter(adapter, getProps)
}
