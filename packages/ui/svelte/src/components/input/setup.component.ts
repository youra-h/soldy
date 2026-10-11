/**
 * setupInput — setup-слой Input.
 *
 * Создаёт adapter-context (`createSvelteAdapterContext`) и связывает его со
 * Svelte через useAdapter. Вызывается один раз при инициализации компонента,
 * поэтому контекст достаточно положить в обычную константу.
 *
 * Принимает геттер, а не сам объект props: в Svelte 5 захват $props() в
 * переменную теряет реактивность, читать его нужно лениво. Id монтирования
 * (`$props.id()`) отдаёт компонент: компилятор пускает его только туда.
 */

import { InputDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter } from '../../adapter'
import type { InputProps } from './base.component'

export function setupInput(getProps: () => InputProps, mountId: string) {
	const adapter = createSvelteAdapterContext(InputDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	// Текст в ядро несёт плагин ввода по `input` поля, имя кнопки очистки
	// (`clearAria`) пишет плагин имён формы по локали поддерева
	return useAdapter(adapter, getProps)
}
