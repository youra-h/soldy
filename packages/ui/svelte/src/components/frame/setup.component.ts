/**
 * setupFrame — setup-слой Frame.
 *
 * Создаёт adapter-context (`createSvelteAdapterContext`) и связывает его со
 * Svelte через useAdapter. Вызывается один раз при инициализации компонента,
 * поэтому контекст достаточно положить в обычную константу.
 *
 * Принимает геттер, а не сам объект props: в Svelte 5 захват $props() в
 * переменную теряет реактивность, читать его нужно лениво. Id монтирования
 * (`$props.id()`) отдаёт компонент: компилятор пускает его только туда.
 */

import { FrameDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter } from '../../adapter'
import type { FrameProps } from './base.component'

export function setupFrame(getProps: () => FrameProps, mountId: string) {
	const adapter = createSvelteAdapterContext(FrameDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	// Выход `layout_styles` разметка кладёт в стиль корня
	return useAdapter(adapter, getProps)
}
