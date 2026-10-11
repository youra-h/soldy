/**
 * setupCheckBox — setup-слой CheckBox.
 *
 * Создаёт adapter-context (`createSvelteAdapterContext`) и связывает его со
 * Svelte через useAdapter. Вызывается один раз при инициализации компонента,
 * поэтому контекст достаточно положить в обычную константу.
 *
 * Принимает геттер, а не сам объект props: в Svelte 5 захват $props() в
 * переменную теряет реактивность, читать его нужно лениво. Id монтирования
 * (`$props.id()`) отдаёт компонент: компилятор пускает его только туда.
 */

import { CheckBoxDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter } from '../../adapter'
import type { CheckBoxProps } from './base.component'

export function setupCheckBox(getProps: () => CheckBoxProps, mountId: string) {
	const adapter = createSvelteAdapterContext(CheckBoxDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	// Переключает значение плагин флажка по `change` поля; отметку и «выбрано
	// частично» разметка пишет свойствами `<input>`
	return useAdapter(adapter, getProps)
}
