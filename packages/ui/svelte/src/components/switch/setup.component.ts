/**
 * setupSwitch — setup-слой Switch.
 *
 * Создаёт adapter-context (`createSvelteAdapterContext`) и связывает его со
 * Svelte через useAdapter. Вызывается один раз при инициализации компонента,
 * поэтому контекст достаточно положить в обычную константу.
 *
 * Принимает геттер, а не сам объект props: в Svelte 5 захват $props() в
 * переменную теряет реактивность, читать его нужно лениво. Id монтирования
 * (`$props.id()`) отдаёт компонент: компилятор пускает его только туда.
 */

import { SwitchDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter } from '../../adapter'
import type { SwitchProps } from './base.component'

export function setupSwitch(getProps: () => SwitchProps, mountId: string) {
	const adapter = createSvelteAdapterContext(SwitchDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	// Переключает значение плагин по `change` поля; отметку разметка пишет
	// свойством `<input>`
	return useAdapter(adapter, getProps)
}
