/**
 * setupProgressSpinner — setup-слой ProgressSpinner.
 *
 * Создаёт adapter-context (`createSvelteAdapterContext`) и связывает его со
 * Svelte через useAdapter. Вызывается один раз при инициализации компонента,
 * поэтому контекст достаточно положить в обычную константу.
 *
 * Принимает геттер, а не сам объект props: в Svelte 5 захват $props() в
 * переменную теряет реактивность, читать его нужно лениво. Id монтирования
 * (`$props.id()`) отдаёт компонент: компилятор пускает его только туда.
 */

import { ProgressSpinnerDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter } from '../../adapter'
import type { ProgressSpinnerProps } from './base.component'

export function setupProgressSpinner(getProps: () => ProgressSpinnerProps, mountId: string) {
	const adapter = createSvelteAdapterContext(ProgressSpinnerDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	// Логики здесь нет: долю, `aria-value*` и `data-indeterminate` считает ядро,
	// рисунок и бег — тема. Выход `fractionStyle` разметка кладёт в стиль корня
	return useAdapter(adapter, getProps)
}
